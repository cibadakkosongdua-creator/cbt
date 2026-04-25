-- Add anti_cheat_enabled column to settings table
-- Jalankan ini di Supabase SQL Editor

ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS anti_cheat_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Update existing row if it exists
UPDATE settings 
SET anti_cheat_enabled = TRUE 
WHERE anti_cheat_enabled IS NULL;
