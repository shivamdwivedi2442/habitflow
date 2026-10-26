/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateTimezone(tzName) {
  if (!tzName || typeof tzName !== "string") {
    throw new Error("Time zone is required.");
  }
  const clean = tzName.trim();
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: clean });
    return clean;
  } catch {
    throw new Error(
      `Unsupported IANA time zone '${tzName}'. Example valid zones: 'Asia/Kolkata', 'America/New_York', 'UTC'.`
    );
  }
}

/**
 * Returns YYYY-MM-DD in the user's IANA time zone for a given Date / UTC instant.
 */
function getUserToday(tzName, nowUtc = null) {
  const validTz = validateTimezone(tzName);
  const dt = nowUtc ? new Date(nowUtc) : new Date();
  if (Number.isNaN(dt.getTime())) {
    throw new Error("Invalid reference timestamp.");
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: validTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(dt);

  const map = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}

/**
 * Pure calendar arithmetic helpers on YYYY-MM-DD strings (timezone-agnostic once local date is resolved)
 */
function parseDateStr(dateStr) {
  if (!DATE_RE.test(String(dateStr || ""))) {
    throw new Error("Check-in date must be in YYYY-MM-DD format.");
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() + 1 !== m ||
    dt.getUTCDate() !== d
  ) {
    throw new Error("Invalid calendar date.");
  }
  return dt;
}

function formatDateUTC(dt) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateStr, deltaDays) {
  const dt = parseDateStr(dateStr);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return formatDateUTC(dt);
}

/**
 * Returns 0 = Monday .. 6 = Sunday for a YYYY-MM-DD date string
 */
function getIsoWeekday(dateStr) {
  const dt = parseDateStr(dateStr);
  const jsDay = dt.getUTCDay(); // 0=Sun .. 6=Sat
  return (jsDay + 6) % 7;
}

function getIsoWeekStart(dateStr) {
  const wkday = getIsoWeekday(dateStr);
  return addDays(dateStr, -wkday);
}

function validateCheckinDate(checkinDateStr, tzName, nowUtc = null) {
  const cleanStr = String(checkinDateStr || "").trim();
  parseDateStr(cleanStr); // validates YYYY-MM-DD

  const todayStr = getUserToday(tzName, nowUtc);
  const earliestAllowed = addDays(todayStr, -7);

  if (cleanStr > todayStr) {
    throw new Error(
      `Cannot check off a future date (${cleanStr}). Today in ${tzName} is ${todayStr}.`
    );
  }
  if (cleanStr < earliestAllowed) {
    throw new Error(
      `Check-in date (${cleanStr}) is older than the 7-day lookback window (earliest allowed in ${tzName}: ${earliestAllowed}).`
    );
  }
  return cleanStr;
}

function isScheduledDay(dateStr, scheduleType, scheduleDays) {
  if (scheduleType === "daily") return true;
  if (scheduleType === "weekdays") {
    return Array.isArray(scheduleDays) && scheduleDays.includes(getIsoWeekday(dateStr));
  }
  return true;
}

function calculateDailyOrWeekdaysStreaks(checkinSet, todayStr, scheduleType, scheduleDays) {
  if (scheduleType === "weekdays" && (!Array.isArray(scheduleDays) || scheduleDays.length === 0)) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const scheduledCheckins = Array.from(checkinSet)
    .filter((d) => d <= todayStr && isScheduledDay(d, scheduleType, scheduleDays))
    .sort();

  if (scheduledCheckins.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const firstDate = scheduledCheckins[0];
  const validSet = new Set(scheduledCheckins);

  let longestStreak = 0;
  let runningStreak = 0;
  let cursor = firstDate;

  while (cursor <= todayStr) {
    if (isScheduledDay(cursor, scheduleType, scheduleDays)) {
      if (validSet.has(cursor)) {
        runningStreak += 1;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else if (cursor < todayStr) {
        runningStreak = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }

  // Walk backwards from todayStr over scheduled days for currentStreak
  let currentStreak = 0;
  let backCursor = todayStr;
  while (backCursor >= firstDate) {
    if (isScheduledDay(backCursor, scheduleType, scheduleDays)) {
      if (validSet.has(backCursor)) {
        currentStreak += 1;
      } else if (backCursor === todayStr) {
        // Grace period for today if not yet completed
      } else {
        break;
      }
    }
    backCursor = addDays(backCursor, -1);
  }

  return { currentStreak, longestStreak };
}

function calculateTimesPerWeekStreaks(checkinSet, todayStr, targetPerWeek) {
  const target = Number(targetPerWeek) || 0;
  if (target <= 0) return { currentStreak: 0, longestStreak: 0 };

  const validDates = Array.from(checkinSet)
    .filter((d) => d <= todayStr)
    .sort();
  if (validDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const firstWeek = getIsoWeekStart(validDates[0]);
  const currentWeek = getIsoWeekStart(todayStr);

  const weekCounts = new Map();
  for (const d of validDates) {
    const wk = getIsoWeekStart(d);
    weekCounts.set(wk, (weekCounts.get(wk) || 0) + 1);
  }

  let longestStreak = 0;
  let runningStreak = 0;
  let wk = firstWeek;

  while (wk <= currentWeek) {
    const cnt = weekCounts.get(wk) || 0;
    if (wk < currentWeek) {
      if (cnt >= target) {
        runningStreak += cnt;
        if (runningStreak > longestStreak) longestStreak = runningStreak;
      } else {
        runningStreak = 0;
      }
    } else {
      const checkedToday = checkinSet.has(todayStr);
      const remainingDays = 6 - getIsoWeekday(todayStr) + (checkedToday ? 0 : 1);
      const canStillSucceed = cnt + remainingDays >= target;
      if (cnt >= target || canStillSucceed) {
        runningStreak += cnt;
        if (runningStreak > longestStreak) longestStreak = runningStreak;
      } else {
        runningStreak = 0;
      }
    }
    wk = addDays(wk, 7);
  }

  return { currentStreak: runningStreak, longestStreak };
}

function calculateStreaks(
  checkinDateStrings,
  scheduleType,
  scheduleDays,
  targetPerWeek,
  tzName,
  nowUtc = null
) {
  const todayStr = getUserToday(tzName, nowUtc);
  const checkinSet = new Set(
    (checkinDateStrings || []).filter((s) => DATE_RE.test(String(s || "")))
  );

  let currentStreak = 0;
  let longestStreak = 0;

  if (scheduleType === "daily" || scheduleType === "weekdays") {
    const res = calculateDailyOrWeekdaysStreaks(checkinSet, todayStr, scheduleType, scheduleDays);
    currentStreak = res.currentStreak;
    longestStreak = res.longestStreak;
  } else if (scheduleType === "times_per_week") {
    const res = calculateTimesPerWeekStreaks(checkinSet, todayStr, targetPerWeek);
    currentStreak = res.currentStreak;
    longestStreak = res.longestStreak;
  } else {
    throw new Error(`Unknown schedule_type: ${scheduleType}`);
  }

  const completedToday = checkinSet.has(todayStr);
  const weekStart = getIsoWeekStart(todayStr);
  const weekEnd = addDays(weekStart, 6);

  let completedThisWeek = 0;
  for (const d of checkinSet) {
    if (d >= weekStart && d <= weekEnd && d <= todayStr) {
      completedThisWeek += 1;
    }
  }

  let weeklyTarget = 7;
  let isDueToday = true;
  if (scheduleType === "weekdays") {
    weeklyTarget = (scheduleDays || []).length;
    isDueToday = (scheduleDays || []).includes(getIsoWeekday(todayStr));
  } else if (scheduleType === "times_per_week") {
    weeklyTarget = Number(targetPerWeek) || 1;
    isDueToday = completedThisWeek < weeklyTarget;
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    completed_today: completedToday,
    is_due_today: isDueToday,
    completed_this_week: completedThisWeek,
    weekly_target: weeklyTarget,
    user_today: todayStr
  };
}

function calculateCompletionRate30d(
  checkinDateStrings,
  scheduleType,
  scheduleDays,
  targetPerWeek,
  tzName,
  nowUtc = null
) {
  const todayStr = getUserToday(tzName, nowUtc);
  const windowStart = addDays(todayStr, -29);
  const checkinSet = new Set(
    (checkinDateStrings || []).filter(
      (s) => DATE_RE.test(String(s || "")) && s >= windowStart && s <= todayStr
    )
  );

  let expected = 30;
  let completed = checkinSet.size;

  if (scheduleType === "weekdays") {
    let schedCount = 0;
    let schedCompleted = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(windowStart, i);
      if ((scheduleDays || []).includes(getIsoWeekday(d))) {
        schedCount += 1;
        if (checkinSet.has(d)) schedCompleted += 1;
      }
    }
    expected = schedCount;
    completed = schedCompleted;
  } else if (scheduleType === "times_per_week") {
    expected = Math.max(1, Math.round(((Number(targetPerWeek) || 1) * 30) / 7));
    completed = checkinSet.size;
  }

  const rate = expected === 0 ? 0.0 : Math.min(100.0, Math.round((completed / expected) * 1000) / 10);

  return {
    window_start: windowStart,
    window_end: todayStr,
    completed_count: completed,
    expected_count: expected,
    completion_rate: rate
  };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function generate6MonthHeatmap(
  checkinDateStrings,
  scheduleType,
  scheduleDays,
  tzName,
  nowUtc = null
) {
  const todayStr = getUserToday(tzName, nowUtc);
  const rawStart = addDays(todayStr, -181);
  const gridStart = getIsoWeekStart(rawStart);
  const checkinSet = new Set((checkinDateStrings || []).filter((s) => DATE_RE.test(String(s || ""))));

  const days = [];
  let cursor = gridStart;
  let totalCompleted6m = 0;

  while (cursor <= todayStr) {
    const inWindow = cursor >= rawStart;
    const completed = checkinSet.has(cursor);
    const scheduled = isScheduledDay(cursor, scheduleType, scheduleDays);
    if (inWindow && completed) totalCompleted6m += 1;

    let status = "missed";
    if (completed) status = "completed";
    else if (!scheduled) status = "rest_day";
    else if (cursor === todayStr) status = "pending_today";

    const dt = parseDateStr(cursor);
    days.push({
      date: cursor,
      weekday: getIsoWeekday(cursor),
      month: MONTH_NAMES[dt.getUTCMonth()],
      day: dt.getUTCDate(),
      in_window: inWindow,
      completed,
      scheduled,
      status
    });

    cursor = addDays(cursor, 1);
  }

  return {
    grid_start: gridStart,
    window_start: rawStart,
    window_end: todayStr,
    total_completed_6m: totalCompleted6m,
    days
  };
}

module.exports = {
  validateTimezone,
  getUserToday,
  addDays,
  getIsoWeekday,
  getIsoWeekStart,
  validateCheckinDate,
  isScheduledDay,
  calculateStreaks,
  calculateCompletionRate30d,
  generate6MonthHeatmap
};
