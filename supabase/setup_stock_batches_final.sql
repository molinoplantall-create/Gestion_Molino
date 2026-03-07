-- ==========================================================
-- SCRIPT UNIFICADO: CREACIÓN DE LOTES Y RECONSTRUCCIÓN HISTÓRICA
-- ==========================================================
-- Este script realiza 3 acciones:
-- 1. Crea la tabla 'stock_batches' si no existe.
-- 2. Configura los índices y triggers necesarios.
-- 3. Reconstruye el historial de ingresos basado en moliendas pasadas (Activa Analítica).

-- 1. CREACIÓN DE LA TABLA
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

-- 2. ÍNDICES Y TRIGGERS
CREATE INDEX IF NOT EXISTS idx_stock_batches_fifo ON public.stock_batches(client_id, sub_mineral, created_at ASC) WHERE remaining_quantity > 0;

CREATE OR REPLACE FUNCTION update_stock_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stock_batches_updated_at_trigger ON public.stock_batches;
CREATE TRIGGER update_stock_batches_updated_at_trigger
BEFORE UPDATE ON public.stock_batches
FOR EACH ROW EXECUTE FUNCTION update_stock_batches_updated_at();

-- 3. RECONSTRUCCIÓN HISTÓRICA (ACTIVA ANALÍTICA)
-- Limpiamos lotes actuales para evitar duplicados en la reconstrucción
TRUNCATE TABLE public.stock_batches;

DO $$ 
BEGIN
    -- Crear tabla temporal para reconstruir totales
    CREATE TEMP TABLE reconstructed_intake AS
    SELECT 
        c.id as client_id,
        c.stock_cuarzo as current_cuarzo,
        c.stock_llampo as current_llampo,
        COALESCE(SUM(ml.total_cuarzo), 0) as milled_cuarzo,
        COALESCE(SUM(ml.total_llampo), 0) as milled_llampo,
        c.last_mineral_type,
        c.last_intake_zone
    FROM public.clients c
    LEFT JOIN public.milling_logs ml ON c.id = ml.client_id
    GROUP BY c.id, c.stock_cuarzo, c.stock_llampo, c.last_mineral_type, c.last_intake_zone;

    -- Actualizar columnas acumulativas en 'clients'
    UPDATE public.clients c
    SET 
      cumulative_cuarzo = rt.current_cuarzo + rt.milled_cuarzo,
      cumulative_llampo = rt.current_llampo + rt.milled_llampo
    FROM reconstructed_intake rt
    WHERE c.id = rt.client_id;

    -- Insertar Lotes Históricos (Cuarzo)
    INSERT INTO public.stock_batches (client_id, mineral_type, sub_mineral, initial_quantity, remaining_quantity, zone, created_at)
    SELECT 
        client_id,
        COALESCE(last_mineral_type, 'OXIDO'),
        'CUARZO',
        current_cuarzo + milled_cuarzo,
        current_cuarzo,
        last_intake_zone,
        NOW() - INTERVAL '1 day'
    FROM reconstructed_intake
    WHERE (current_cuarzo + milled_cuarzo) > 0;

    -- Insertar Lotes Históricos (Llampo)
    INSERT INTO public.stock_batches (client_id, mineral_type, sub_mineral, initial_quantity, remaining_quantity, zone, created_at)
    SELECT 
        client_id,
        COALESCE(last_mineral_type, 'OXIDO'),
        'LLAMPO',
        current_llampo + milled_llampo,
        current_llampo,
        last_intake_zone,
        NOW() - INTERVAL '1 day'
    FROM reconstructed_intake
    WHERE (current_llampo + milled_llampo) > 0;

    DROP TABLE reconstructed_intake;
END $$;

COMMENT ON TABLE public.stock_batches IS 'Sistema de lotes unificado con reconstrucción de analítica histórica.';
