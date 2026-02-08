-- SQL Script: Add estimated_end_time to mills table
ALTER TABLE public.mills ADD COLUMN IF NOT EXISTS estimated_end_time TIMESTAMPTZ;

-- Comment to track column purpose
COMMENT ON COLUMN public.mills.estimated_end_time IS 'Timestamp when the current process is expected to finish';
