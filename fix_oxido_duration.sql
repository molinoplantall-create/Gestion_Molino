-- SQL Fix: Correct Óxido duration_hours that were incorrectly set to 2.5h
-- Execute this script in the Supabase SQL Editor
-- This is a ONE-TIME correction for May 2026 records

-- 1. Fix Óxido records that have 2.5h (should be ~1.67h or 2.0h depending on your process)
UPDATE public.milling_logs 
SET duration_hours = 2.0
WHERE mineral_type ILIKE '%OXIDO%' 
  AND (duration_hours = 2.5 OR duration_hours IS NULL)
  AND created_at >= '2026-05-01';

-- 2. Verify the fix
SELECT id, mineral_type, duration_hours, status, created_at
FROM public.milling_logs
WHERE mineral_type ILIKE '%OXIDO%'
  AND created_at >= '2026-05-01'
ORDER BY created_at DESC
LIMIT 20;
