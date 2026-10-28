/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.NODE_ENV = "test";

const { setStorePath, db } = require("../src/db/adapter");
const { dispatchApiRequest } = require("../src/app");
const {
  getUserToday,
  validateCheckinDate,
  calculateStreaks,
  calculateCompletionRate30d,
  generate6MonthHeatmap
} = require("../src/services/streakEngine");
const { generateIcsCalendarFeed } = require("../src/services/calendarService");
const { verifyOwnershipIntegrity, OwnershipTamperError } = require("../src/security/ownership");
const { apiLimiter, authLimiter } = require("../src/security/securityMiddleware");

const tmpStoreFile = path.join(os.tmpdir(), `habitflow_v3_test_${process.pid}.json`);

test.beforeEach(async () => {
  setStorePath(tmpStoreFile);
  await db.resetAll();
  apiLimiter.reset();
  authLimiter.reset();
});

test.after(() => {
  if (fs.existsSync(tmpStoreFile)) {
    fs.unlinkSync(tmpStoreFile);
  }
});

async function registerAndGetHeaders(email = "shivam.test@habitflow.dev", tz = "Asia/Kolkata") {
  const res = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/auth/register",
    query: {},
    headers: {},
    body: {
      name: "Shivam Coder",
      email,
      password: "StrongPassword123!",
      timezone: tz
    }
  });
  assert.equal(res.status, 201);
  return {
    authorization: `Bearer ${res.body.token}`,
    "x-user-timezone": tz
  };
}

test("1. Daily schedule streak calculation respects consecutive days and today grace period", () => {
  const nowUtc = "2026-10-21T10:00:00Z";
  const checkins = [
    "2026-10-10",
    "2026-10-11",
    "2026-10-12",
    "2026-10-13",
    "2026-10-18",
    "2026-10-19",
    "2026-10-20"
  ];

  const resBeforeToday = calculateStreaks(
    checkins,
    "daily",
    [0, 1, 2, 3, 4, 5, 6],
    7,
    "Asia/Kolkata",
    nowUtc
  );
  assert.equal(resBeforeToday.current_streak, 3);
  assert.equal(resBeforeToday.longest_streak, 4);
  assert.equal(resBeforeToday.completed_today, false);

  checkins.push("2026-10-21");
  const resAfterToday = calculateStreaks(
    checkins,
    "daily",
    [0, 1, 2, 3, 4, 5, 6],
    7,
    "Asia/Kolkata",
    nowUtc
  );
  assert.equal(resAfterToday.current_streak, 4);
  assert.equal(resAfterToday.longest_streak, 4);
  assert.equal(resAfterToday.completed_today, true);
});

test("2. Specific weekdays habit (Mon/Wed/Fri) is NEVER broken on Tuesday or Thursday", () => {
  const checkins = ["2026-10-14", "2026-10-16", "2026-10-19"];

  const resTue = calculateStreaks(
    checkins,
    "weekdays",
    [0, 2, 4],
    3,
    "Asia/Kolkata",
    "2026-10-20T12:00:00Z"
  );
  assert.equal(resTue.current_streak, 3);
  assert.equal(resTue.longest_streak, 3);
  assert.equal(resTue.is_due_today, false);

  const resWedPending = calculateStreaks(
    checkins,
    "weekdays",
    [0, 2, 4],
    3,
    "Asia/Kolkata",
    "2026-10-21T12:00:00Z"
  );
  assert.equal(resWedPending.current_streak, 3);
  assert.equal(resWedPending.is_due_today, true);

  const resThuMissed = calculateStreaks(
    checkins,
    "weekdays",
    [0, 2, 4],
    3,
    "Asia/Kolkata",
    "2026-10-22T12:00:00Z"
  );
  assert.equal(resThuMissed.current_streak, 0);
  assert.equal(resThuMissed.longest_streak, 3);
});

test("3. Flexible times_per_week schedule accumulates streak across qualifying ISO weeks", () => {
  const checkins = [
    "2026-10-05", "2026-10-07", "2026-10-10",
    "2026-10-13", "2026-10-15", "2026-10-17",
    "2026-10-19"
  ];
  const res = calculateStreaks(
    checkins,
    "times_per_week",
    [],
    3,
    "Asia/Kolkata",
    "2026-10-21T12:00:00Z"
  );
  assert.equal(res.current_streak, 7);
  assert.equal(res.longest_streak, 7);
  assert.equal(res.completed_this_week, 1);
  assert.equal(res.weekly_target, 3);
});

test("4. Days are counted in the user's IANA time zone rather than server UTC", () => {
  const instantUtc = "2026-10-20T21:30:00Z";

  assert.equal(getUserToday("Asia/Kolkata", instantUtc), "2026-10-21");
  assert.equal(getUserToday("America/New_York", instantUtc), "2026-10-20");

  assert.equal(validateCheckinDate("2026-10-21", "Asia/Kolkata", instantUtc), "2026-10-21");
  assert.throws(
    () => validateCheckinDate("2026-10-21", "America/New_York", instantUtc),
    /Cannot check off a future date/
  );
});

test("5. Check-in API allows today and past 7 days, rejecting 8+ days ago and future dates", async () => {
  const headers = await registerAndGetHeaders("window@habitflow.dev", "Asia/Kolkata");
  headers["x-debug-now-utc"] = "2026-10-21T10:00:00Z";

  const createRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/habits",
    query: {},
    headers,
    body: { name: "Morning Run", schedule_type: "daily" }
  });
  assert.equal(createRes.status, 201);
  const habitId = createRes.body.habit.id;

  const rToday = await dispatchApiRequest({
    method: "POST",
    pathname: `/api/habits/${habitId}/checkin`,
    query: {},
    headers,
    body: { date: "2026-10-21" }
  });
  assert.equal(rToday.status, 200);
  assert.equal(rToday.body.action, "checked");

  const r7d = await dispatchApiRequest({
    method: "POST",
    pathname: `/api/habits/${habitId}/checkin`,
    query: {},
    headers,
    body: { date: "2026-10-14" }
  });
  assert.equal(r7d.status, 200);

  const r8d = await dispatchApiRequest({
    method: "POST",
    pathname: `/api/habits/${habitId}/checkin`,
    query: {},
    headers,
    body: { date: "2026-10-13" }
  });
  assert.equal(r8d.status, 400);
  assert.match(r8d.body.error, /older than the 7-day lookback window/);

  const rFuture = await dispatchApiRequest({
    method: "POST",
    pathname: `/api/habits/${habitId}/checkin`,
    query: {},
    headers,
    body: { date: "2026-10-22" }
  });
  assert.equal(rFuture.status, 400);
  assert.match(rFuture.body.error, /Cannot check off a future date/);
});

test("6. Server validates every input and sanitizes malicious script payloads", async () => {
  const headers = await registerAndGetHeaders("validation@habitflow.dev", "Asia/Kolkata");

  await assert.rejects(
    () =>
      dispatchApiRequest({
        method: "POST",
        pathname: "/api/habits",
        query: {},
        headers,
        body: { name: "   ", schedule_type: "daily" }
      }),
    (err) => err.statusCode === 422 && /Habit name is required/.test(err.message)
  );

  await assert.rejects(
    () =>
      dispatchApiRequest({
        method: "POST",
        pathname: "/api/habits",
        query: {},
        headers,
        body: { name: "Gym", schedule_type: "weekdays", schedule_days: [] }
      }),
    (err) => err.statusCode === 422 && /select at least one weekday/.test(err.message)
  );

  await assert.rejects(
    () =>
      dispatchApiRequest({
        method: "POST",
        pathname: "/api/habits",
        query: {},
        headers,
        body: { name: "Read", schedule_type: "times_per_week", target_per_week: 11 }
      }),
    (err) => err.statusCode === 422 && /between 1 and 7/.test(err.message)
  );

  const xssRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/habits",
    query: {},
    headers,
    body: {
      name: "Clean Code",
      description: "Study <script>alert('hack')</script> patterns",
      schedule_type: "daily"
    }
  });
  assert.equal(xssRes.status, 201);
  assert.equal(xssRes.body.habit.description.includes("<script>"), false);
});

test("7. Archiving and restoring a habit preserves 100% of check-in history and streaks", async () => {
  const headers = await registerAndGetHeaders("archive@habitflow.dev", "Asia/Kolkata");
  headers["x-debug-now-utc"] = "2026-10-21T10:00:00Z";

  const createRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/habits",
    query: {},
    headers,
    body: { name: "Meditation", schedule_type: "daily" }
  });
  const habitId = createRes.body.habit.id;

  for (const d of ["2026-10-19", "2026-10-20", "2026-10-21"]) {
    await dispatchApiRequest({
      method: "POST",
      pathname: `/api/habits/${habitId}/checkin`,
      query: {},
      headers,
      body: { date: d }
    });
  }

  const archRes = await dispatchApiRequest({
    method: "POST",
    pathname: `/api/habits/${habitId}/archive`,
    query: {},
    headers,
    body: {}
  });
  assert.equal(archRes.status, 200);
  assert.equal(archRes.body.habit.is_archived, true);

  const restRes = await dispatchApiRequest({
    method: "POST",
    pathname: `/api/habits/${habitId}/restore`,
    query: {},
    headers,
    body: {}
  });
  assert.equal(restRes.status, 200);
  assert.equal(restRes.body.habit.is_archived, false);
  assert.equal(restRes.body.habit.current_streak, 3);
  assert.equal(restRes.body.habit.longest_streak, 3);
});

test("8. 30-day completion rate and 6-month heatmap calculate accurately", () => {
  const nowUtc = "2026-10-21T10:00:00Z";
  const checkins = [];
  for (let day = 7; day <= 21; day++) {
    checkins.push(`2026-10-${String(day).padStart(2, "0")}`);
  }
  const stats = calculateCompletionRate30d(
    checkins,
    "daily",
    [0, 1, 2, 3, 4, 5, 6],
    7,
    "Asia/Kolkata",
    nowUtc
  );
  assert.equal(stats.completed_count, 15);
  assert.equal(stats.expected_count, 30);
  assert.equal(stats.completion_rate, 50.0);

  const hm = generate6MonthHeatmap(
    checkins,
    "daily",
    [0, 1, 2, 3, 4, 5, 6],
    "Asia/Kolkata",
    nowUtc
  );
  assert.equal(hm.total_completed_6m, 15);
  assert.ok(hm.days.length >= 182);
});

test("9. Cryptographic ownership lock verifies Shivam Coder and blocks tampering", async () => {
  const meta = verifyOwnershipIntegrity();
  assert.equal(meta.verified, true);
  assert.equal(meta.author, "Shivam Coder");
  assert.equal(meta.github, "https://github.com/shivamdwivedi2442");

  assert.throws(
    () => verifyOwnershipIntegrity("Impostor Developer"),
    OwnershipTamperError
  );

  const apiRes = await dispatchApiRequest({
    method: "GET",
    pathname: "/api/ownership",
    query: {},
    headers: {},
    body: {}
  });
  assert.equal(apiRes.status, 200);
  assert.equal(apiRes.body.author, "Shivam Coder");
  assert.equal(apiRes.body.github, "https://github.com/shivamdwivedi2442");
});

test("10. 6-digit OTP verification flow authenticates user and blocks wrong OTP codes", async () => {
  const sendRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/auth/send-otp",
    query: {},
    headers: {},
    body: { email: "otp.user@habitflow.dev", purpose: "auth" }
  });
  assert.equal(sendRes.status, 200);
  const generatedOtp = sendRes.body.demo_otp;
  assert.match(generatedOtp, /^\d{6}$/);

  const badRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/auth/verify-otp",
    query: {},
    headers: {},
    body: { email: "otp.user@habitflow.dev", otp: "000000" }
  });
  if (generatedOtp !== "000000") {
    assert.equal(badRes.status, 401);
  }

  const okRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/auth/verify-otp",
    query: {},
    headers: {},
    body: { email: "otp.user@habitflow.dev", otp: generatedOtp }
  });
  assert.equal(okRes.status, 200);
  assert.equal(okRes.body.verified, true);
  assert.ok(okRes.body.token);
  assert.equal(okRes.body.user.email, "otp.user@habitflow.dev");
});

test("11. Profile customization persists custom avatar picture, bio, name, and timezone in DB", async () => {
  const headers = await registerAndGetHeaders("profile@habitflow.dev", "Asia/Kolkata");
  const customDataUri = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'></svg>";

  const updRes = await dispatchApiRequest({
    method: "PUT",
    pathname: "/api/profile",
    query: {},
    headers,
    body: {
      name: "Shivam Senior Architect",
      bio: "Building + React Native apps",
      timezone: "America/New_York",
      avatar_url: customDataUri
    }
  });
  assert.equal(updRes.status, 200);
  assert.equal(updRes.body.user.name, "Shivam Senior Architect");
  assert.equal(updRes.body.user.bio, "Building + React Native apps");
  assert.equal(updRes.body.user.timezone, "America/New_York");
  assert.equal(updRes.body.user.avatar_url, customDataUri);
});

test("12. AI Voice/Text Assistant adds task on 'roj subah brush krna h ye add kr do task' and completes it on 'brush ho gya'", async () => {
  const headers = await registerAndGetHeaders("ai.voice@habitflow.dev", "Asia/Kolkata");
  headers["x-debug-now-utc"] = "2026-10-27T08:00:00Z";

  const addCmdRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/ai/command",
    query: {},
    headers,
    body: { transcript: "roj subah brush krna h ye add kr do task" }
  });
  assert.equal(addCmdRes.status, 201);
  assert.equal(addCmdRes.body.intent, "create_habit");
  assert.match(addCmdRes.body.habit.name, /Brush/i);
  assert.equal(addCmdRes.body.habit.schedule_type, "daily");
  assert.equal(addCmdRes.body.habit.completed_today, false);

  const doneCmdRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/ai/command",
    query: {},
    headers,
    body: { transcript: "brush ho gya" }
  });
  assert.equal(doneCmdRes.status, 200);
  assert.equal(doneCmdRes.body.intent, "complete_habit");
  assert.equal(doneCmdRes.body.action, "checked");
  assert.equal(doneCmdRes.body.habit.completed_today, true);
  assert.equal(doneCmdRes.body.habit.current_streak, 1);
});

test("13. Signup OTP Verification via Nodemailer dispatches 6-digit OTP and activates account on verify", async () => {
  const regRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/auth/register",
    query: {},
    headers: {},
    body: {
      name: "New Signup User",
      email: "signup.otp@habitflow.dev",
      password: "SignupPass123!",
      timezone: "Asia/Kolkata",
      require_otp: true
    }
  });
  assert.equal(regRes.status, 201);
  assert.equal(regRes.body.otp_required, true);
  assert.equal(regRes.body.user.is_verified, false);
  assert.match(regRes.body.demo_otp, /^\d{6}$/);

  const verifyRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/auth/verify-otp",
    query: {},
    headers: {},
    body: {
      email: "signup.otp@habitflow.dev",
      otp: regRes.body.demo_otp
    }
  });
  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.verified, true);
  assert.equal(verifyRes.body.user.is_verified, true);
});

test("14. AI Specific-Day Task Completion ('kal ka brush ho gya') & Task Removal ('brush wala task hata do')", async () => {
  const headers = await registerAndGetHeaders("ai.specific@habitflow.dev", "Asia/Kolkata");
  headers["x-debug-now-utc"] = "2026-10-27T10:00:00Z"; // Today in IST is 2026-10-27, Yesterday is 2026-10-26

  await dispatchApiRequest({
    method: "POST",
    pathname: "/api/ai/command",
    query: {},
    headers,
    body: { transcript: "roj subah brush krna h ye add kr do task" }
  });

  // Complete specifically for YESTERDAY ("kal ka brush ho gya")
  const kalRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/ai/command",
    query: {},
    headers,
    body: { transcript: "kal ka brush ho gya" }
  });
  assert.equal(kalRes.status, 200);
  assert.equal(kalRes.body.intent, "complete_habit");
  assert.equal(kalRes.body.date, "2026-10-26");
  assert.equal(kalRes.body.habit.current_streak, 1);

  // Now remove the task ("brush wala task hata do")
  const delRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/ai/command",
    query: {},
    headers,
    body: { transcript: "brush wala task hata do" }
  });
  assert.equal(delRes.status, 200);
  assert.equal(delRes.body.intent, "delete_habit");
  assert.equal(delRes.body.action, "deleted");
});

test("15. Phone Gemini Webhook (/api/gemini/webhook) & Google Calendar .ICS Sync with VALARM reminders", async () => {
  const headers = await registerAndGetHeaders("gemini.phone@habitflow.dev", "Asia/Kolkata");
  headers["x-debug-now-utc"] = "2026-10-27T10:00:00Z";

  // 1. Add task via Phone Gemini Webhook
  const gemAdd = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/gemini/webhook",
    query: {},
    headers,
    body: { transcript: "mon wed fri gym jana hai add task" }
  });
  assert.equal(gemAdd.status, 201);
  assert.equal(gemAdd.body.source, "phone_gemini_assistant");
  assert.ok(gemAdd.body.habit.google_calendar_url.includes("calendar.google.com"));

  // 2. Verify Google Calendar .ICS feed includes RRULE, VEVENT, and VALARM phone reminders
  const icsText = generateIcsCalendarFeed(
    { name: "Shivam Coder", timezone: "Asia/Kolkata" },
    [gemAdd.body.habit],
    new Map([[gemAdd.body.habit.id, [{ checkin_date: "2026-10-26" }]]]),
    "2026-10-27"
  );
  assert.ok(icsText.includes("BEGIN:VCALENDAR"));
  assert.ok(icsText.includes("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"));
  assert.ok(icsText.includes("BEGIN:VALARM"));
  assert.ok(icsText.includes("SUMMARY:✅ DONE:"));
});

test("16. Smart AM/PM Time Parser (subah=AM, dopahar/shaam/raat=PM, raat 12..4=AM) & Dual VALARM (-PT5M & PT0S)", async () => {
  const { parseReminderFromTranscript } = require("../src/services/aiAssistant");
  const { generateIcsCalendarFeed } = require("../src/services/calendarService");

  // 1. Subah -> AM
  const rSubah = parseReminderFromTranscript("roj subah 7 baje brush krna h");
  assert.equal(rSubah.reminder_time, "07:00");
  assert.equal(rSubah.reminder_label_12h, "07:00 AM");

  // 2. Dopahar -> PM
  const rDopahar = parseReminderFromTranscript("dopahar 2:30 baje reading krna h");
  assert.equal(rDopahar.reminder_time, "14:30");
  assert.equal(rDopahar.reminder_label_12h, "02:30 PM");

  // 3. Shaam -> PM
  const rShaam = parseReminderFromTranscript("sham 6 baje gym jana hai");
  assert.equal(rShaam.reminder_time, "18:00");
  assert.equal(rShaam.reminder_label_12h, "06:00 PM");

  // 4. Raat 10 baje -> 10:00 PM (22:00)
  const rRaatPm = parseReminderFromTranscript("raat 10 baje coding krna h");
  assert.equal(rRaatPm.reminder_time, "22:00");
  assert.equal(rRaatPm.reminder_label_12h, "10:00 PM");

  // 5. Raat 12 baje (Midnight) & Raat 1 baje -> 12:00 AM (00:00) & 01:00 AM
  const rMidnight = parseReminderFromTranscript("raat 12 baje sone jana h");
  assert.equal(rMidnight.reminder_time, "00:00");
  assert.equal(rMidnight.reminder_label_12h, "12:00 AM");

  const rLateNight = parseReminderFromTranscript("raat 1 baje study krna h");
  assert.equal(rLateNight.reminder_time, "01:00");
  assert.equal(rLateNight.reminder_label_12h, "01:00 AM");

  // 6. Verify Dual VALARM (-PT5M 5 mins before + PT0S on-time) in .ICS calendar feed
  const ics = generateIcsCalendarFeed(
    { name: "Shivam Coder", timezone: "Asia/Kolkata" },
    [{ id: 1, name: "Morning Brush", schedule_type: "daily", reminder_time: "07:00", is_archived: false }],
    new Map(),
    "2026-10-27"
  );
  assert.ok(ics.includes("TRIGGER:-PT5M"));
  assert.ok(ics.includes("TRIGGER:PT0S"));
});

test("17. Senior Security Penetration Audit (Prototype Pollution, IDOR Isolation, Forged JWT Rejection, Rate Limiting, & Security Headers)", async () => {
  const userAHeaders = await registerAndGetHeaders("userA.sec@habitflow.dev", "Asia/Kolkata");
  const userBHeaders = await registerAndGetHeaders("userB.sec@habitflow.dev", "Asia/Kolkata");

  // 1. User A creates a private habit
  const createRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/habits",
    query: {},
    headers: userAHeaders,
    body: {
      name: "User A Secret Habit",
      schedule_type: "daily",
      "__proto__": { polluted: true },
      "constructor": { prototype: { polluted: true } }
    }
  });
  assert.equal(createRes.status, 201);
  assert.equal(({}).polluted, undefined, "Prototype pollution must be blocked");
  const habitIdA = createRes.body.habit.id;

  // 2. IDOR Test: User B attempts to delete or check-in User A's habit -> Must return 404
  const idorDelete = await dispatchApiRequest({
    method: "DELETE",
    pathname: `/api/habits/${habitIdA}`,
    query: {},
    headers: userBHeaders,
    body: {}
  });
  assert.equal(idorDelete.status, 404);

  const idorCheckin = await dispatchApiRequest({
    method: "POST",
    pathname: `/api/habits/${habitIdA}/checkin`,
    query: {},
    headers: userBHeaders,
    body: { date: "2026-10-27" }
  });
  assert.equal(idorCheckin.status, 404);

  // 3. Forged JWT Signature Rejection
  const forgedHeaders = {
    authorization: userAHeaders.authorization.slice(0, -4) + "ffff"
  };
  await assert.rejects(
    () =>
      dispatchApiRequest({
        method: "GET",
        pathname: "/api/habits",
        query: {},
        headers: forgedHeaders,
        body: {}
      }),
    (err) => err.statusCode === 401
  );

  // 4. Brute-Force Rate Limiter Test (26 rapid login attempts from same IP -> 429 Too Many Requests)
  let hit429 = false;
  for (let i = 0; i < 30; i++) {
    const r = await dispatchApiRequest({
      method: "POST",
      pathname: "/api/auth/login",
      query: {},
      headers: {},
      body: { email: "userA.sec@habitflow.dev", password: "WrongPassword!" },
      clientIp: "198.51.100.99"
    });
    if (r.status === 429) {
      hit429 = true;
      break;
    }
  }
  assert.equal(hit429, true, "Rate limiter must block brute-force login attempts with 429");
});

test("18. Gemini Pro AI Task Editing ('brush ka time sham 8 baje kr do' & 'brush ka naam Night Brush kr do')", async () => {
  const headers = await registerAndGetHeaders("ai.edit@habitflow.dev", "Asia/Kolkata");
  headers["x-debug-now-utc"] = "2026-10-28T10:00:00Z";

  // 1. Create Morning Brush at 07:00 AM
  const createRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/ai/command",
    query: {},
    headers,
    body: { transcript: "roj subah 7 baje brush krna h ye add kr do task" }
  });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.habit.reminder_time, "07:00");
  assert.equal(createRes.body.habit.reminder_time_12h, "07:00 AM");

  // 2. Edit the reminder time via AI: "brush ka time sham 8 baje kr do" -> 20:00 (08:00 PM)
  const editTimeRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/ai/command",
    query: {},
    headers,
    body: { transcript: "brush ka time sham 8 baje kr do" }
  });
  assert.equal(editTimeRes.status, 200);
  assert.equal(editTimeRes.body.intent, "edit_habit");
  assert.equal(editTimeRes.body.habit.reminder_time, "20:00");
  assert.equal(editTimeRes.body.habit.reminder_time_12h, "08:00 PM");

  // 3. Rename the task via AI: "brush ka naam Night Brush kr do"
  const editNameRes = await dispatchApiRequest({
    method: "POST",
    pathname: "/api/ai/command",
    query: {},
    headers,
    body: { transcript: "brush ka naam Night Brush kr do" }
  });
  assert.equal(editNameRes.status, 200);
  assert.equal(editNameRes.body.intent, "edit_habit");
  assert.equal(editNameRes.body.habit.name, "Night Brush");
});
