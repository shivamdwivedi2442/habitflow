/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
require("../utils/envLoader");
const fs = require("fs");
const path = require("path");

function isValidSupabaseConfig() {
  if (process.env.NODE_ENV === "test") return false;
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();
  return (
    url.startsWith("https://") &&
    !url.includes("[YOUR-PROJECT-REF]") &&
    key.length > 20 &&
    !key.includes("your-supabase-")
  );
}

function isValidPostgresUrl() {
  if (process.env.NODE_ENV === "test") return false;
  const conn = (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "").trim();
  return (
    conn.startsWith("postgres") &&
    !conn.includes("[YOUR-PASSWORD]") &&
    !conn.includes("[YOUR-PROJECT-REF]")
  );
}

let pgPool = null;
if (isValidPostgresUrl()) {
  try {
    const { Pool } = require("pg");
    const connStr = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    pgPool = new Pool({
      connectionString: connStr,
      ssl: connStr.includes("supabase.co") ? { rejectUnauthorized: false } : false
    });
  } catch {
    pgPool = null;
  }
}

async function supabaseRest(tableAndQuery, { method = "GET", body = null, prefer = "return=representation" } = {}) {
  const baseUrl = process.env.SUPABASE_URL.replace(/\/+$/, "");
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const headers = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Prefer: prefer
  };
  const res = await fetch(`${baseUrl}/rest/v1/${tableAndQuery}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Supabase REST error (${res.status}): ${errText}`);
    err.statusCode = res.status;
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

let storePath =
  process.env.LOCAL_DB_PATH ||
  path.join(__dirname, "..", "..", "data", "habitflow_store.json");

function setStorePath(newPath) {
  storePath = newPath;
}

function getStorePath() {
  return storePath;
}

function defaultEmptyState() {
  return {
    seq: { users: 0, habits: 0, checkins: 0, otp_codes: 0, ai_logs: 0 },
    users: [],
    habits: [],
    checkins: [],
    otp_codes: [],
    ai_logs: []
  };
}

function ensureStoreLoaded() {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(storePath)) {
    const initial = defaultEmptyState();
    fs.writeFileSync(storePath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    parsed.seq = Object.assign(
      { users: 0, habits: 0, checkins: 0, otp_codes: 0, ai_logs: 0 },
      parsed.seq || {}
    );
    parsed.users = parsed.users || [];
    parsed.habits = parsed.habits || [];
    parsed.checkins = parsed.checkins || [];
    parsed.otp_codes = parsed.otp_codes || [];
    parsed.ai_logs = parsed.ai_logs || [];
    return parsed;
  } catch {
    const fallback = defaultEmptyState();
    fs.writeFileSync(storePath, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

function saveStore(state) {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpFile = `${storePath}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmpFile, storePath);
}

function publicUserFields(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    timezone: u.timezone || "Asia/Kolkata",
    avatar_url: u.avatar_url || "",
    bio: u.bio || "Full-Stack Developer & Consistency Builder",
    is_verified: u.is_verified !== undefined ? Boolean(u.is_verified) : true,
    created_at: u.created_at
  };
}


async function ensurePgColumnsIfPool() {
  if (!pgPool) return;
  try {
    await pgPool.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio VARCHAR(240) NOT NULL DEFAULT 'Full-Stack Developer & Consistency Builder';
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE;
      NOTIFY pgrst, 'reload schema';
    `);
  } catch {
    // Ignore if pgPool is not connected
  }
}
ensurePgColumnsIfPool();

const db = {
  isPostgres() {
    return Boolean(pgPool) || isValidSupabaseConfig();
  },

  getStorageModeLabel() {
    if (isValidSupabaseConfig()) return "Supabase Cloud (REST + PostgreSQL)";
    if (pgPool) return "PostgreSQL Direct Pool (Supabase)";
    return "Local Embedded Store (Set SUPABASE_URL in .env for Cloud)";
  },

  async resetAll() {
    if (isValidSupabaseConfig()) {
      await supabaseRest("ai_logs?id=gt.0", { method: "DELETE" });
      await supabaseRest("otp_codes?id=gt.0", { method: "DELETE" });
      await supabaseRest("checkins?id=gt.0", { method: "DELETE" });
      await supabaseRest("habits?id=gt.0", { method: "DELETE" });
      await supabaseRest("users?id=gt.0", { method: "DELETE" });
      return;
    }
    if (pgPool) {
      await pgPool.query(
        "TRUNCATE TABLE ai_logs, otp_codes, checkins, habits, users RESTART IDENTITY CASCADE;"
      );
      return;
    }
    saveStore(defaultEmptyState());
  },

  async countUsers() {
    if (isValidSupabaseConfig()) {
      const rows = await supabaseRest("users?select=id");
      return rows.length;
    }
    if (pgPool) {
      const { rows } = await pgPool.query("SELECT COUNT(*)::int AS c FROM users;");
      return rows[0].c;
    }
    const st = ensureStoreLoaded();
    return st.users.length;
  },

  async findUserByEmail(email) {
    const clean = String(email || "").toLowerCase();
    if (isValidSupabaseConfig()) {
      const rows = await supabaseRest(`users?email=eq.${encodeURIComponent(clean)}&limit=1`);
      return rows[0] || null;
    }
    if (pgPool) {
      const { rows } = await pgPool.query("SELECT * FROM users WHERE email = $1 LIMIT 1;", [clean]);
      return rows[0] || null;
    }
    const st = ensureStoreLoaded();
    return st.users.find((u) => u.email === clean) || null;
  },

  async findUserById(userId) {
    const id = Number(userId);
    if (isValidSupabaseConfig()) {
      const rows = await supabaseRest(`users?id=eq.${id}&limit=1`);
      return publicUserFields(rows[0] || null);
    }
    if (pgPool) {
      const { rows } = await pgPool.query(
        "SELECT id, email, name, timezone, avatar_url, bio, is_verified, created_at FROM users WHERE id = $1 LIMIT 1;",
        [id]
      );
      return rows[0] || null;
    }
    const st = ensureStoreLoaded();
    const u = st.users.find((x) => x.id === id);
    return publicUserFields(u);
  },

  async createUser({
    email,
    name,
    password_hash,
    timezone = "Asia/Kolkata",
    avatar_url = "",
    bio = "Full-Stack Developer & Consistency Builder",
    is_verified = true,
    created_at = null
  }) {
    const cleanEmail = String(email).toLowerCase();
    const nowIso = created_at || new Date().toISOString();
    if (isValidSupabaseConfig()) {
      try {
        const rows = await supabaseRest("users", {
          method: "POST",
          body: {
            email: cleanEmail,
            name,
            password_hash,
            timezone,
            avatar_url,
            bio,
            is_verified: Boolean(is_verified),
            created_at: nowIso
          }
        });
        return publicUserFields(rows[0]);
      } catch (err) {
        if (String(err.message).includes("PGRST204")) {
          const rows = await supabaseRest("users", {
            method: "POST",
            body: {
              email: cleanEmail,
              name,
              password_hash,
              timezone,
              created_at: nowIso
            }
          });
          return publicUserFields(Object.assign({}, rows[0], { avatar_url, bio, is_verified }));
        }
        throw err;
      }
    }
    if (pgPool) {
      const { rows } = await pgPool.query(
        `INSERT INTO users (email, name, password_hash, timezone, avatar_url, bio, is_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, email, name, timezone, avatar_url, bio, is_verified, created_at;`,
        [cleanEmail, name, password_hash, timezone, avatar_url, bio, Boolean(is_verified), nowIso]
      );
      return rows[0];
    }
    const st = ensureStoreLoaded();
    if (st.users.some((u) => u.email === cleanEmail)) {
      const err = new Error("Duplicate email");
      err.code = "23505";
      throw err;
    }
    st.seq.users += 1;
    const newUser = {
      id: st.seq.users,
      email: cleanEmail,
      name,
      password_hash,
      timezone: timezone || "Asia/Kolkata",
      avatar_url: avatar_url || "",
      bio: bio || "Full-Stack Developer & Consistency Builder",
      is_verified: Boolean(is_verified),
      created_at: nowIso
    };
    st.users.push(newUser);
    saveStore(st);
    return publicUserFields(newUser);
  },

  async updateUserTimezone(userId, timezone) {
    const id = Number(userId);
    if (isValidSupabaseConfig()) {
      await supabaseRest(`users?id=eq.${id}`, {
        method: "PATCH",
        body: { timezone }
      });
      return;
    }
    if (pgPool) {
      await pgPool.query("UPDATE users SET timezone = $1 WHERE id = $2;", [timezone, id]);
      return;
    }
    const st = ensureStoreLoaded();
    const u = st.users.find((x) => x.id === id);
    if (u) {
      u.timezone = timezone;
      saveStore(st);
    }
  },

  async updateUserProfile(userId, { name, bio, timezone, avatar_url }) {
    const id = Number(userId);
    if (isValidSupabaseConfig()) {
      const patch = {};
      if (name !== undefined) patch.name = name;
      if (bio !== undefined) patch.bio = bio;
      if (timezone !== undefined) patch.timezone = timezone;
      if (avatar_url !== undefined) patch.avatar_url = avatar_url;
      try {
        const rows = await supabaseRest(`users?id=eq.${id}`, {
          method: "PATCH",
          body: patch
        });
        return publicUserFields(rows[0] || null);
      } catch (err) {
        if (String(err.message).includes("PGRST204")) {
          const fallbackPatch = {};
          if (name !== undefined) fallbackPatch.name = name;
          if (timezone !== undefined) fallbackPatch.timezone = timezone;
          const rows = await supabaseRest(`users?id=eq.${id}`, {
            method: "PATCH",
            body: fallbackPatch
          });
          return publicUserFields(Object.assign({}, rows[0] || {}, patch));
        }
        throw err;
      }
    }
    if (pgPool) {
      const { rows } = await pgPool.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             bio = COALESCE($2, bio),
             timezone = COALESCE($3, timezone),
             avatar_url = COALESCE($4, avatar_url)
         WHERE id = $5
         RETURNING id, email, name, timezone, avatar_url, bio, is_verified, created_at;`,
        [name, bio, timezone, avatar_url, id]
      );
      return rows[0] || null;
    }
    const st = ensureStoreLoaded();
    const u = st.users.find((x) => x.id === id);
    if (!u) return null;
    if (name !== undefined) u.name = name;
    if (bio !== undefined) u.bio = bio;
    if (timezone !== undefined) u.timezone = timezone;
    if (avatar_url !== undefined) u.avatar_url = avatar_url;
    saveStore(st);
    return publicUserFields(u);
  },

  async markUserVerified(email) {
    const clean = String(email || "").toLowerCase();
    if (isValidSupabaseConfig()) {
      await supabaseRest(`users?email=eq.${encodeURIComponent(clean)}`, {
        method: "PATCH",
        body: { is_verified: true }
      }).catch(() => {});
      return;
    }
    if (pgPool) {
      await pgPool.query("UPDATE users SET is_verified = TRUE WHERE email = $1;", [clean]);
      return;
    }
    const st = ensureStoreLoaded();
    const u = st.users.find((x) => x.email === clean);
    if (u) {
      u.is_verified = true;
      saveStore(st);
    }
  },

  async createOtpCode({ email, otp_hash, purpose = "auth", expires_at }) {
    const cleanEmail = String(email || "").toLowerCase();
    const nowIso = new Date().toISOString();
    if (isValidSupabaseConfig()) {
      try {
        await supabaseRest(`otp_codes?email=eq.${encodeURIComponent(cleanEmail)}&used=eq.false`, {
        method: "PATCH",
        body: { used: true }
      });
      const rows = await supabaseRest("otp_codes", {
        method: "POST",
        body: {
          email: cleanEmail,
          otp_hash,
          purpose,
          expires_at,
          used: false,
          created_at: nowIso
        }
      });
      return rows[0];
      } catch {
        // Fall through to local store if otp_codes table is not created in Supabase yet
      }
    }
    if (pgPool) {
      await pgPool.query("UPDATE otp_codes SET used = TRUE WHERE email = $1 AND used = FALSE;", [cleanEmail]);
      const { rows } = await pgPool.query(
        `INSERT INTO otp_codes (email, otp_hash, purpose, expires_at, used, created_at)
         VALUES ($1, $2, $3, $4, FALSE, $5) RETURNING *;`,
        [cleanEmail, otp_hash, purpose, expires_at, nowIso]
      );
      return rows[0];
    }
    const st = ensureStoreLoaded();
    for (const rec of st.otp_codes) {
      if (rec.email === cleanEmail && !rec.used) {
        rec.used = true;
      }
    }
    st.seq.otp_codes += 1;
    const item = {
      id: st.seq.otp_codes,
      email: cleanEmail,
      otp_hash,
      purpose,
      expires_at,
      used: false,
      created_at: nowIso
    };
    st.otp_codes.push(item);
    saveStore(st);
    return item;
  },

  async findLatestActiveOtp(email) {
    const cleanEmail = String(email || "").toLowerCase();
    if (isValidSupabaseConfig()) {
      try {
        const rows = await supabaseRest(
          `otp_codes?email=eq.${encodeURIComponent(cleanEmail)}&used=eq.false&order=id.desc&limit=1`
        );
        return rows[0] || null;
      } catch {
        // Fall through to local store
      }
    }
    if (pgPool) {
      const { rows } = await pgPool.query(
        "SELECT * FROM otp_codes WHERE email = $1 AND used = FALSE ORDER BY id DESC LIMIT 1;",
        [cleanEmail]
      );
      return rows[0] || null;
    }
    const st = ensureStoreLoaded();
    const matches = st.otp_codes.filter((r) => r.email === cleanEmail && !r.used);
    return matches.length > 0 ? matches[matches.length - 1] : null;
  },

  async consumeOtpCode(otpId) {
    const id = Number(otpId);
    if (isValidSupabaseConfig()) {
      try {
        await supabaseRest(`otp_codes?id=eq.${id}`, {
          method: "PATCH",
          body: { used: true }
        });
        return;
      } catch {
        // Fall through to local store
      }
    }
    if (pgPool) {
      await pgPool.query("UPDATE otp_codes SET used = TRUE WHERE id = $1;", [id]);
      return;
    }
    const st = ensureStoreLoaded();
    const rec = st.otp_codes.find((r) => r.id === id);
    if (rec) {
      rec.used = true;
      saveStore(st);
    }
  },

  async listHabitsByUser(userId, includeArchived = false) {
    const uid = Number(userId);
    if (isValidSupabaseConfig()) {
      const filter = includeArchived
        ? `habits?user_id=eq.${uid}&order=is_archived.asc,id.asc`
        : `habits?user_id=eq.${uid}&is_archived=eq.false&order=id.asc`;
      return await supabaseRest(filter);
    }
    if (pgPool) {
      const q = includeArchived
        ? "SELECT * FROM habits WHERE user_id = $1 ORDER BY is_archived ASC, id ASC;"
        : "SELECT * FROM habits WHERE user_id = $1 AND is_archived = FALSE ORDER BY id ASC;";
      const { rows } = await pgPool.query(q, [uid]);
      return rows;
    }
    const st = ensureStoreLoaded();
    return st.habits
      .filter((h) => h.user_id === uid && (includeArchived || !h.is_archived))
      .sort((a, b) => Number(a.is_archived) - Number(b.is_archived) || a.id - b.id);
  },

  async findHabitByIdAndUser(habitId, userId) {
    const hid = Number(habitId);
    const uid = Number(userId);
    if (isValidSupabaseConfig()) {
      const rows = await supabaseRest(`habits?id=eq.${hid}&user_id=eq.${uid}&limit=1`);
      return rows[0] || null;
    }
    if (pgPool) {
      const { rows } = await pgPool.query(
        "SELECT * FROM habits WHERE id = $1 AND user_id = $2 LIMIT 1;",
        [hid, uid]
      );
      return rows[0] || null;
    }
    const st = ensureStoreLoaded();
    return st.habits.find((h) => h.id === hid && h.user_id === uid) || null;
  },

  async createHabit({
    user_id,
    name,
    description,
    color,
    icon,
    schedule_type,
    schedule_days,
    target_per_week,
    reminder_time,
    reminder_enabled,
    is_archived = false,
    created_at = null
  }) {
    const nowIso = created_at || new Date().toISOString();
    if (isValidSupabaseConfig()) {
      const rows = await supabaseRest("habits", {
        method: "POST",
        body: {
          user_id: Number(user_id),
          name,
          description: description || "",
          color: color || "#6366f1",
          icon: icon || "bolt",
          schedule_type,
          schedule_days: Array.isArray(schedule_days) ? schedule_days : [],
          target_per_week: Number(target_per_week),
          reminder_time: reminder_time || null,
          reminder_enabled: Boolean(reminder_enabled),
          is_archived: Boolean(is_archived),
          created_at: nowIso
        }
      });
      return rows[0];
    }
    if (pgPool) {
      const { rows } = await pgPool.query(
        `INSERT INTO habits (
           user_id, name, description, color, icon,
           schedule_type, schedule_days, target_per_week,
           reminder_time, reminder_enabled, is_archived, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12)
         RETURNING *;`,
        [
          Number(user_id),
          name,
          description,
          color,
          icon || "bolt",
          schedule_type,
          JSON.stringify(schedule_days || []),
          Number(target_per_week),
          reminder_time,
          Boolean(reminder_enabled),
          Boolean(is_archived),
          nowIso
        ]
      );
      return rows[0];
    }
    const st = ensureStoreLoaded();
    st.seq.habits += 1;
    const habit = {
      id: st.seq.habits,
      user_id: Number(user_id),
      name,
      description: description || "",
      color: color || "#6366f1",
      icon: icon || "bolt",
      schedule_type,
      schedule_days: Array.isArray(schedule_days) ? schedule_days : [],
      target_per_week: Number(target_per_week),
      reminder_time: reminder_time || null,
      reminder_enabled: Boolean(reminder_enabled),
      is_archived: Boolean(is_archived),
      created_at: nowIso
    };
    st.habits.push(habit);
    saveStore(st);
    return habit;
  },

  async updateHabit(habitId, userId, updates) {
    const hid = Number(habitId);
    const uid = Number(userId);
    if (isValidSupabaseConfig()) {
      const rows = await supabaseRest(`habits?id=eq.${hid}&user_id=eq.${uid}`, {
        method: "PATCH",
        body: {
          name: updates.name,
          description: updates.description,
          color: updates.color,
          icon: updates.icon,
          schedule_type: updates.schedule_type,
          schedule_days: updates.schedule_days,
          target_per_week: Number(updates.target_per_week),
          reminder_time: updates.reminder_time,
          reminder_enabled: Boolean(updates.reminder_enabled)
        }
      });
      return rows[0] || null;
    }
    if (pgPool) {
      const { rows } = await pgPool.query(
        `UPDATE habits
         SET name = $1, description = $2, color = $3, icon = $4,
             schedule_type = $5, schedule_days = $6::jsonb, target_per_week = $7,
             reminder_time = $8, reminder_enabled = $9
         WHERE id = $10 AND user_id = $11
         RETURNING *;`,
        [
          updates.name,
          updates.description,
          updates.color,
          updates.icon,
          updates.schedule_type,
          JSON.stringify(updates.schedule_days || []),
          Number(updates.target_per_week),
          updates.reminder_time,
          Boolean(updates.reminder_enabled),
          hid,
          uid
        ]
      );
      return rows[0] || null;
    }
    const st = ensureStoreLoaded();
    const h = st.habits.find((x) => x.id === hid && x.user_id === uid);
    if (!h) return null;
    Object.assign(h, {
      name: updates.name,
      description: updates.description,
      color: updates.color,
      icon: updates.icon,
      schedule_type: updates.schedule_type,
      schedule_days: updates.schedule_days,
      target_per_week: Number(updates.target_per_week),
      reminder_time: updates.reminder_time,
      reminder_enabled: Boolean(updates.reminder_enabled)
    });
    saveStore(st);
    return h;
  },

  async setHabitArchived(habitId, userId, isArchived) {
    const hid = Number(habitId);
    const uid = Number(userId);
    if (isValidSupabaseConfig()) {
      const rows = await supabaseRest(`habits?id=eq.${hid}&user_id=eq.${uid}`, {
        method: "PATCH",
        body: { is_archived: Boolean(isArchived) }
      });
      return rows[0] || null;
    }
    if (pgPool) {
      const { rows } = await pgPool.query(
        "UPDATE habits SET is_archived = $1 WHERE id = $2 AND user_id = $3 RETURNING *;",
        [Boolean(isArchived), hid, uid]
      );
      return rows[0] || null;
    }
    const st = ensureStoreLoaded();
    const h = st.habits.find((x) => x.id === hid && x.user_id === uid);
    if (!h) return null;
    h.is_archived = Boolean(isArchived);
    saveStore(st);
    return h;
  },

  async deleteHabit(habitId, userId) {
    const hid = Number(habitId);
    const uid = Number(userId);
    if (isValidSupabaseConfig()) {
      await supabaseRest(`habits?id=eq.${hid}&user_id=eq.${uid}`, { method: "DELETE" });
      return true;
    }
    if (pgPool) {
      const { rowCount } = await pgPool.query(
        "DELETE FROM habits WHERE id = $1 AND user_id = $2;",
        [hid, uid]
      );
      return rowCount > 0;
    }
    const st = ensureStoreLoaded();
    const idx = st.habits.findIndex((x) => x.id === hid && x.user_id === uid);
    if (idx === -1) return false;
    st.habits.splice(idx, 1);
    st.checkins = st.checkins.filter((c) => c.habit_id !== hid);
    saveStore(st);
    return true;
  },

  async listCheckinsByUser(userId) {
    const uid = Number(userId);
    if (isValidSupabaseConfig()) {
      const rows = await supabaseRest(
        `checkins?user_id=eq.${uid}&select=habit_id,checkin_date,note&order=checkin_date.asc`
      );
      return rows.map((r) => ({
        habit_id: r.habit_id,
        checkin_date: String(r.checkin_date).slice(0, 10),
        note: r.note || ""
      }));
    }
    if (pgPool) {
      const { rows } = await pgPool.query(
        "SELECT habit_id, checkin_date::text AS checkin_date, note FROM checkins WHERE user_id = $1 ORDER BY checkin_date ASC;",
        [uid]
      );
      return rows;
    }
    const st = ensureStoreLoaded();
    return st.checkins
      .filter((c) => c.user_id === uid)
      .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  },

  async listCheckinsByHabit(habitId) {
    const hid = Number(habitId);
    if (isValidSupabaseConfig()) {
      const rows = await supabaseRest(
        `checkins?habit_id=eq.${hid}&select=habit_id,checkin_date,note&order=checkin_date.asc`
      );
      return rows.map((r) => ({
        habit_id: r.habit_id,
        checkin_date: String(r.checkin_date).slice(0, 10),
        note: r.note || ""
      }));
    }
    if (pgPool) {
      const { rows } = await pgPool.query(
        "SELECT habit_id, checkin_date::text AS checkin_date, note FROM checkins WHERE habit_id = $1 ORDER BY checkin_date ASC;",
        [hid]
      );
      return rows;
    }
    const st = ensureStoreLoaded();
    return st.checkins
      .filter((c) => c.habit_id === hid)
      .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  },

  async ensureCheckedIn({ habit_id, user_id, checkin_date, note = "" }) {
    const hid = Number(habit_id);
    const uid = Number(user_id);
    const nowIso = new Date().toISOString();
    if (isValidSupabaseConfig()) {
      const existing = await supabaseRest(
        `checkins?habit_id=eq.${hid}&checkin_date=eq.${checkin_date}&limit=1`
      );
      if (existing.length === 0) {
        await supabaseRest("checkins", {
          method: "POST",
          body: {
            habit_id: hid,
            user_id: uid,
            checkin_date,
            note: note || "",
            created_at: nowIso
          }
        });
      }
      return "checked";
    }
    if (pgPool) {
      await pgPool.query(
        `INSERT INTO checkins (habit_id, user_id, checkin_date, note, created_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (habit_id, checkin_date) DO NOTHING;`,
        [hid, uid, checkin_date, note, nowIso]
      );
      return "checked";
    }
    const st = ensureStoreLoaded();
    const exists = st.checkins.some((c) => c.habit_id === hid && c.checkin_date === checkin_date);
    if (!exists) {
      st.seq.checkins += 1;
      st.checkins.push({
        id: st.seq.checkins,
        habit_id: hid,
        user_id: uid,
        checkin_date,
        note: note || "",
        created_at: nowIso
      });
      saveStore(st);
    }
    return "checked";
  },

  async toggleCheckin({ habit_id, user_id, checkin_date, note = "", created_at = null }) {
    const hid = Number(habit_id);
    const uid = Number(user_id);
    const nowIso = created_at || new Date().toISOString();
    if (isValidSupabaseConfig()) {
      const existing = await supabaseRest(
        `checkins?habit_id=eq.${hid}&checkin_date=eq.${checkin_date}&limit=1`
      );
      if (existing.length > 0) {
        await supabaseRest(`checkins?id=eq.${existing[0].id}`, { method: "DELETE" });
        return "unchecked";
      }
      await supabaseRest("checkins", {
        method: "POST",
        body: {
          habit_id: hid,
          user_id: uid,
          checkin_date,
          note: note || "",
          created_at: nowIso
        }
      });
      return "checked";
    }
    if (pgPool) {
      const existing = await pgPool.query(
        "SELECT id FROM checkins WHERE habit_id = $1 AND checkin_date = $2 LIMIT 1;",
        [hid, checkin_date]
      );
      if (existing.rows.length > 0) {
        await pgPool.query("DELETE FROM checkins WHERE id = $1;", [existing.rows[0].id]);
        return "unchecked";
      }
      await pgPool.query(
        "INSERT INTO checkins (habit_id, user_id, checkin_date, note, created_at) VALUES ($1,$2,$3,$4,$5);",
        [hid, uid, checkin_date, note, nowIso]
      );
      return "checked";
    }
    const st = ensureStoreLoaded();
    const idx = st.checkins.findIndex(
      (c) => c.habit_id === hid && c.checkin_date === checkin_date
    );
    if (idx !== -1) {
      st.checkins.splice(idx, 1);
      saveStore(st);
      return "unchecked";
    }
    st.seq.checkins += 1;
    st.checkins.push({
      id: st.seq.checkins,
      habit_id: hid,
      user_id: uid,
      checkin_date,
      note: note || "",
      created_at: nowIso
    });
    saveStore(st);
    return "checked";
  },

  async bulkInsertCheckins(records) {
    if (!records || records.length === 0) return;
    if (isValidSupabaseConfig()) {
      // Insert in chunks of 100 via Supabase PostgREST
      for (let i = 0; i < records.length; i += 100) {
        const chunk = records.slice(i, i + 100).map((r) => ({
          habit_id: Number(r.habit_id),
          user_id: Number(r.user_id),
          checkin_date: r.checkin_date,
          note: r.note || "",
          created_at: r.created_at || new Date().toISOString()
        }));
        await supabaseRest("checkins", {
          method: "POST",
          body: chunk,
          prefer: "resolution=ignore-duplicates"
        });
      }
      return;
    }
    if (pgPool) {
      for (const r of records) {
        await pgPool.query(
          `INSERT INTO checkins (habit_id, user_id, checkin_date, note, created_at)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (habit_id, checkin_date) DO NOTHING;`,
          [r.habit_id, r.user_id, r.checkin_date, r.note || "", r.created_at || new Date().toISOString()]
        );
      }
      return;
    }
    const st = ensureStoreLoaded();
    const existingKeys = new Set(st.checkins.map((c) => `${c.habit_id}:${c.checkin_date}`));
    for (const r of records) {
      const key = `${r.habit_id}:${r.checkin_date}`;
      if (!existingKeys.has(key)) {
        st.seq.checkins += 1;
        st.checkins.push({
          id: st.seq.checkins,
          habit_id: Number(r.habit_id),
          user_id: Number(r.user_id),
          checkin_date: r.checkin_date,
          note: r.note || "",
          created_at: r.created_at || new Date().toISOString()
        });
        existingKeys.add(key);
      }
    }
    saveStore(st);
  },

  async logAiCommand({ user_id, transcript, intent, habit_id = null, reply }) {
    const uid = Number(user_id);
    const nowIso = new Date().toISOString();
    if (isValidSupabaseConfig()) {
      await supabaseRest("ai_logs", {
        method: "POST",
        body: {
          user_id: uid,
          transcript,
          intent,
          habit_id,
          reply,
          created_at: nowIso
        }
      }).catch(() => {});
      return;
    }
    if (pgPool) {
      await pgPool.query(
        `INSERT INTO ai_logs (user_id, transcript, intent, habit_id, reply, created_at)
         VALUES ($1,$2,$3,$4,$5,$6);`,
        [uid, transcript, intent, habit_id, reply, nowIso]
      );
      return;
    }
    const st = ensureStoreLoaded();
    st.seq.ai_logs += 1;
    st.ai_logs.push({
      id: st.seq.ai_logs,
      user_id: uid,
      transcript,
      intent,
      habit_id,
      reply,
      created_at: nowIso
    });
    saveStore(st);
  }
};

module.exports = {
  db,
  setStorePath,
  getStorePath
};
