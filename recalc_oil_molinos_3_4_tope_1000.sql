-- Script para recalcular hours_to_oil_change de Molino III y Molino IV
-- con el nuevo tope de 1000h, usando las fechas reales confirmadas.
-- Molino III: 29-04-2026
-- Molino IV: desde el inicio de registros.

WITH molino3_sum AS (
  SELECT COALESCE(SUM(duration_hours), 0) as total_horas
  FROM milling_logs
  WHERE status IN ('FINALIZADO', 'COMPLETED')
    AND mills_used @> '[{"name": "Molino III"}]'
    AND created_at >= '2026-04-29T00:00:00'
),
molino4_sum AS (
  SELECT COALESCE(SUM(duration_hours), 0) as total_horas
  FROM milling_logs
  WHERE status IN ('FINALIZADO', 'COMPLETED')
    AND mills_used @> '[{"name": "Molino IV"}]'
)
UPDATE mills
SET hours_to_oil_change = GREATEST(0, 1000 - (SELECT total_horas FROM molino3_sum))
WHERE name = 'Molino III';

UPDATE mills
SET hours_to_oil_change = GREATEST(0, 1000 - (SELECT total_horas FROM molino4_sum))
WHERE name = 'Molino IV';
