-- ============================================================
-- CycloFuel Migration v4
-- Run this in Supabase SQL Editor AFTER migration v3
-- Adds extra_types column for multi-sport selection
-- ============================================================

ALTER TABLE training_days
  ADD COLUMN IF NOT EXISTS extra_types TEXT[] NOT NULL DEFAULT '{}';
