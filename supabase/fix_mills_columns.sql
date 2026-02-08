-- SQL Script to add missing tracking columns to the mills table
-- Run this in the Supabase SQL Editor

ALTER TABLE public.mills 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'LIBRE',
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS sacos_procesados INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS horas_trabajadas DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_client_id UUID,
ADD COLUMN IF NOT EXISTS current_client TEXT,
ADD COLUMN IF NOT EXISTS current_cuarzo INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_llampo INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hours_to_oil_change INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS last_maintenance TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS needs_mantenimiento BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS operativo BOOLEAN DEFAULT true;

-- Data migration: If you have data in old columns (nombre -> name, estado -> status)
-- UPDATE public.mills SET name = nombre WHERE name IS NULL AND nombre IS NOT NULL;
-- UPDATE public.mills SET status = estado WHERE status IS NULL AND estado IS NOT NULL;
