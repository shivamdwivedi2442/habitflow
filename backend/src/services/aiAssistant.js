/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
const { addDays, getIsoWeekday } = require("./streakEngine");

const ICON_KEYWORDS = [
  { icon: "sparkle", color: "#06b6d4", words: ["brush", "teeth", "clean", "wash", "skin", "face", "nahana", "bath"] },
  { icon: "dumbbell", color: "#10b981", words: ["gym", "workout", "exercise", "pushup", "lift", "fitness", "yoga", "kasrat"] },
  { icon: "flame", color: "#f59e0b", words: ["run", "running", "walk", "jog", "cardio", "steps", "daudna", "tahalke"] },
  { icon: "code", color: "#6366f1", words: ["code", "coding", "leetcode", "pern", "react", "programming", "github", "project", "study", "padhai"] },
  { icon: "book", color: "#8b5cf6", words: ["read", "reading", "book", "kitab", "notes", "chapter", "learn"] },
  { icon: "droplet", color: "#38bdf8", words: ["water", "pani", "hydrate", "drink", "milk"] },
  { icon: "heart", color: "#ec4899", words: ["meditate", "meditation", "dhyan", "sleep", "sone", "health", "prayer", "pooja"] },
  { icon: "shield", color: "#f43f5e", words: ["security", "audit", "revision", "test", "practice"] }
];

const WEEKDAY_TOKENS = [
  { idx: 0, tokens: ["monday", "mon", "somwar", "somvaar"] },
  { idx: 1, tokens: ["tuesday", "tue", "mangalwar", "mangalvaar"] },
  { idx: 2, tokens: ["wednesday", "wed", "budhwar", "budhvaar"] },
  { idx: 3, tokens: ["thursday", "thu", "guruwar", "guruvaar", "brihaspatiwar"] },
  { idx: 4, tokens: ["friday", "fri", "shukrawar", "shukravaar"] },
  { idx: 5, tokens: ["saturday", "sat", "shaniwar", "shanivaar"] },
  { idx: 6, tokens: ["sunday", "sun", "raviwar", "ravivaar", "itwar"] }
];

function format12HourAmPm(time24) {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) return "";
  const [hhStr, mmStr] = time24.split(":");
  const hh = parseInt(hhStr, 10);
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(hour12).padStart(2, "0")}:${mmStr} ${period}`;
}

function inferIconAndColor(text) {
  const lower = String(text || "").toLowerCase();
  for (const entry of ICON_KEYWORDS) {
    if (entry.words.some((w) => lower.includes(w))) {
      return { icon: entry.icon, color: entry.color };
    }
  }
  return { icon: "bolt", color: "#6366f1" };
}

function toTitleCase(str) {
  return String(str || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function parseScheduleFromTranscript(lower) {
  const matchedDays = [];
  for (const w of WEEKDAY_TOKENS) {
    if (w.tokens.some((tk) => new RegExp(`\\b${tk}\\b`, "i").test(lower))) {
      matchedDays.push(w.idx);
    }
  }
  if (matchedDays.length > 0 && matchedDays.length < 7) {
    return {
      schedule_type: "weekdays",
      schedule_days: matchedDays,
      target_per_week: matchedDays.length
    };
  }

  const timesMatch =
    lower.match(/(\d)\s*(?:times|time|baar|bar|din)\s*(?:a\s*week|per\s*week|hafte|haftey|in\s*a\s*week)/i) ||
    lower.match(/(?:hafte|haftey|week)\s*(?:me|mein|in)?\s*(\d)\s*(?:baar|bar|din|times)/i);

  if (timesMatch) {
    const t = Math.max(1, Math.min(7, parseInt(timesMatch[1], 10)));
    return {
      schedule_type: "times_per_week",
      schedule_days: [],
      target_per_week: t
    };
  }

  return {
    schedule_type: "daily",
    schedule_days: [0, 1, 2, 3, 4, 5, 6],
    target_per_week: 7
  };
}

function parseReminderFromTranscript(rawText) {
  const lower = String(rawText || "").toLowerCase();

  const hasSubah = /\b(subah|subha|morning|savere)\b/i.test(lower);
  const hasDopahar = /\b(dopahar|dophar|afternoon|noon)\b/i.test(lower);
  const hasShaam = /\b(shaam|sham|shyam|evening)\b/i.test(lower);
  const hasRaat = /\b(raat|rat|night|midnight)\b/i.test(lower);

  const cleanedForTime = lower
    .replace(/\b\d+\s*(?:baar|bar|times|time|din|days)\b/gi, " ")
    .replace(/\b(\d{4}-\d{2}-\d{2})\b/g, " ");

  const explicitTimeRegex =
    /\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(am|a\.m\.|pm|p\.m\.|baje|bje|o'clock)?\b/i;

  const match = cleanedForTime.match(explicitTimeRegex);

  if (
    match &&
    (match[2] !== undefined ||
      match[3] !== undefined ||
      hasSubah ||
      hasDopahar ||
      hasShaam ||
      hasRaat)
  ) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiemToken = (match[3] || "").toLowerCase().replace(/\./g, "");

    if (meridiemToken === "pm") {
      if (hour < 12) hour += 12;
    } else if (meridiemToken === "am") {
      if (hour === 12) hour = 0;
    } else if (hour <= 12) {
      if (hasSubah) {
        if (hour === 12) hour = 0;
      } else if (hasDopahar) {
        if (hour >= 1 && hour <= 11) hour += 12;
      } else if (hasShaam) {
        if (hour < 12) hour += 12;
      } else if (hasRaat) {
        if (hour === 12) {
          hour = 0;
        } else if (hour >= 5 && hour <= 11) {
          hour += 12;
        }
        // Raat 1..4 -> 01:00..04:00 (AM)
      }
    }

    const hh24 = String(hour).padStart(2, "0");
    const mm24 = String(minute).padStart(2, "0");
    const time24 = `${hh24}:${mm24}`;
    return {
      reminder_enabled: true,
      reminder_time: time24,
      reminder_label_12h: format12HourAmPm(time24)
    };
  }

  if (hasSubah) {
    return { reminder_enabled: true, reminder_time: "07:30", reminder_label_12h: "07:30 AM" };
  }
  if (hasDopahar) {
    return { reminder_enabled: true, reminder_time: "14:00", reminder_label_12h: "02:00 PM" };
  }
  if (hasShaam) {
    return { reminder_enabled: true, reminder_time: "18:30", reminder_label_12h: "06:30 PM" };
  }
  if (hasRaat) {
    return { reminder_enabled: true, reminder_time: "21:30", reminder_label_12h: "09:30 PM" };
  }

  return { reminder_enabled: false, reminder_time: null, reminder_label_12h: null };
}

function resolveTargetDateFromTranscript(rawTranscript, todayStr) {
  const lower = String(rawTranscript || "").toLowerCase();

  const isoMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return { targetDate: isoMatch[1], dateLabel: isoMatch[1] };
  }

  if (/\b(parso|parson|day\s+before\s+yesterday)\b/i.test(lower)) {
    const d = addDays(todayStr, -2);
    return { targetDate: d, dateLabel: `2 days ago (${d})` };
  }

  if (/\b(kal|yesterday)\b/i.test(lower)) {
    const d = addDays(todayStr, -1);
    return { targetDate: d, dateLabel: `Yesterday (${d})` };
  }

  const daysAgoMatch = lower.match(/\b(\d)\s*(?:din\s*pehle|days?\s*ago)\b/i);
  if (daysAgoMatch) {
    const delta = Math.min(7, Math.max(1, parseInt(daysAgoMatch[1], 10)));
    const d = addDays(todayStr, -delta);
    return { targetDate: d, dateLabel: `${delta} days ago (${d})` };
  }

  for (const w of WEEKDAY_TOKENS) {
    if (w.tokens.some((tk) => new RegExp(`\\b${tk}\\b`, "i").test(lower))) {
      for (let offset = 0; offset <= 7; offset++) {
        const candidate = addDays(todayStr, -offset);
        if (getIsoWeekday(candidate) === w.idx) {
          return {
            targetDate: candidate,
            dateLabel: offset === 0 ? `Today (${candidate})` : `${w.tokens[0].toUpperCase()} (${candidate})`
          };
        }
      }
    }
  }

  return { targetDate: todayStr, dateLabel: `Today (${todayStr})` };
}

function extractCleanHabitTitle(rawTranscript) {
  let text = String(rawTranscript || "").trim();
  const hadMorning = /\b(subah|subha|morning)\b/i.test(text);
  const hadEvening = /\b(shaam|sham|evening)\b/i.test(text);

  const fillerPatterns = [
    /\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(am|a\.m\.|pm|p\.m\.|baje|bje|o'clock)\b/gi,
    /\b(ye\s+add\s+kr\s*do\s+task|ye\s+task\s+add\s+kr\s*do|add\s+kr\s*do\s+task|task\s+add\s+kr\s*do)\b/gi,
    /\b(add\s+kar\s*do|add\s+kr\s*do|add\s+kardo|add\s+karo|jod\s+do|bna\s+do|bana\s+do)\b/gi,
    /\b(please\s+add|add\s+a\s+new\s+habit|add\s+new\s+task|add\s+task|create\s+task|add\s+habit|create\s+habit|new\s+task)\b/gi,
    /\b(roj\s+subah|roz\s+subah|daily\s+morning|every\s+morning)\b/gi,
    /\b(roj|roz|daily|everyday|every\s+day|har\s+roj|har\s+din)\b/gi,
    /\b(monday|mon|somwar|tuesday|tue|mangalwar|wednesday|wed|budhwar|thursday|thu|guruwar|friday|fri|shukrawar|saturday|sat|shaniwar|sunday|sun|raviwar)\b/gi,
    /\b(ko|ka|ki|ke|on|every|at)\b/gi,
    /\b(krna\s+hai|karna\s+hai|krna\s+h|karna\s+h|krni\s+hai|karni\s+hai|jana\s+hai|jana\s+h|padhna\s+hai|lena\s+hai)\b/gi,
    /\b(mujhe|mere\s+ko|mera|ek|ye|yeh|task|habit|kaam|for\s+me|to\s+my\s+list)\b/gi,
    /\b(subah|subha|shaam|sham|shyam|raat|rat|dopahar|dophar|savere|morning|afternoon|evening|night)\b/gi
  ];

  for (const pat of fillerPatterns) {
    text = text.replace(pat, " ");
  }

  text = text.replace(/[^\w\s\u0900-\u097F-]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) text = "Daily Task";

  const words = text.split(" ").filter(Boolean);
  if (words.length === 1 && hadMorning && words[0].toLowerCase() === "brush") {
    return "Morning Brush";
  }
  if (words.length === 1 && hadEvening && words[0].toLowerCase() === "walk") {
    return "Evening Walk";
  }

  return toTitleCase(text).slice(0, 75);
}

function extractTargetHabitKeyword(rawTranscript) {
  let text = String(rawTranscript || "").toLowerCase();
  const fillers = [
    /\b(\d{4}-\d{2}-\d{2})\b/gi,
    /\b(complete\s+ho\s+gya|complete\s+ho\s+gaya|pura\s+ho\s+gya|poora\s+ho\s+gaya)\b/gi,
    /\b(ho\s+gya\s+hai|ho\s+gaya\s+hai|ho\s+gya\s+h|ho\s+gya|ho\s+gaya|hogya|hogaya)\b/gi,
    /\b(kr\s+liya|kar\s+liya|kr\s+diya|kar\s+diya|finish\s+ho\s+gya)\b/gi,
    /\b(mark\s+as\s+done|mark\s+done|is\s+done|completed|complete|done|finished|check\s+off|tick\s+kr\s+do)\b/gi,
    /\b(hata\s+do|hta\s+do|mitao|mita\s+do|delete\s+kr\s+do|delete\s+kar\s+do|remove\s+kr\s+do|remove\s+kar\s+do|delete|remove|drop|cancel)\b/gi,
    /\b(monday|mon|somwar|tuesday|tue|mangalwar|wednesday|wed|budhwar|thursday|thu|guruwar|friday|fri|shukrawar|saturday|sat|shaniwar|sunday|sun|raviwar)\b/gi,
    /\b(aaj\s+ka|kal\s+ka|parso\s+ka|parson\s+ka|us\s+din\s+ka|kal|parso|yesterday|today's|today|mera|मेरा|मेरी|wala|wali|task|habit|kaam|on|for|ka|ki|ke)\b/gi
  ];
  for (const pat of fillers) {
    text = text.replace(pat, " ");
  }
  return text.replace(/[^\w\s\u0900-\u097F]/g, " ").replace(/\s+/g, " ").trim();
}

function findBestMatchingHabit(keyword, habitsList) {
  const kw = String(keyword || "").toLowerCase().trim();
  const kwTokens = kw.split(/\s+/).filter((t) => t.length >= 2);
  let bestHabit = null;
  let bestScore = 0;

  for (const h of habitsList || []) {
    const hNameLower = String(h.name || "").toLowerCase();
    let score = 0;
    if (kw && hNameLower.includes(kw)) score += 12;
    for (const tk of kwTokens) {
      if (hNameLower.includes(tk)) score += 5;
      if (String(h.description || "").toLowerCase().includes(tk)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestHabit = h;
    }
  }
  return bestHabit;
}

function classifyAiCommand(transcript, existingHabits = [], todayStr = "2026-10-27") {
  const clean = String(transcript || "").trim();
  const lower = clean.toLowerCase();
  const activeHabits = (existingHabits || []).filter((h) => !h.is_archived);

  const isDeleteIntent = /\b(hata\s*do|hta\s*do|delete|remove|mita\s*do)\b/i.test(lower);
  if (isDeleteIntent) {
    const keyword = extractTargetHabitKeyword(clean);
    const matchedHabit = findBestMatchingHabit(keyword, existingHabits);
    return {
      intent: "delete_habit",
      keyword: keyword || clean,
      matchedHabit
    };
  }

  const isCompleteIntent =
    /\b(ho\s*gya|ho\s*gaya|hogya|hogaya|kar\s*liya|kr\s*liya|complete\s*ho|pura\s*ho|mark\s+.*done|is\s+done|completed|done|check\s*off|tick\s*kr)\b/i.test(
      lower
    ) && !/\b(add\s+kr|add\s+kar|add\s+task|bna\s+do|bana\s+do)\b/i.test(lower);

  if (isCompleteIntent) {
    const keyword = extractTargetHabitKeyword(clean);
    const matchedHabit = findBestMatchingHabit(keyword, activeHabits);
    const { targetDate, dateLabel } = resolveTargetDateFromTranscript(clean, todayStr);
    return {
      intent: "complete_habit",
      keyword: keyword || clean,
      matchedHabit,
      targetDate,
      dateLabel
    };
  }

  const title = extractCleanHabitTitle(clean);
  const schedule = parseScheduleFromTranscript(lower);
  const reminder = parseReminderFromTranscript(clean);
  const { icon, color } = inferIconAndColor(title + " " + lower);

  return {
    intent: "create_habit",
    reminder_label_12h: reminder.reminder_label_12h,
    habitPayload: {
      name: title,
      description: `Added via AI Voice/Text Assistant: "${clean}"`,
      icon,
      color,
      schedule_type: schedule.schedule_type,
      schedule_days: schedule.schedule_days,
      target_per_week: schedule.target_per_week,
      reminder_enabled: reminder.reminder_enabled,
      reminder_time: reminder.reminder_time
    }
  };
}

module.exports = {
  classifyAiCommand,
  extractCleanHabitTitle,
  resolveTargetDateFromTranscript,
  parseReminderFromTranscript,
  format12HourAmPm,
  inferIconAndColor
};
