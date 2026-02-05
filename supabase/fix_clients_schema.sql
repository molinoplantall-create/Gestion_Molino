-- SQL Script to sync clients table with the application code
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS ruc_dni TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS zone TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS client_type TEXT;

-- Optional: If there's data in the 'type' column, you might want to migrate it
-- UPDATE public.clients SET client_type = type WHERE client_type IS NULL;
