-- Add columns for tracking mineral intake
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS last_intake_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_intake_zone TEXT,
ADD COLUMN IF NOT EXISTS last_mineral_type TEXT;

-- Update existing records if necessary (optional)
