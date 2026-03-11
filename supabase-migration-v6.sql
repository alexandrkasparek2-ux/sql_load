-- Migration v6: supplement_log table
-- Tracks daily supplement intake per user

CREATE TABLE IF NOT EXISTS supplement_log (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  supplement_id    TEXT        NOT NULL,
  supplement_name  TEXT        NOT NULL,
  dose             NUMERIC     NOT NULL DEFAULT 0,
  unit             TEXT        NOT NULL DEFAULT 'mg',
  taken            BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one row per supplement per user per day
CREATE UNIQUE INDEX IF NOT EXISTS supplement_log_uq
  ON supplement_log(user_id, date, supplement_id);

-- Row-level security
ALTER TABLE supplement_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own supplement_log" ON supplement_log;

CREATE POLICY "Users can manage own supplement_log"
  ON supplement_log
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
