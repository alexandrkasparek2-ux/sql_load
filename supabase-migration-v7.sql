-- Migration v7: Add fiber column to food_entries
-- Tracks dietary fiber intake per food entry

ALTER TABLE food_entries
  ADD COLUMN IF NOT EXISTS fiber NUMERIC(6,1) NOT NULL DEFAULT 0;
