-- Script para reconstruir el historial de ingresos basado en el stock actual y moliendas pasadas
-- Esto activará la Analítica de Producción y creará Lotes Históricos para los datos existentes

-- 1. Crear tabla temporal con los totales reconstruidos
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

-- 2. Actualizar las columnas acumulativas en la tabla clients para la Analítica
UPDATE public.clients c
SET 
  cumulative_cuarzo = rt.current_cuarzo + rt.milled_cuarzo,
  cumulative_llampo = rt.current_llampo + rt.milled_llampo
FROM reconstructed_intake rt
WHERE c.id = rt.client_id;

-- 3. Limpiar lotes actuales (para evitar duplicados al ejecutar el script de reconstrucción)
TRUNCATE TABLE public.stock_batches;

-- 4. Crear "Lotes Históricos" que representan el ingreso total reconstruido
-- Lote de Cuarzo
INSERT INTO public.stock_batches (client_id, mineral_type, sub_mineral, initial_quantity, remaining_quantity, zone, created_at)
SELECT 
    client_id,
    COALESCE(last_mineral_type, 'OXIDO'),
    'CUARZO',
    current_cuarzo + milled_cuarzo as initial_quantity,
    current_cuarzo as remaining_quantity,
    last_intake_zone,
    NOW() - INTERVAL '1 day'
FROM reconstructed_intake
WHERE (current_cuarzo + milled_cuarzo) > 0;

-- Lote de Llampo
INSERT INTO public.stock_batches (client_id, mineral_type, sub_mineral, initial_quantity, remaining_quantity, zone, created_at)
SELECT 
    client_id,
    COALESCE(last_mineral_type, 'OXIDO'),
    'LLAMPO',
    current_llampo + milled_llampo as initial_quantity,
    current_llampo as remaining_quantity,
    last_intake_zone,
    NOW() - INTERVAL '1 day'
FROM reconstructed_intake
WHERE (current_llampo + milled_llampo) > 0;

DROP TABLE reconstructed_intake;

COMMENT ON TABLE public.stock_batches IS 'Lotes reconstruidos para activar analítica histórica y trazabilidad FIFO.';
