-- ============================================================
-- CycloFuel Migration v5
-- Run this in Supabase SQL Editor AFTER migration v4
-- Adds per-activity hours and intensity JSONB columns
-- ============================================================

ALTER TABLE training_days
  ADD COLUMN IF NOT EXISTS activity_hours     JSONB NOT NULL DEFAULT '{}';

ALTER TABLE training_days
  ADD COLUMN IF NOT EXISTS activity_intensity JSONB NOT NULL DEFAULT '{}';
