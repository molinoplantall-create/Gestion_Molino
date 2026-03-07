-- Add columns for cumulative historical tracking of mineral intake
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS cumulative_cuarzo INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumulative_llampo INTEGER DEFAULT 0;

-- Optional: Initialize cumulative stock with current stock + total_sacos from milling_sessions (if you want to catch up)
-- Since we don't have a reliable way to know past intake exactly, many users prefer starting from 0 or current stock.
-- Here we'll just add the columns so they start tracking from now on.

COMMENT ON COLUMN public.clients.cumulative_cuarzo IS 'Total histórico de cuarzo ingresado (no disminuye con molienda)';
COMMENT ON COLUMN public.clients.cumulative_llampo IS 'Total histórico de llampo ingresado (no disminuye con molienda)';
