-- SQL Migration: Add duration_hours and finish_time to milling_logs
-- Execute this script in the Supabase SQL Editor

ALTER TABLE public.milling_logs
ADD COLUMN IF NOT EXISTS duration_hours numeric(6,2),
ADD COLUMN IF NOT EXISTS finish_time timestamptz;

-- Note: We do not backfill finish_time because historical logs 
-- just used the standard estimated time, which is handled gracefully by our app code.
