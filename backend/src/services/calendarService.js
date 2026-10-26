/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */

const ICAL_DAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

function buildRrule(habit) {
  if (habit.schedule_type === "daily") {
    return "RRULE:FREQ=DAILY";
  }
  if (habit.schedule_type === "weekdays" && Array.isArray(habit.schedule_days) && habit.schedule_days.length > 0) {
    const byDay = habit.schedule_days
      .map((d) => ICAL_DAY_CODES[Number(d)] || "MO")
      .join(",");
    return `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`;
  }
  return "RRULE:FREQ=DAILY";
}

function buildGoogleCalendarTemplateUrl(habit, userTodayStr) {
  const dateCompact = String(userTodayStr || "20261027").replace(/-/g, "");
  const remTime = habit.reminder_time || "08:30";
  const [hh, mm] = remTime.split(":").map((x) => String(x || "08").padStart(2, "0"));
  const endHh = String((parseInt(hh, 10) + 1) % 24).padStart(2, "0");

  const startDt = `${dateCompact}T${hh}${mm}00`;
  const endDt = `${dateCompact}T${endHh}${mm}00`;
  const rrule = buildRrule(habit);

  const text = encodeURIComponent(`⚡ [HabitFlow] ${habit.name}`);
  const details = encodeURIComponent(
    `${habit.description || "Daily habit tracked in HabitFlow"}\nSchedule: ${habit.schedule_type}\nReminders: 5 mins before & On-Time\nEngineered by Shivam Coder (https://github.com/shivamdwivedi2442)`
  );
  const recur = encodeURIComponent(rrule);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startDt}/${endDt}&details=${details}&recur=${recur}`;
}

function escapeIcsText(str) {
  return String(str || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function generateIcsCalendarFeed(user, habits, checkinsByHabit, userTodayStr) {
  const nowStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const todayCompact = String(userTodayStr || "2026-10-27").replace(/-/g, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Shivam Coder//HabitFlow Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:HabitFlow — ${escapeIcsText(user.name)}`,
    `X-WR-TIMEZONE:${escapeIcsText(user.timezone || "Asia/Kolkata")}`
  ];

  for (const h of habits) {
    if (h.is_archived) continue;
    const remTime = h.reminder_time || "08:30";
    const [hh, mm] = remTime.split(":").map((x) => String(x || "08").padStart(2, "0"));
    const endM = String((parseInt(mm, 10) + 30) % 60).padStart(2, "0");
    const endH =
      parseInt(mm, 10) + 30 >= 60
        ? String((parseInt(hh, 10) + 1) % 24).padStart(2, "0")
        : hh;

    // 1. Recurring Scheduled Task Event with DUAL Phone Popup VALARM Reminders (-5M & PT0S On-Time)
    lines.push(
      "BEGIN:VEVENT",
      `UID:habit-schedule-${h.id}@habitflow.shivamcoder.dev`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${todayCompact}T${hh}${mm}00`,
      `DTEND:${todayCompact}T${endH}${endM}00`,
      buildRrule(h),
      `SUMMARY:[Task] ${escapeIcsText(h.name)}`,
      `DESCRIPTION:${escapeIcsText(h.description || "Scheduled in HabitFlow")}`,
      // Stage 1 Alarm: 5 Minutes Before Task Time
      "BEGIN:VALARM",
      "TRIGGER:-PT5M",
      "ACTION:DISPLAY",
      `DESCRIPTION:⏳ Upcoming in 5 mins: ${escapeIcsText(h.name)}`,
      "END:VALARM",
      // Stage 2 Alarm: Exact On-Time Notification with Task Name
      "BEGIN:VALARM",
      "TRIGGER:PT0S",
      "ACTION:DISPLAY",
      `DESCRIPTION:⚡ Time Now: ${escapeIcsText(h.name)} — Complete your task!`,
      "END:VALARM",
      "END:VEVENT"
    );

    // 2. All Completed Check-ins Marked on Calendar Dates
    const checkins = checkinsByHabit.get(h.id) || [];
    for (const c of checkins.slice(-60)) {
      const dCompact = String(c.checkin_date).replace(/-/g, "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:habit-checkin-${h.id}-${dCompact}@habitflow.shivamcoder.dev`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${dCompact}`,
        `DTEND;VALUE=DATE:${dCompact}`,
        `SUMMARY:✅ DONE: ${escapeIcsText(h.name)}`,
        `DESCRIPTION:Completed on ${c.checkin_date} in HabitFlow.`,
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

module.exports = {
  buildGoogleCalendarTemplateUrl,
  generateIcsCalendarFeed
};
