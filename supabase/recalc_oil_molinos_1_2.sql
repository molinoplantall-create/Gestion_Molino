-- ============================================================
-- Recálculo de horas de cambio de aceite (Molinos I y II)
-- Fecha base: 02-07-2026
-- Límite establecido: 100 horas
-- ============================================================

-- 1. Calculamos las horas procesadas desde la fecha indicada para cada molino
WITH hours_since_change AS (
  SELECT 
    (mill_entry->>'id')::UUID AS mill_id,
    SUM(
      COALESCE(
        NULLIF(ml.duration_hours, 0), 
        CASE WHEN ml.mineral_type = 'SULFURO' THEN 2.5 ELSE 1.67 END
      )
    ) AS sum_hours
  FROM milling_logs ml,
    jsonb_array_elements(ml.mills_used) AS mill_entry
  WHERE ml.status IN ('FINALIZADO', 'IN_PROGRESS', 'COMPLETED')
    AND ml.created_at >= '2026-07-02 00:00:00'
  GROUP BY (mill_entry->>'id')::UUID
)

-- 2. Actualizamos SOLO Molino I y Molino II, restando de 100
UPDATE mills
SET 
  hours_to_oil_change = GREATEST(0, ROUND((100 - COALESCE(hsc.sum_hours, 0))::numeric, 2))
FROM mills m2
LEFT JOIN hours_since_change hsc ON hsc.mill_id = m2.id
WHERE mills.id = m2.id
  AND m2.name IN ('Molino I', 'Molino II', 'MOLINO I', 'MOLINO II');

-- 3. Verificamos el resultado
SELECT 
  name, 
  total_hours_worked,
  hours_to_oil_change 
FROM mills 
WHERE name IN ('Molino I', 'Molino II', 'MOLINO I', 'MOLINO II');
