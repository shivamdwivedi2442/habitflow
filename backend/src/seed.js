/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
const { db } = require("./db/adapter");
const { hashPassword } = require("./security/securityMiddleware");
const { getUserToday, addDays, getIsoWeekday } = require("./services/streakEngine");

async function seedDatabase(reset = true) {
  if (reset) {
    await db.resetAll();
  }

  const tzKolkata = "Asia/Kolkata";
  const todayStr = getUserToday(tzKolkata);
  const nowIso = new Date().toISOString();

  // 1. Primary Demo Account: Shivam Coder (Asia/Kolkata)
  const shivamUser = await db.createUser({
    email: "shivam@habitflow.dev",
    name: "Shivam Coder",
    password_hash: hashPassword("Shivam@2442"),
    timezone: tzKolkata,
    avatar_url: "avatar_cyber_indigo",
    bio: "Full-Stack & React Native Architect (@shivamdwivedi2442)",
    is_verified: true,
    created_at: `${addDays(todayStr, -185)}T08:00:00Z`
  });

  // 2. Secondary Demo Account: Alex Rivera (America/New_York)
  const alexUser = await db.createUser({
    email: "demo@habitflow.dev",
    name: "Alex Rivera",
    password_hash: hashPassword("DemoPass123!"),
    timezone: "America/New_York",
    avatar_url: "avatar_emerald_neon",
    bio: "Product Engineer & Marathon Runner",
    is_verified: true,
    created_at: `${addDays(todayStr, -120)}T08:00:00Z`
  });

  const habitsSpec = [
    {
      name: "Full-Stack & System Architecture",
      description: "90 mins of deep work on Node.js, PostgreSQL/Supabase, & React Native architecture",
      color: "#6366f1",
      icon: "code",
      schedule_type: "daily",
      schedule_days: [0, 1, 2, 3, 4, 5, 6],
      target_per_week: 7,
      reminder_time: "09:00",
      reminder_enabled: true,
      is_archived: false,
      pattern: "daily_strong"
    },
    {
      name: "Strength & Conditioning (M/W/F)",
      description: "Compound lifts & progressive overload session on Mon, Wed, and Fri",
      color: "#10b981",
      icon: "dumbbell",
      schedule_type: "weekdays",
      schedule_days: [0, 2, 4], // Mon, Wed, Fri
      target_per_week: 3,
      reminder_time: "07:30",
      reminder_enabled: true,
      is_archived: false,
      pattern: "mwf_streak"
    },
    {
      name: "Open Source Commits & PR Reviews",
      description: "Ship production commits on GitHub (@shivamdwivedi2442) 4 times per week",
      color: "#8b5cf6",
      icon: "rocket",
      schedule_type: "times_per_week",
      schedule_days: [],
      target_per_week: 4,
      reminder_time: "20:30",
      reminder_enabled: true,
      is_archived: false,
      pattern: "4x_week"
    },
    {
      name: "Security & Cryptography Deep Dive",
      description: "Audit OWASP vectors, RLS policies & zero-trust auth on Tue/Thu/Sat",
      color: "#f59e0b",
      icon: "shield",
      schedule_type: "weekdays",
      schedule_days: [1, 3, 5], // Tue, Thu, Sat
      target_per_week: 3,
      reminder_time: "21:30",
      reminder_enabled: false,
      is_archived: false,
      pattern: "tts_moderate"
    },
    {
      name: "10k Steps Evening Walk (Archived Demo)",
      description: "Active recovery walk — archived to demonstrate 100% history preservation",
      color: "#ec4899",
      icon: "flame",
      schedule_type: "daily",
      schedule_days: [0, 1, 2, 3, 4, 5, 6],
      target_per_week: 7,
      reminder_time: null,
      reminder_enabled: false,
      is_archived: true,
      pattern: "archived_history"
    }
  ];

  const allCheckins = [];

  for (const spec of habitsSpec) {
    const habit = await db.createHabit({
      user_id: shivamUser.id,
      name: spec.name,
      description: spec.description,
      color: spec.color,
      icon: spec.icon,
      schedule_type: spec.schedule_type,
      schedule_days: spec.schedule_days,
      target_per_week: spec.target_per_week,
      reminder_time: spec.reminder_time,
      reminder_enabled: spec.reminder_enabled,
      is_archived: spec.is_archived,
      created_at: `${addDays(todayStr, -180)}T09:00:00Z`
    });

    for (let daysAgo = 180; daysAgo >= 0; daysAgo--) {
      const dStr = addDays(todayStr, -daysAgo);
      const wkday = getIsoWeekday(dStr);
      const pat = spec.pattern;
      let shouldCheck = false;

      if (pat === "daily_strong") {
        if (daysAgo <= 17) shouldCheck = true;
        else if (daysAgo === 18) shouldCheck = false;
        else if (daysAgo % 7 !== 6 || daysAgo % 14 === 0) shouldCheck = true;
      } else if (pat === "mwf_streak") {
        if ([0, 2, 4].includes(wkday)) {
          if (daysAgo <= 45) shouldCheck = true;
          else if (Math.floor(daysAgo / 7) % 4 !== 2) shouldCheck = true;
        }
      } else if (pat === "4x_week") {
        if ([0, 1, 3, 5].includes(wkday)) {
          if (daysAgo <= 35) shouldCheck = true;
          else if (Math.floor(daysAgo / 7) % 3 !== 1) shouldCheck = true;
        }
      } else if (pat === "tts_moderate") {
        if ([1, 3, 5].includes(wkday)) {
          if (daysAgo === 0) shouldCheck = false; // Leave today ready to check off in UI!
          else if (daysAgo <= 21) shouldCheck = true;
          else if (Math.floor(daysAgo / 7) % 2 === 0) shouldCheck = true;
        }
      } else if (pat === "archived_history") {
        if (daysAgo >= 15 && daysAgo <= 90 && daysAgo % 3 !== 0) {
          shouldCheck = true;
        }
      }

      if (shouldCheck) {
        allCheckins.push({
          habit_id: habit.id,
          user_id: shivamUser.id,
          checkin_date: dStr,
          note: "Completed on schedule",
          created_at: nowIso
        });
      }
    }
  }

  // Secondary Demo Account Habit
  const alexHabit = await db.createHabit({
    user_id: alexUser.id,
    name: "Morning Hydration & Mobility",
    description: "500ml water + 10 min thoracic mobility",
    color: "#06b6d4",
    icon: "droplet",
    schedule_type: "daily",
    schedule_days: [0, 1, 2, 3, 4, 5, 6],
    target_per_week: 7,
    reminder_time: "08:00",
    reminder_enabled: true,
    is_archived: false,
    created_at: nowIso
  });

  for (let daysAgo = 14; daysAgo >= 1; daysAgo--) {
    allCheckins.push({
      habit_id: alexHabit.id,
      user_id: alexUser.id,
      checkin_date: addDays(todayStr, -daysAgo),
      note: "",
      created_at: nowIso
    });
  }

  await db.bulkInsertCheckins(allCheckins);
}

if (require.main === module) {
  seedDatabase(true)
    .then(() => {
      console.log(
        "HabitFlow v2.0 database seeded with 6 months of demo data for Shivam Coder (shivam@habitflow.dev)."
      );
    })
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
