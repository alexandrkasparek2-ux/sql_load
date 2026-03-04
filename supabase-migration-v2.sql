-- ============================================================
-- CycloFuel Migration v2
-- Run this in Supabase SQL Editor AFTER the initial schema
-- ============================================================

-- 1. Expand allowed training types (new sports)
ALTER TABLE training_days
  DROP CONSTRAINT IF EXISTS training_days_training_type_check;

ALTER TABLE training_days
  ADD CONSTRAINT training_days_training_type_check
  CHECK (training_type IN (
    'rest','light','medium','hard','race',
    'strength','running','swimming','team_sport','yoga'
  ));

-- 2. Add caffeine tracking (cups of espresso)
ALTER TABLE training_days
  ADD COLUMN IF NOT EXISTS coffee_cups INTEGER NOT NULL DEFAULT 0;
