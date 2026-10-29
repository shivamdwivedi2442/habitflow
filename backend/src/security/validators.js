// Engineered by Shivam Coder (https://github.com/shivamdwivedi2442)
const { validateTimezone } = require("../services/streakEngine");
const { sanitizeValue } = require("./securityMiddleware");

const EMAIL_RE = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const TIME_24H_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const OTP_RE = /^\d{6}$/;

const VALID_SVG_ICONS = new Set([
  "bolt",
  "code",
  "dumbbell",
  "rocket",
  "shield",
  "book",
  "droplet",
  "heart",
  "target",
  "sparkle",
  "flame",
  "trophy",
  "sun",
  "moon"
]);

class ValidationError extends Error {
  constructor(message, field = "input") {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 422;
    this.field = field;
  }
}

function normalizeIconKey(rawIcon) {
  const val = String(rawIcon || "bolt").trim().toLowerCase();
  if (VALID_SVG_ICONS.has(val)) return val;
  // Map legacy emoji if passed by older clients or external tests
  const emojiMap = {
    "⚡": "bolt",
    "💻": "code",
    "🏋️": "dumbbell",
    "🚀": "rocket",
    "🛡️": "shield",
    "📚": "book",
    "💧": "droplet",
    "🧘": "heart",
    "🎯": "target",
    "👟": "flame"
  };
  return emojiMap[rawIcon] || "bolt";
}

function validateRegisterInput(rawBody) {
  const body = sanitizeValue(rawBody || {});
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const timezone = String(body.timezone || "Asia/Kolkata").trim();
  const avatarUrl = String(body.avatar_url || "").trim();

  if (name.length < 2 || name.length > 60) {
    throw new ValidationError("Full name must be between 2 and 60 characters.", "name");
  }
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError(
      "Please provide a valid email address (e.g., shivam@habitflow.dev).",
      "email"
    );
  }
  if (password.length < 6) {
    throw new ValidationError("Password must be at least 6 characters long.", "password");
  }
  if (password.length > 128) {
    throw new ValidationError("Password cannot exceed 128 characters.", "password");
  }

  let validTz;
  try {
    validTz = validateTimezone(timezone);
  } catch (err) {
    throw new ValidationError(err.message, "timezone");
  }

  return { name, email, password, timezone: validTz, avatar_url: avatarUrl };
}

function validateLoginInput(rawBody) {
  const body = sanitizeValue(rawBody || {});
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !EMAIL_RE.test(email)) {
    throw new ValidationError("Please enter a valid email address.", "email");
  }
  if (!password) {
    throw new ValidationError("Password cannot be empty.", "password");
  }
  return { email, password };
}

function validateSendOtpInput(rawBody) {
  const body = sanitizeValue(rawBody || {});
  const email = String(body.email || "").trim().toLowerCase();
  const purpose = String(body.purpose || "auth").trim();
  if (!email || !EMAIL_RE.test(email)) {
    throw new ValidationError("Please enter a valid email address to receive your 6-digit OTP.", "email");
  }
  return { email, purpose };
}

function validateVerifyOtpInput(rawBody) {
  const body = sanitizeValue(rawBody || {});
  const email = String(body.email || "").trim().toLowerCase();
  const otp = String(body.otp || "").trim();
  if (!email || !EMAIL_RE.test(email)) {
    throw new ValidationError("Please enter a valid email address.", "email");
  }
  if (!OTP_RE.test(otp)) {
    throw new ValidationError("OTP must be an exact 6-digit numeric code.", "otp");
  }
  return { email, otp };
}

function validateProfileUpdateInput(rawBody) {
  const body = sanitizeValue(rawBody || {});
  const out = {};

  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (name.length < 2 || name.length > 60) {
      throw new ValidationError("Display name must be between 2 and 60 characters.", "name");
    }
    out.name = name;
  }

  if (body.bio !== undefined) {
    const bio = String(body.bio || "").trim();
    if (bio.length > 240) {
      throw new ValidationError("Bio cannot exceed 240 characters.", "bio");
    }
    out.bio = bio;
  }

  if (body.timezone !== undefined) {
    try {
      out.timezone = validateTimezone(body.timezone);
    } catch (err) {
      throw new ValidationError(err.message, "timezone");
    }
  }

  if (body.avatar_url !== undefined) {
    const av = String(body.avatar_url || "").trim();
    if (av.length > 350000) {
      throw new ValidationError("Profile picture data cannot exceed 350 KB.", "avatar_url");
    }
    out.avatar_url = av;
  }

  return out;
}

function validateTimezoneUpdate(rawBody) {
  const body = sanitizeValue(rawBody || {});
  try {
    const timezone = validateTimezone(body.timezone);
    return { timezone };
  } catch (err) {
    throw new ValidationError(err.message, "timezone");
  }
}

function validateHabitInput(rawBody) {
  const body = sanitizeValue(rawBody || {});
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();
  const color = String(body.color || "#6366f1").trim();
  const icon = normalizeIconKey(body.icon);
  const scheduleType = String(body.schedule_type || "daily").trim();
  const reminderEnabled = Boolean(body.reminder_enabled);
  const rawReminderTime =
    body.reminder_time !== null && body.reminder_time !== undefined
      ? String(body.reminder_time).trim()
      : null;

  if (!name) {
    throw new ValidationError("Habit name is required and cannot be blank.", "name");
  }
  if (name.length < 2) {
    throw new ValidationError("Habit name must be at least 2 characters long.", "name");
  }
  if (name.length > 80) {
    throw new ValidationError("Habit name cannot exceed 80 characters.", "name");
  }
  if (description.length > 280) {
    throw new ValidationError("Description cannot exceed 280 characters.", "description");
  }
  if (!HEX_COLOR_RE.test(color)) {
    throw new ValidationError("Color must be a valid 6-digit hex code (e.g., #6366f1).", "color");
  }
  if (!["daily", "weekdays", "times_per_week"].includes(scheduleType)) {
    throw new ValidationError(
      "Schedule type must be one of: 'daily', 'weekdays', or 'times_per_week'.",
      "schedule_type"
    );
  }

  let scheduleDays = [];
  let targetPerWeek = 7;

  if (scheduleType === "daily") {
    scheduleDays = [0, 1, 2, 3, 4, 5, 6];
    targetPerWeek = 7;
  } else if (scheduleType === "weekdays") {
    const rawDays = Array.isArray(body.schedule_days) ? body.schedule_days : [];
    if (rawDays.length === 0) {
      throw new ValidationError(
        "Please select at least one weekday (Mon–Sun) for a specific-weekdays habit.",
        "schedule_days"
      );
    }
    const uniqueDays = Array.from(new Set(rawDays.map((d) => Number(d)))).sort((a, b) => a - b);
    for (const d of uniqueDays) {
      if (!Number.isInteger(d) || d < 0 || d > 6) {
        throw new ValidationError(
          "Weekdays must be integers between 0 (Monday) and 6 (Sunday).",
          "schedule_days"
        );
      }
    }
    scheduleDays = uniqueDays;
    targetPerWeek = uniqueDays.length;
  } else if (scheduleType === "times_per_week") {
    const t = Number(body.target_per_week);
    if (!Number.isInteger(t) || t < 1 || t > 7) {
      throw new ValidationError(
        "Target per week must be an integer between 1 and 7.",
        "target_per_week"
      );
    }
    scheduleDays = [];
    targetPerWeek = t;
  }

  let reminderTime = null;
  if (rawReminderTime) {
    if (!TIME_24H_RE.test(rawReminderTime)) {
      throw new ValidationError(
        "Reminder time must be in 24-hour HH:MM format (e.g., 08:30 or 21:00).",
        "reminder_time"
      );
    }
    reminderTime = rawReminderTime;
  }
  if (reminderEnabled && !reminderTime) {
    throw new ValidationError(
      "Please provide a valid reminder time (HH:MM) when daily reminders are enabled.",
      "reminder_time"
    );
  }

  return {
    name,
    description,
    color,
    icon,
    schedule_type: scheduleType,
    schedule_days: scheduleDays,
    target_per_week: targetPerWeek,
    reminder_time: reminderTime,
    reminder_enabled: reminderEnabled
  };
}

function validateCheckinInput(rawBody) {
  const body = sanitizeValue(rawBody || {});
  const date = String(body.date || "").trim();
  const note = String(body.note || "").trim();

  if (!date) {
    throw new ValidationError("Check-in date is required (YYYY-MM-DD).", "date");
  }
  if (note.length > 200) {
    throw new ValidationError("Check-in note cannot exceed 200 characters.", "note");
  }
  return { date, note };
}

function validateAiCommandInput(rawBody) {
  const body = sanitizeValue(rawBody || {});
  const transcript = String(body.transcript || body.command || "").trim();
  if (!transcript || transcript.length < 2) {
    throw new ValidationError(
      "Please speak or type a command (e.g., 'roj subah brush krna h ye add kr do task' or 'brush ho gya').",
      "transcript"
    );
  }
  if (transcript.length > 300) {
    throw new ValidationError("Voice/text command cannot exceed 300 characters.", "transcript");
  }
  return { transcript };
}

module.exports = {
  ValidationError,
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
};
