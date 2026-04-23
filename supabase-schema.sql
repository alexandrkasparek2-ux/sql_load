-- ============================================================
-- CycloFuel – Supabase Database Schema
-- Run this in your Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- profiles: one row per user, linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weight    NUMERIC(5,2)  NOT NULL DEFAULT 70,
  height    NUMERIC(5,1)  NOT NULL DEFAULT 175,
  age       INTEGER       NOT NULL DEFAULT 30,
  gender    TEXT          NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- training_days: one row per user per calendar date
CREATE TABLE IF NOT EXISTS training_days (
  id            UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          DATE        NOT NULL,
  training_type TEXT        NOT NULL DEFAULT 'rest'
                            CHECK (training_type IN ('rest','light','medium','hard','race')),
  ride_hours    NUMERIC(4,2) NOT NULL DEFAULT 0,
  water_glasses INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- food_entries: individual food log items
CREATE TABLE IF NOT EXISTS food_entries (
  id         UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE         NOT NULL,
  meal_slot  TEXT         NOT NULL,
  food_id    TEXT         NOT NULL,
  food_name  TEXT         NOT NULL,
  grams      NUMERIC(6,1) NOT NULL,
  kcal       NUMERIC(7,1) NOT NULL DEFAULT 0,
  carbs      NUMERIC(6,1) NOT NULL DEFAULT 0,
  protein    NUMERIC(6,1) NOT NULL DEFAULT 0,
  fat        NUMERIC(6,1) NOT NULL DEFAULT 0,
  -- micronutrients
  na         NUMERIC(8,1) NOT NULL DEFAULT 0,   -- sodium mg
  k          NUMERIC(8,1) NOT NULL DEFAULT 0,   -- potassium mg
  mg         NUMERIC(7,1) NOT NULL DEFAULT 0,   -- magnesium mg
  ca         NUMERIC(8,1) NOT NULL DEFAULT 0,   -- calcium mg
  fe         NUMERIC(6,2) NOT NULL DEFAULT 0,   -- iron mg
  vit_c      NUMERIC(7,1) NOT NULL DEFAULT 0,   -- vitamin C mg
  vit_d      NUMERIC(6,2) NOT NULL DEFAULT 0,   -- vitamin D µg
  b12        NUMERIC(6,2) NOT NULL DEFAULT 0,   -- vitamin B12 µg
  omega3     NUMERIC(8,1) NOT NULL DEFAULT 0,   -- omega-3 mg
  zn         NUMERIC(6,2) NOT NULL DEFAULT 0,   -- zinc mg
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- user_settings: synced app settings and user-defined lists
CREATE TABLE IF NOT EXISTS user_settings (
  id         UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        TEXT        NOT NULL,
  value      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, key)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_training_days_user_date
  ON training_days (user_id, date);

CREATE INDEX IF NOT EXISTS idx_food_entries_user_date
  ON food_entries (user_id, date);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_key
  ON user_settings (user_id, key);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles: select own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: insert own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- training_days
CREATE POLICY "training_days: select own"
  ON training_days FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "training_days: insert own"
  ON training_days FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "training_days: update own"
  ON training_days FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "training_days: delete own"
  ON training_days FOR DELETE
  USING (auth.uid() = user_id);

-- food_entries
CREATE POLICY "food_entries: select own"
  ON food_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "food_entries: insert own"
  ON food_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "food_entries: update own"
  ON food_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "food_entries: delete own"
  ON food_entries FOR DELETE
  USING (auth.uid() = user_id);

-- user_settings
CREATE POLICY "user_settings: select own"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_settings: insert own"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings: update own"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_settings: delete own"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create profile after signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, weight, height, age, gender)
  VALUES (NEW.id, 70, 175, 30, 'male')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists to allow re-running this script
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- HELPER: updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_training_days_updated_at ON training_days;
CREATE TRIGGER set_training_days_updated_at
  BEFORE UPDATE ON training_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_settings_updated_at ON user_settings;
CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
