-- Weight log table for cross-device weight tracking
CREATE TABLE IF NOT EXISTS weight_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  weight_kg  NUMERIC(5,2) NOT NULL,
  note       TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE weight_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weight_log: select own" ON weight_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "weight_log: insert own" ON weight_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weight_log: update own" ON weight_log
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "weight_log: delete own" ON weight_log
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weight_log_user_date ON weight_log (user_id, date);
