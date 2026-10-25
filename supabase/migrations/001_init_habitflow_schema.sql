/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    supabase_uid UUID UNIQUE DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    avatar_url TEXT NOT NULL DEFAULT '',
    bio VARCHAR(240) NOT NULL DEFAULT 'Full-Stack Developer & Consistency Builder',
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add v2.0 - v5.0 columns if `public.users` was created with an older migration!
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio VARCHAR(240) NOT NULL DEFAULT 'Full-Stack Developer & Consistency Builder';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. OTP Verification Codes Table
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_hash TEXT NOT NULL,
    purpose VARCHAR(32) NOT NULL DEFAULT 'auth',
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Habits / Daily Tasks Table
CREATE TABLE IF NOT EXISTS public.habits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL CHECK (char_length(trim(name)) >= 2),
    description VARCHAR(280) NOT NULL DEFAULT '',
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    icon VARCHAR(32) NOT NULL DEFAULT 'bolt',
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekdays', 'times_per_week')),
    schedule_days JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_per_week SMALLINT NOT NULL DEFAULT 7 CHECK (target_per_week BETWEEN 1 AND 7),
    reminder_time VARCHAR(5) DEFAULT NULL,
    reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure icon column can hold 32-char SVG icon names like 'dumbbell' or 'sparkle'
ALTER TABLE public.habits ALTER COLUMN icon TYPE VARCHAR(32);

-- 4. Check-ins Table
CREATE TABLE IF NOT EXISTS public.checkins (
    id SERIAL PRIMARY KEY,
    habit_id INTEGER NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    note VARCHAR(200) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_habit_checkin_date UNIQUE (habit_id, checkin_date)
);

-- 5. AI Voice & Text Command Audit Logs
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    intent VARCHAR(32) NOT NULL,
    habit_id INTEGER REFERENCES public.habits(id) ON DELETE SET NULL,
    reply TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_habits_user_archived ON public.habits(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_checkins_habit_date ON public.checkins(habit_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON public.checkins(user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_otp_email ON public.otp_codes(email, used);

-- Reload Supabase PostgREST Schema Cache immediately so new columns are recognized!
NOTIFY pgrst, 'reload schema';
