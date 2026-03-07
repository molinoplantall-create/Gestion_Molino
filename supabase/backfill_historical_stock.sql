-- 1. Asegurar que las columnas existen (por si no se ejecutó el script anterior)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS cumulative_cuarzo INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumulative_llampo INTEGER DEFAULT 0;

-- 2. Inicializar con el stock actual (lo que hay hoy)
UPDATE public.clients
SET 
  cumulative_cuarzo = COALESCE(stock_cuarzo, 0),
  cumulative_llampo = COALESCE(stock_llampo, 0);

-- 3. Sumar todo lo que ya se molió en el pasado para recuperar el "Total Original"
WITH client_milled_totals AS (
  SELECT 
    client_id,
    SUM(total_cuarzo) as total_milled_cuarzo,
    SUM(total_llampo) as total_milled_llampo
  FROM public.milling_logs
  GROUP BY client_id
)
UPDATE public.clients c
SET 
  cumulative_cuarzo = cumulative_cuarzo + COALESCE(ct.total_milled_cuarzo, 0),
  cumulative_llampo = cumulative_llampo + COALESCE(ct.total_milled_llampo, 0)
FROM client_milled_totals ct
WHERE c.id = ct.client_id;

COMMENT ON COLUMN public.clients.cumulative_cuarzo IS 'Total histórico real (Stock Actual + Todo lo ya molido)';
COMMENT ON COLUMN public.clients.cumulative_llampo IS 'Total histórico real (Stock Actual + Todo lo ya molido)';
