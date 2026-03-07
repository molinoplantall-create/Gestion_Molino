-- Create table for tracking individual mineral batches (Lotes)
CREATE TABLE IF NOT EXISTS public.stock_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    mineral_type TEXT NOT NULL CHECK (mineral_type IN ('OXIDO', 'SULFURO')),
    sub_mineral TEXT NOT NULL CHECK (sub_mineral IN ('CUARZO', 'LLAMPO')),
    initial_quantity INTEGER NOT NULL CHECK (initial_quantity >= 0),
    remaining_quantity INTEGER NOT NULL CHECK (remaining_quantity >= 0),
    zone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for FIFO (First In, First Out)
CREATE INDEX IF NOT EXISTS idx_stock_batches_fifo ON public.stock_batches(client_id, sub_mineral, created_at ASC) WHERE remaining_quantity > 0;

-- Backfill: Create initial batches for existing clients who have stock
-- We'll create one batch per sub_mineral for each client with their current stock levels
INSERT INTO public.stock_batches (client_id, mineral_type, sub_mineral, initial_quantity, remaining_quantity, zone)
SELECT 
    id as client_id, 
    COALESCE(last_mineral_type, 'OXIDO') as mineral_type, 
    'CUARZO' as sub_mineral, 
    stock_cuarzo as initial_quantity, 
    stock_cuarzo as remaining_quantity,
    last_intake_zone as zone
FROM public.clients
WHERE stock_cuarzo > 0;

INSERT INTO public.stock_batches (client_id, mineral_type, sub_mineral, initial_quantity, remaining_quantity, zone)
SELECT 
    id as client_id, 
    COALESCE(last_mineral_type, 'OXIDO') as mineral_type, 
    'LLAMPO' as sub_mineral, 
    stock_llampo as initial_quantity, 
    stock_llampo as remaining_quantity,
    last_intake_zone as zone
FROM public.clients
WHERE stock_llampo > 0;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_stock_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_batches_updated_at_trigger
BEFORE UPDATE ON public.stock_batches
FOR EACH ROW EXECUTE FUNCTION update_stock_batches_updated_at();

-- Comment for clarity
COMMENT ON TABLE public.stock_batches IS 'Tracks individual mineral intake entries for FIFO consumption and traceability.';
