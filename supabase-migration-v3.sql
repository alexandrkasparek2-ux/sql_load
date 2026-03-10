-- ============================================================
-- CycloFuel Migration v3
-- Run this in Supabase SQL Editor AFTER migration v2
-- Adds new sport activity types to the CHECK constraint
-- ============================================================

ALTER TABLE training_days
  DROP CONSTRAINT IF EXISTS training_days_training_type_check;

ALTER TABLE training_days
  ADD CONSTRAINT training_days_training_type_check
  CHECK (training_type IN (
    'rest','light','medium','hard','race',
    'strength','running','swimming','team_sport','yoga',
    'walking','hiking','cycling_indoor','dancing','skiing','boxing'
  ));
