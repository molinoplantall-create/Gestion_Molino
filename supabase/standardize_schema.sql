-- SQL Script to standardize schema naming to lowercase snake_case
-- Run this in the Supabase SQL Editor to resolve all casing issues

-- 1. Table: mills
ALTER TABLE IF EXISTS public.mills RENAME COLUMN "Name" TO name;
-- total_hours_worked and sacks_processing are already snake_case, but let's ensure name is consistent

-- 2. Table: milling_logs
ALTER TABLE IF EXISTS public.milling_logs RENAME COLUMN "Client_id" TO client_id;

-- 3. Table: Maintenance (Rename table and columns)
ALTER TABLE IF EXISTS public."Maintenance" RENAME TO maintenance_logs;
ALTER TABLE IF EXISTS public.maintenance_logs RENAME COLUMN "Type" TO type;
ALTER TABLE IF EXISTS public.maintenance_logs RENAME COLUMN "Description" TO description;
ALTER TABLE IF EXISTS public.maintenance_logs RENAME COLUMN "Technician" TO technician_name;
ALTER TABLE IF EXISTS public.maintenance_logs RENAME COLUMN "Hours_taken" TO worked_hours;
ALTER TABLE IF EXISTS public.maintenance_logs RENAME COLUMN "Created_at" TO created_at;

-- 4. Table: user_profiles
ALTER TABLE IF EXISTS public.user_profiles RENAME COLUMN "Nombre" TO nombre;
ALTER TABLE IF EXISTS public.user_profiles RENAME COLUMN "Created_at" TO created_at;

-- 5. Table: zones (Ensure name is lowercase)
-- The log suggested zones.name exists, but if it was "Name", this fixes it:
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='zones' AND column_name='Name') THEN
    ALTER TABLE public.zones RENAME COLUMN "Name" TO name;
  END IF;
END $$;
