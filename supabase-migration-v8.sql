-- Migration v8: synced user settings across devices
-- Stores per-user app settings, custom foods, saved meals, goals, and weight log

CREATE TABLE IF NOT EXISTS user_settings (
  id         UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        TEXT        NOT NULL,
  value      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_key
  ON user_settings (user_id, key);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings: select own" ON user_settings;
CREATE POLICY "user_settings: select own"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_settings: insert own" ON user_settings;
CREATE POLICY "user_settings: insert own"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_settings: update own" ON user_settings;
CREATE POLICY "user_settings: update own"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_settings: delete own" ON user_settings;
CREATE POLICY "user_settings: delete own"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_user_settings_updated_at ON user_settings;
CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
