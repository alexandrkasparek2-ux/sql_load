-- ============================================================
-- CycloFuel – Migrace v9: Periodizovaná výživa
-- Spusť v Supabase SQL Editoru (Database → SQL Editor)
-- ============================================================

-- ── 1. Rozšíření profiles o potřebná pole ─────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ftp_watts                 INTEGER        DEFAULT 250,
  ADD COLUMN IF NOT EXISTS caloric_deficit_offseason NUMERIC(5,0)   DEFAULT 0
    CHECK (caloric_deficit_offseason >= -300 AND caloric_deficit_offseason <= 0),
  ADD COLUMN IF NOT EXISTS target_weight_kg          NUMERIC(5,2)   DEFAULT NULL;

-- ── 2. Tabulka závodů ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS race_events (
  id                       UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                     TEXT        NOT NULL,
  race_date                DATE        NOT NULL,
  distance_km              NUMERIC(7,1) DEFAULT NULL,
  elevation_m              INTEGER      DEFAULT NULL,
  estimated_duration_hours NUMERIC(4,1) DEFAULT NULL,
  race_type                TEXT        NOT NULL DEFAULT 'B'
                           CHECK (race_type IN ('A', 'B', 'C')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_race_events_user_date
  ON race_events (user_id, race_date);

-- ── 3. Tabulka denních nutričních cílů ────────────────────
CREATE TABLE IF NOT EXISTS nutrition_targets (
  id               UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  phase            TEXT        NOT NULL DEFAULT 'off_season'
                   CHECK (phase IN ('off_season','build_1','build_2','pre_race','race_week','race_day','post_race')),
  target_kcal      NUMERIC(7,1) NOT NULL DEFAULT 0,
  target_carbs_g   NUMERIC(6,1) NOT NULL DEFAULT 0,
  target_protein_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  target_fat_g     NUMERIC(6,1) NOT NULL DEFAULT 0,
  actual_kcal      NUMERIC(7,1)  DEFAULT NULL,
  actual_carbs_g   NUMERIC(6,1)  DEFAULT NULL,
  actual_protein_g NUMERIC(6,1)  DEFAULT NULL,
  actual_fat_g     NUMERIC(6,1)  DEFAULT NULL,
  compliance_score NUMERIC(4,1)  DEFAULT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_nutrition_targets_user_date
  ON nutrition_targets (user_id, date);

-- ── 4. Tabulka denní tréninkové zátěže ───────────────────
CREATE TABLE IF NOT EXISTS training_load_daily (
  id           UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE        NOT NULL,
  tss          NUMERIC(6,1) NOT NULL DEFAULT 0,
  ctl          NUMERIC(5,1)  DEFAULT NULL,  -- Chronic Training Load (fitness)
  atl          NUMERIC(5,1)  DEFAULT NULL,  -- Acute Training Load (fatigue)
  tsb          NUMERIC(5,1)  DEFAULT NULL,  -- Training Stress Balance (forma)
  training_kj  NUMERIC(7,1)  DEFAULT NULL,  -- kJ výdej z Garminu
  source       TEXT        NOT NULL DEFAULT 'manual'
               CHECK (source IN ('garmin', 'manual', 'estimated', 'intervals')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_training_load_user_date
  ON training_load_daily (user_id, date);

-- ── 5. Tabulka on-bike výživy ─────────────────────────────
CREATE TABLE IF NOT EXISTS on_bike_nutrition_log (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_event_id  UUID        REFERENCES race_events(id) ON DELETE SET NULL,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  item_name      TEXT        NOT NULL,
  carbs_g        NUMERIC(5,1) NOT NULL DEFAULT 0,
  kcal           NUMERIC(6,1) NOT NULL DEFAULT 0,
  notes          TEXT         DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_on_bike_nutrition_user_event
  ON on_bike_nutrition_log (user_id, race_event_id);

-- ── 6. Rozšíření supplement_log ───────────────────────────
-- Přidání sloupce taken_at pro přesné časové razítko (pokud neexistuje)
ALTER TABLE supplement_log
  ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ DEFAULT NOW();

-- ── 7. ROW LEVEL SECURITY ─────────────────────────────────

ALTER TABLE race_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_targets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_load_daily   ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_bike_nutrition_log ENABLE ROW LEVEL SECURITY;

-- race_events
CREATE POLICY IF NOT EXISTS "race_events: select own"
  ON race_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "race_events: insert own"
  ON race_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "race_events: update own"
  ON race_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "race_events: delete own"
  ON race_events FOR DELETE
  USING (auth.uid() = user_id);

-- nutrition_targets
CREATE POLICY IF NOT EXISTS "nutrition_targets: select own"
  ON nutrition_targets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "nutrition_targets: insert own"
  ON nutrition_targets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "nutrition_targets: update own"
  ON nutrition_targets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "nutrition_targets: delete own"
  ON nutrition_targets FOR DELETE
  USING (auth.uid() = user_id);

-- training_load_daily
CREATE POLICY IF NOT EXISTS "training_load_daily: select own"
  ON training_load_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "training_load_daily: insert own"
  ON training_load_daily FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "training_load_daily: update own"
  ON training_load_daily FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "training_load_daily: delete own"
  ON training_load_daily FOR DELETE
  USING (auth.uid() = user_id);

-- on_bike_nutrition_log
CREATE POLICY IF NOT EXISTS "on_bike_nutrition_log: select own"
  ON on_bike_nutrition_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "on_bike_nutrition_log: insert own"
  ON on_bike_nutrition_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "on_bike_nutrition_log: update own"
  ON on_bike_nutrition_log FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "on_bike_nutrition_log: delete own"
  ON on_bike_nutrition_log FOR DELETE
  USING (auth.uid() = user_id);

-- ── 8. Trigger: updated_at automatická aktualizace ────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['race_events','nutrition_targets','training_load_daily'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_' || tbl || '_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- ── 9. Povolení v supplement_log: upsert conflict na taken_at sloupci ──
-- (supplement_log.unique constraint je na user_id, date, supplement_id — OK)

-- ── Hotovo ────────────────────────────────────────────────
-- Tabulky: race_events, nutrition_targets, training_load_daily, on_bike_nutrition_log
-- Úpravy: profiles (ftp_watts, caloric_deficit_offseason, target_weight_kg)
--         supplement_log (taken_at)
-- RLS: povoleno na všech nových tabulkách
