/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
require("./utils/envLoader");
const { uploadProfilePictureToSupabase } = require("./services/storageService");
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const crypto = require("crypto");

const { verifyOwnershipIntegrity } = require("./security/ownership");
const {
  hashPassword,
  verifyPassword,
  createAccessToken,
  decodeAccessToken,
  apiLimiter,
  authLimiter,
  applySecurityHeaders
} = require("./security/securityMiddleware");
const {
  normalizeIconKey,
  validateRegisterInput,
  validateLoginInput,
  validateSendOtpInput,
  validateVerifyOtpInput,
  validateProfileUpdateInput,
  validateTimezoneUpdate,
  validateHabitInput,
  validateCheckinInput,
  validateAiCommandInput
} = require("./security/validators");
const {
  validateTimezone,
  getUserToday,
  addDays,
  getIsoWeekday,
  validateCheckinDate,
  calculateStreaks,
  calculateCompletionRate30d,
  generate6MonthHeatmap
} = require("./services/streakEngine");
const { classifyAiCommand, format12HourAmPm } = require("./services/aiAssistant");
const { sendOtpEmail } = require("./services/mailer");
const {
  buildGoogleCalendarTemplateUrl,
  generateIcsCalendarFeed
} = require("./services/calendarService");
const { db } = require("./db/adapter");

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

verifyOwnershipIntegrity();

function getNowOverride(headers) {
  const hdr = headers["x-debug-now-utc"];
  if (hdr) {
    const dt = new Date(String(hdr));
    if (!Number.isNaN(dt.getTime())) {
      return dt;
    }
  }
  return null;
}

function resolveEffectiveTimezone(user, headers) {
  const hdrTz = headers["x-user-timezone"];
  if (hdrTz) {
    try {
      return validateTimezone(String(hdrTz));
    } catch {
      // Fallback to user profile timezone
    }
  }
  return (user && user.timezone) || "Asia/Kolkata";
}

function serializeHabit(habitRow, checkinRows, tzName, nowUtc = null) {
  const scheduleDays = Array.isArray(habitRow.schedule_days)
    ? habitRow.schedule_days
    : JSON.parse(habitRow.schedule_days || "[]");
  const checkinDates = (checkinRows || []).map((r) => r.checkin_date);
  const checkinNotes = {};
  for (const r of checkinRows || []) {
    if (r.note) checkinNotes[r.checkin_date] = r.note;
  }

  const streakInfo = calculateStreaks(
    checkinDates,
    habitRow.schedule_type,
    scheduleDays,
    habitRow.target_per_week,
    tzName,
    nowUtc
  );

  const stats30d = calculateCompletionRate30d(
    checkinDates,
    habitRow.schedule_type,
    scheduleDays,
    habitRow.target_per_week,
    tzName,
    nowUtc
  );

  const heatmap6m = generate6MonthHeatmap(
    checkinDates,
    habitRow.schedule_type,
    scheduleDays,
    tzName,
    nowUtc
  );

  const todayStr = getUserToday(tzName, nowUtc);
  const checkinSet = new Set(checkinDates);
  const recentWindow = [];

  for (let offset = 7; offset >= 0; offset--) {
    const dStr = addDays(todayStr, -offset);
    const wkday = getIsoWeekday(dStr);
    const dayNum = Number(dStr.split("-")[2]);
    recentWindow.push({
      date: dStr,
      label:
        offset === 0 ? "Today" : offset === 1 ? "Yesterday" : `${WEEKDAY_SHORT[wkday]} ${dayNum}`,
      short_day: WEEKDAY_SHORT[wkday],
      day_num: dayNum,
      weekday: wkday,
      completed: checkinSet.has(dStr),
      note: checkinNotes[dStr] || ""
    });
  }

  const normalizedHabit = {
    id: habitRow.id,
    user_id: habitRow.user_id,
    name: habitRow.name,
    description: habitRow.description,
    color: habitRow.color,
    icon: normalizeIconKey(habitRow.icon),
    schedule_type: habitRow.schedule_type,
    schedule_days: scheduleDays,
    target_per_week: Number(habitRow.target_per_week),
    reminder_time: habitRow.reminder_time || null,
    reminder_time_12h: habitRow.reminder_time ? format12HourAmPm(habitRow.reminder_time) : null,
    reminder_enabled: Boolean(habitRow.reminder_enabled),
    is_archived: Boolean(habitRow.is_archived),
    created_at: habitRow.created_at,
    current_streak: streakInfo.current_streak,
    longest_streak: streakInfo.longest_streak,
    completed_today: streakInfo.completed_today,
    is_due_today: streakInfo.is_due_today,
    completed_this_week: streakInfo.completed_this_week,
    weekly_target: streakInfo.weekly_target,
    user_today: streakInfo.user_today,
    stats_30d: stats30d,
    recent_days: recentWindow,
    heatmap: heatmap6m
  };

  normalizedHabit.google_calendar_url = buildGoogleCalendarTemplateUrl(normalizedHabit, todayStr);
  return normalizedHabit;
}

async function authenticateRequest(headers, queryToken = null) {
  const authHeader = headers["authorization"] || "";
  let token = "";
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (headers["x-gemini-key"]) {
    token = String(headers["x-gemini-key"]).trim();
  } else if (queryToken) {
    token = String(queryToken).trim();
  }

  if (!token) {
    const err = new Error("Authentication required. Please log in to continue.");
    err.statusCode = 401;
    throw err;
  }
  const payload = decodeAccessToken(token);
  if (!payload) {
    const err = new Error("Your session has expired or the token is invalid. Please log in again.");
    err.statusCode = 401;
    throw err;
  }
  const user = await db.findUserById(payload.sub);
  if (!user) {
    const err = new Error("User account not found.");
    err.statusCode = 401;
    throw err;
  }
  return user;
}

async function executeNaturalLanguageCommand(currentUser, transcript, tzName, nowUtc = null) {
  const existingHabits = await db.listHabitsByUser(currentUser.id, true);
  const todayStr = getUserToday(tzName, nowUtc);
  const decision = classifyAiCommand(transcript, existingHabits, todayStr);

  if (decision.intent === "delete_habit") {
    if (!decision.matchedHabit) {
      return {
        status: 404,
        body: {
          intent: "delete_habit",
          error: `Could not find any task matching '${decision.keyword}'.`
        }
      };
    }
    const target = decision.matchedHabit;

    // Clean up calendar/reminders and delete habit
    if (typeof db.query === 'function') {
      try {
        await db.query('DELETE FROM habit_reminders WHERE habit_id = $1', [target.id]);
      } catch (e) { /* Ignore if table doesn't exist */ }
    }
    await db.deleteHabit(target.id, currentUser.id);

    const reply = `Removed task '${target.name}' and its calendar reminders from your database.`;
    await db.logAiCommand({
      user_id: currentUser.id,
      transcript,
      intent: "delete_habit",
      habit_id: null,
      reply
    });
    return {
      status: 200,
      body: {
        intent: "delete_habit",
        action: "deleted",
        deleted_habit_id: target.id,
        deleted_habit_name: target.name,
        reply
      }
    };
  }

  if (decision.intent === "complete_habit") {
    let validTargetDate = todayStr;
    try {
      validTargetDate = validateCheckinDate(decision.targetDate || todayStr, tzName, nowUtc);
    } catch (err) {
      return {
        status: 400,
        body: {
          intent: "complete_habit",
          error: err.message
        }
      };
    }

    if (!decision.matchedHabit) {
      const fallbackDecision = classifyAiCommand(
        `add task ${decision.keyword || transcript}`,
        existingHabits,
        todayStr
      );
      const created = await db.createHabit({
        user_id: currentUser.id,
        ...fallbackDecision.habitPayload
      });
      await db.ensureCheckedIn({
        habit_id: created.id,
        user_id: currentUser.id,
        checkin_date: validTargetDate,
        note: `Completed via AI Assistant: "${transcript}"`
      });
      const checkins = await db.listCheckinsByHabit(created.id);
      const serialized = serializeHabit(created, checkins, tzName, nowUtc);
      const reply = `Created '${created.name}' and marked it DONE for ${validTargetDate}!`;
      await db.logAiCommand({
        user_id: currentUser.id,
        transcript,
        intent: "create_and_complete",
        habit_id: created.id,
        reply
      });
      return {
        status: 200,
        body: {
          intent: "complete_habit",
          action: "checked",
          date: validTargetDate,
          reply,
          habit: serialized
        }
      };
    }

    const targetHabit = decision.matchedHabit;
    await db.ensureCheckedIn({
      habit_id: targetHabit.id,
      user_id: currentUser.id,
      checkin_date: validTargetDate,
      note: `Completed via AI Assistant: "${transcript}"`
    });
    const checkins = await db.listCheckinsByHabit(targetHabit.id);
    const serialized = serializeHabit(targetHabit, checkins, tzName, nowUtc);
    const reply = `Marked '${targetHabit.name}' as DONE for ${validTargetDate}! Current streak: ${serialized.current_streak}.`;
    await db.logAiCommand({
      user_id: currentUser.id,
      transcript,
      intent: "complete_habit",
      habit_id: targetHabit.id,
      reply
    });
    return {
      status: 200,
      body: {
        intent: "complete_habit",
        action: "checked",
        date: validTargetDate,
        reply,
        habit: serialized
      }
    };
  }

  const validHabit = validateHabitInput(decision.habitPayload);
  const created = await db.createHabit({
    user_id: currentUser.id,
    ...validHabit
  });
  const serialized = serializeHabit(created, [], tzName, nowUtc);
  const timeNote = created.reminder_time ? ` at ${format12HourAmPm(created.reminder_time)}` : "";
  const reply = `Added new task '${created.name}' (${created.schedule_type}${timeNote}) to your database and Google Calendar sync!`;
  await db.logAiCommand({
    user_id: currentUser.id,
    transcript,
    intent: "create_habit",
    habit_id: created.id,
    reply
  });
  return {
    status: 201,
    body: {
      intent: "create_habit",
      action: "created",
      reply,
      habit: serialized
    }
  };
}

async function dispatchApiRequest({
  method,
  pathname,
  query,
  headers,
  body,
  clientIp = "127.0.0.1"
}) {
  const ownershipMeta = verifyOwnershipIntegrity();

  const isAuthRoute =
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/send-otp") ||
    pathname.startsWith("/api/auth/verify-otp");

  const limiter = isAuthRoute ? authLimiter : apiLimiter;
  const rateCheck = limiter.check(`${clientIp}:${isAuthRoute ? "auth" : "api"}`);
  if (!rateCheck.allowed) {
    return {
      status: 429,
      body: {
        error: "Too many requests from this IP. Please wait 60 seconds and try again."
      }
    };
  }

  if (method === "GET" && pathname === "/api/health") {
    return {
      status: 200,
      body: {
        status: "ok",
        version: "3.0.0",
        stack: "Supabase + React Native + Nodemailer OTP + Phone Gemini + Google Calendar",
        db_mode: db.getStorageModeLabel ? db.getStorageModeLabel() : "Supabase",
        author: ownershipMeta.author,
        github: ownershipMeta.github,
        verified: ownershipMeta.verified
      }
    };
  }

  if (method === "GET" && pathname === "/api/ownership") {
    const verified = verifyOwnershipIntegrity(
      query.client_author || null,
      query.client_github || null
    );
    return { status: 200, body: verified };
  }

  if (method === "POST" && pathname === "/api/auth/send-otp") {
    const { email, purpose } = validateSendOtpInput(body);
    const otpCode = String(crypto.randomInt(100000, 999999));
    const otpHash = hashPassword(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.createOtpCode({
      email,
      otp_hash: otpHash,
      purpose,
      expires_at: expiresAt
    });

    const mailResult = await sendOtpEmail({
      email,
      name: body.name || "",
      otpCode,
      purpose
    });

    return {
      status: 200,
      body: {
        message: `6-digit verification OTP dispatched via Nodemailer to ${email} (valid for 10 minutes).`,
        email,
        mailer_provider: mailResult.provider,
        expires_in_seconds: 600,
        demo_otp: otpCode
      }
    };
  }

  if (method === "POST" && pathname === "/api/auth/verify-otp") {
    const { email, otp } = validateVerifyOtpInput(body);
    const activeOtp = await db.findLatestActiveOtp(email);
    if (!activeOtp) {
      return {
        status: 400,
        body: { error: "No active OTP found for this email. Please request a new OTP code." }
      };
    }
    if (new Date(activeOtp.expires_at).getTime() < Date.now()) {
      await db.consumeOtpCode(activeOtp.id);
      return {
        status: 400,
        body: { error: "This OTP has expired. Please request a fresh 6-digit OTP." }
      };
    }
    if (!verifyPassword(otp, activeOtp.otp_hash)) {
      return {
        status: 401,
        body: { error: "Invalid 6-digit OTP code. Please double-check and try again." }
      };
    }

    await db.consumeOtpCode(activeOtp.id);
    await db.markUserVerified(email);

    let user = await db.findUserByEmail(email);
    if (!user) {
      const defaultName =
        email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ").trim() || "HabitFlow User";
      user = await db.createUser({
        email,
        name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
        password_hash: hashPassword(crypto.randomBytes(16).toString("hex")),
        timezone: "Asia/Kolkata",
        is_verified: true
      });
    } else {
      user = await db.findUserById(user.id);
    }

    const token = createAccessToken(user.id, user.email);
    return {
      status: 200,
      body: {
        verified: true,
        message: "OTP verified via Nodemailer! Your account is active and signed in.",
        token,
        user
      }
    };
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    const valid = validateRegisterInput(body);
    const existing = await db.findUserByEmail(valid.email);
    if (existing) {
      return {
        status: 409,
        body: { error: "An account with this email already exists. Please sign in instead." }
      };
    }
    const requireOtpStep = Boolean(body.require_otp);
    const pwHash = hashPassword(valid.password);
    const user = await db.createUser({
      email: valid.email,
      name: valid.name,
      password_hash: pwHash,
      timezone: valid.timezone || "Asia/Kolkata",
      avatar_url: valid.avatar_url || "",
      is_verified: !requireOtpStep
    });

    const otpCode = String(crypto.randomInt(100000, 999999));
    const otpHash = hashPassword(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await db.createOtpCode({
      email: valid.email,
      otp_hash: otpHash,
      purpose: "signup",
      expires_at: expiresAt
    });
    const mailResult = await sendOtpEmail({
      email: valid.email,
      name: valid.name,
      otpCode,
      purpose: "signup"
    });

    const token = createAccessToken(user.id, user.email);
    return {
      status: 201,
      body: {
        otp_required: requireOtpStep,
        message: requireOtpStep
          ? `Signup OTP sent to ${valid.email} via Nodemailer.`
          : "Account created successfully and signed in!",
        mailer_provider: mailResult.provider,
        demo_otp: otpCode,
        token,
        user
      }
    };
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const valid = validateLoginInput(body);
    const userRow = await db.findUserByEmail(valid.email);
    if (!userRow || !verifyPassword(valid.password, userRow.password_hash)) {
      return {
        status: 401,
        body: {
          error: "Invalid email or password. Please check your credentials."
        }
      };
    }
    const user = await db.findUserById(userRow.id);
    const token = createAccessToken(user.id, user.email);
    return {
      status: 200,
      body: { token, user }
    };
  }

  const currentUser = await authenticateRequest(headers, query.token || body?.token);
  const tzName = resolveEffectiveTimezone(currentUser, headers);
  const nowUtc = getNowOverride(headers);

  if (method === "GET" && pathname === "/api/auth/me") {
    return {
      status: 200,
      body: {
        user: currentUser,
        active_timezone: tzName,
        user_today: getUserToday(tzName, nowUtc),
        ownership: ownershipMeta
      }
    };
  }

  if (method === "PUT" && pathname === "/api/auth/timezone") {
    const { timezone } = validateTimezoneUpdate(body);
    await db.updateUserTimezone(currentUser.id, timezone);
    return {
      status: 200,
      body: {
        message: `Time zone updated to ${timezone}.`,
        timezone,
        user_today: getUserToday(timezone, nowUtc)
      }
    };
  }

  if (method === "PUT" && pathname === "/api/profile") {
    const updates = validateProfileUpdateInput(body);
    if (updates.avatar_url) {
      const uploaded = await uploadProfilePictureToSupabase(currentUser.id, updates.avatar_url);
      updates.avatar_url = uploaded.url;
    }
    const updatedUser = await db.updateUserProfile(currentUser.id, updates);
    return {
      status: 200,
      body: {
        message: "Profile updated and saved to database.",
        user: updatedUser
      }
    };
  }

  if (method === "POST" && pathname === "/api/ai/command") {
    const { transcript } = validateAiCommandInput(body);
    return executeNaturalLanguageCommand(currentUser, transcript, tzName, nowUtc);
  }

  if (method === "POST" && pathname === "/api/gemini/webhook") {
    const { transcript } = validateAiCommandInput(body);
    const res = await executeNaturalLanguageCommand(currentUser, transcript, tzName, nowUtc);
    return {
      status: res.status,
      body: {
        source: "phone_gemini_assistant",
        spoken_response: res.body.reply || res.body.error,
        ...res.body
      }
    };
  }

  if (method === "GET" && pathname === "/api/calendar/sync-info") {
    const todayStr = getUserToday(tzName, nowUtc);
    const [habitRows, checkinRows] = await Promise.all([
      db.listHabitsByUser(currentUser.id, false),
      db.listCheckinsByUser(currentUser.id)
    ]);
    const byHabit = new Map();
    for (const c of checkinRows) {
      if (!byHabit.has(c.habit_id)) byHabit.set(c.habit_id, []);
      byHabit.get(c.habit_id).push(c);
    }
    const serializedHabits = habitRows.map((h) =>
      serializeHabit(h, byHabit.get(h.id) || [], tzName, nowUtc)
    );
    const feedToken = createAccessToken(currentUser.id, currentUser.email);
    return {
      status: 200,
      body: {
        ics_feed_path: `/api/calendar/export.ics?token=${encodeURIComponent(feedToken)}`,
        gemini_webhook_path: "/api/gemini/webhook",
        gemini_webhook_token: feedToken,
        user_today: todayStr,
        habits: serializedHabits.map((h) => ({
          id: h.id,
          name: h.name,
          reminder_time: h.reminder_time || "08:30",
          google_calendar_url: h.google_calendar_url
        }))
      }
    };
  }

  if (method === "GET" && pathname === "/api/habits") {
    const includeArchived = String(query.include_archived || "false") === "true";
    const [habitRows, checkinRows] = await Promise.all([
      db.listHabitsByUser(currentUser.id, includeArchived),
      db.listCheckinsByUser(currentUser.id)
    ]);

    const byHabit = new Map();
    for (const c of checkinRows) {
      if (!byHabit.has(c.habit_id)) byHabit.set(c.habit_id, []);
      byHabit.get(c.habit_id).push(c);
    }

    const habits = habitRows.map((h) =>
      serializeHabit(h, byHabit.get(h.id) || [], tzName, nowUtc)
    );

    return {
      status: 200,
      body: {
        timezone: tzName,
        user_today: getUserToday(tzName, nowUtc),
        habits
      }
    };
  }

  if (method === "POST" && pathname === "/api/habits") {
    const valid = validateHabitInput(body);
    const created = await db.createHabit({
      user_id: currentUser.id,
      ...valid
    });
    return {
      status: 201,
      body: {
        message: `Task '${valid.name}' saved to database.`,
        habit: serializeHabit(created, [], tzName, nowUtc)
      }
    };
  }

  const habitMatch = pathname.match(
    /^\/api\/habits\/(\d+)(?:\/(archive|restore|checkin|heatmap))?$/
  );
  if (habitMatch) {
    const habitId = Number(habitMatch[1]);
    const subAction = habitMatch[2] || null;

    const existing = await db.findHabitByIdAndUser(habitId, currentUser.id);
    if (!existing) {
      return { status: 404, body: { error: "Habit not found." } };
    }

    if (!subAction && method === "PUT") {
      const valid = validateHabitInput(body);
      const updated = await db.updateHabit(habitId, currentUser.id, valid);
      const checkins = await db.listCheckinsByHabit(habitId);
      return {
        status: 200,
        body: {
          message: `Task '${valid.name}' updated.`,
          habit: serializeHabit(updated, checkins, tzName, nowUtc)
        }
      };
    }

    if (!subAction && method === "DELETE") {
      // Clean up calendar/reminders and delete habit
      if (typeof db.query === 'function') {
        try {
          await db.query('DELETE FROM habit_reminders WHERE habit_id = $1', [habitId]);
        } catch (e) { /* Ignore if table doesn't exist */ }
      }
      await db.deleteHabit(habitId, currentUser.id);
      return {
        status: 200,
        body: { message: `Task '${existing.name}' and its calendar reminders permanently deleted.` }
      };
    }

    if (subAction === "archive" && method === "POST") {
      const updated = await db.setHabitArchived(habitId, currentUser.id, true);
      const checkins = await db.listCheckinsByHabit(habitId);
      return {
        status: 200,
        body: {
          message: `Task '${existing.name}' archived. All historical check-ins are preserved.`,
          habit: serializeHabit(updated, checkins, tzName, nowUtc)
        }
      };
    }

    if (subAction === "restore" && method === "POST") {
      const updated = await db.setHabitArchived(habitId, currentUser.id, false);
      const checkins = await db.listCheckinsByHabit(habitId);
      return {
        status: 200,
        body: {
          message: `Task '${existing.name}' restored with full history intact.`,
          habit: serializeHabit(updated, checkins, tzName, nowUtc)
        }
      };
    }

    if (subAction === "checkin" && method === "POST") {
      if (existing.is_archived) {
        return {
          status: 400,
          body: { error: "Cannot check off an archived habit. Restore the habit first." }
        };
      }
      const { date, note } = validateCheckinInput(body);
      let validDate;
      try {
        validDate = validateCheckinDate(date, tzName, nowUtc);
      } catch (err) {
        return { status: 400, body: { error: err.message } };
      }

      const action = await db.toggleCheckin({
        habit_id: habitId,
        user_id: currentUser.id,
        checkin_date: validDate,
        note
      });
      const checkins = await db.listCheckinsByHabit(habitId);
      return {
        status: 200,
        body: {
          action,
          date: validDate,
          habit: serializeHabit(existing, checkins, tzName, nowUtc)
        }
      };
    }

    if (subAction === "heatmap" && method === "GET") {
      const checkins = await db.listCheckinsByHabit(habitId);
      const scheduleDays = Array.isArray(existing.schedule_days)
        ? existing.schedule_days
        : JSON.parse(existing.schedule_days || "[]");
      const heatmap = generate6MonthHeatmap(
        checkins.map((c) => c.checkin_date),
        existing.schedule_type,
        scheduleDays,
        tzName,
        nowUtc
      );
      return {
        status: 200,
        body: {
          habit_id: habitId,
          habit_name: existing.name,
          timezone: tzName,
          heatmap
        }
      };
    }
  }

  if (method === "GET" && pathname === "/api/stats") {
    const todayStr = getUserToday(tzName, nowUtc);
    const [habitRows, checkinRows] = await Promise.all([
      db.listHabitsByUser(currentUser.id, true),
      db.listCheckinsByUser(currentUser.id)
    ]);

    const byHabit = new Map();
    for (const c of checkinRows) {
      if (!byHabit.has(c.habit_id)) byHabit.set(c.habit_id, []);
      byHabit.get(c.habit_id).push(c);
    }

    const activeStats = [];
    const archivedStats = [];
    let totalCompleted30d = 0;
    let totalExpected30d = 0;
    let bestStreakOverall = 0;

    for (const h of habitRows) {
      const s = serializeHabit(h, byHabit.get(h.id) || [], tzName, nowUtc);
      const item = {
        id: s.id,
        name: s.name,
        icon: s.icon,
        color: s.color,
        schedule_type: s.schedule_type,
        schedule_days: s.schedule_days,
        target_per_week: s.target_per_week,
        is_archived: s.is_archived,
        current_streak: s.current_streak,
        longest_streak: s.longest_streak,
        completed_today: s.completed_today,
        completion_rate_30d: s.stats_30d.completion_rate,
        completed_30d: s.stats_30d.completed_count,
        expected_30d: s.stats_30d.expected_count,
        total_completed_6m: s.heatmap.total_completed_6m,
        reminder_enabled: s.reminder_enabled,
        reminder_time: s.reminder_time,
        google_calendar_url: s.google_calendar_url
      };
      if (s.longest_streak > bestStreakOverall) {
        bestStreakOverall = s.longest_streak;
      }
      if (s.is_archived) {
        archivedStats.push(item);
      } else {
        activeStats.push(item);
        totalCompleted30d += s.stats_30d.completed_count;
        totalExpected30d += s.stats_30d.expected_count;
      }
    }

    const overallRate =
      totalExpected30d > 0
        ? Math.min(100.0, Math.round((totalCompleted30d / totalExpected30d) * 1000) / 10)
        : 0.0;

    return {
      status: 200,
      body: {
        timezone: tzName,
        user_today: todayStr,
        window_start_30d: addDays(todayStr, -29),
        window_end_30d: todayStr,
        summary: {
          active_habits_count: activeStats.length,
          archived_habits_count: archivedStats.length,
          overall_completion_rate_30d: overallRate,
          total_completed_30d: totalCompleted30d,
          total_expected_30d: totalExpected30d,
          best_streak_overall: bestStreakOverall
        },
        habits: activeStats,
        archived_habits: archivedStats
      }
    };
  }

  return { status: 404, body: { error: `API route not found: ${method} ${pathname}` } };
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ics": "text/calendar; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function createHttpServer() {
  const publicDir = path.join(__dirname, "..", "..", "frontend", "public");

  return http.createServer(async (req, res) => {
    try {
      applySecurityHeaders(req, res);

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-User-Timezone, X-Debug-Now-UTC, X-Gemini-Key"
      );
      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        return res.end();
      }

      const parsedUrlObj = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const pathname = parsedUrlObj.pathname || "/";
      const parsedUrl = { pathname, query: Object.fromEntries(parsedUrlObj.searchParams.entries()) };

      if (req.method === "GET" && pathname === "/api/calendar/export.ics") {
        try {
          const user = await authenticateRequest(req.headers || {}, parsedUrl.query?.token);
          const tzName = resolveEffectiveTimezone(user, req.headers || {});
          const todayStr = getUserToday(tzName);
          const [habitRows, checkinRows] = await Promise.all([
            db.listHabitsByUser(user.id, false),
            db.listCheckinsByUser(user.id)
          ]);
          const byHabit = new Map();
          for (const c of checkinRows) {
            if (!byHabit.has(c.habit_id)) byHabit.set(c.habit_id, []);
            byHabit.get(c.habit_id).push(c);
          }
          const icsContent = generateIcsCalendarFeed(user, habitRows, byHabit, todayStr);
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/calendar; charset=utf-8");
          res.setHeader("Content-Disposition", 'attachment; filename="habitflow-calendar.ics"');
          return res.end(icsContent);
        } catch (err) {
          res.statusCode = err.statusCode || 401;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: err.message }));
        }
      }

      if (pathname === "/robots.txt") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.end(
          "User-agent: *\nAllow: /\nDisallow: /api/auth/\nSitemap: https://habitflow.shivamcoder.dev/sitemap.xml\n"
        );
      }

      if (pathname === "/sitemap.xml") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        return res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://habitflow.shivamcoder.dev/</loc>
    <lastmod>2026-10-27</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
      }

      if (pathname === "/manifest.json") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.end(
          JSON.stringify(
            {
              name: "HabitFlow — AI Habit & Daily Task Tracker by Shivam Coder",
              short_name: "HabitFlow",
              description:
                "Full-Stack + Supabase + React Native Habit Tracker with AI Voice Commands, Phone Gemini Integration, Google Calendar Sync, and Timezone-Accurate Streaks.",
              start_url: "/",
              display: "standalone",
              background_color: "#050811",
              theme_color: "#6366f1",
              author: "Shivam Coder (https://github.com/shivamdwivedi2442)"
            },
            null,
            2
          )
        );
      }

      if (pathname.startsWith("/api/")) {
        let rawBody = "";
        for await (const chunk of req) {
          rawBody += chunk;
          if (rawBody.length > 1024 * 600) {
            res.statusCode = 413;
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({ error: "Payload too large." }));
          }
        }
        let jsonBody = {};
        if (rawBody.trim()) {
          try {
            jsonBody = JSON.parse(rawBody);
          } catch {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({ error: "Malformed JSON body." }));
          }
        }

        try {
          const result = await dispatchApiRequest({
            method: req.method,
            pathname,
            query: parsedUrl.query || {},
            headers: req.headers || {},
            body: jsonBody,
            clientIp: req.socket.remoteAddress || "127.0.0.1"
          });
          res.statusCode = result.status;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          return res.end(JSON.stringify(result.body));
        } catch (err) {
          const status = err.statusCode || 500;
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          return res.end(
            JSON.stringify({
              error: err.message || "Internal server error.",
              field: err.field || undefined
            })
          );
        }
      }

      let targetFile = path.join(publicDir, pathname === "/" ? "index.html" : pathname);
      if (
        !targetFile.startsWith(publicDir) ||
        !fs.existsSync(targetFile) ||
        fs.statSync(targetFile).isDirectory()
      ) {
        targetFile = path.join(publicDir, "index.html");
      }
      if (fs.existsSync(targetFile)) {
        const ext = path.extname(targetFile).toLowerCase();
        res.statusCode = 200;
        res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
        return res.end(fs.readFileSync(targetFile));
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end("<h1>HabitFlow Server Running</h1>");
    } catch (outerErr) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({ error: outerErr.message }));
    }
  });
}

module.exports = {
  dispatchApiRequest,
  createHttpServer
};