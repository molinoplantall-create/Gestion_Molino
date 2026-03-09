-- ============================================================
-- SINCRONIZACIÓN: Recalcular horas de molinos desde milling_logs
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- Este script recalcula total_hours_worked y hours_to_oil_change
-- para cada molino usando los registros REALES de molienda.

-- 1. Crear tabla temporal con horas calculadas por molino
-- OXIDO = 1.67h (100 min), SULFURO = 2.25h (135 min promedio)
WITH mill_hours AS (
  SELECT 
    (mill_entry->>'id')::UUID AS mill_id,
    SUM(
      CASE 
        WHEN ml.mineral_type = 'SULFURO' THEN 2.25
        ELSE 1.67  -- OXIDO u otros
      END
    ) AS total_calculated_hours
  FROM milling_logs ml,
    jsonb_array_elements(ml.mills_used) AS mill_entry
  WHERE ml.status IN ('FINALIZADO', 'IN_PROGRESS')
  GROUP BY (mill_entry->>'id')::UUID
),

-- 2. Calcular horas DESPUÉS del último reset de aceite por molino
hours_since_last_reset AS (
  SELECT 
    (mill_entry->>'id')::UUID AS mill_id,
    SUM(
      CASE 
        WHEN ml.mineral_type = 'SULFURO' THEN 2.25
        ELSE 1.67
      END
    ) AS hours_after_reset
  FROM milling_logs ml,
    jsonb_array_elements(ml.mills_used) AS mill_entry
  WHERE ml.status IN ('FINALIZADO', 'IN_PROGRESS')
    -- Solo contar sesiones DESPUÉS del último mantenimiento del molino
    AND ml.created_at > COALESCE(
      (SELECT m.last_maintenance::timestamptz 
       FROM mills m 
       WHERE m.id = (mill_entry->>'id')::UUID),
      '2020-01-01'::timestamptz
    )
  GROUP BY (mill_entry->>'id')::UUID
)

-- 3. Actualizar mills con los valores calculados
UPDATE mills
SET 
  total_hours_worked = ROUND(COALESCE(mh.total_calculated_hours, 0)::numeric, 2),
  hours_to_oil_change = GREATEST(0, 
    ROUND((500 - COALESCE(hr.hours_after_reset, 0))::numeric, 2)
  )
FROM mills m2
LEFT JOIN mill_hours mh ON mh.mill_id = m2.id
LEFT JOIN hours_since_last_reset hr ON hr.mill_id = m2.id
WHERE mills.id = m2.id;

-- Verificar resultado
SELECT 
  m.name,
  m.total_hours_worked AS "Horas Totales",
  m.hours_to_oil_change AS "Hrs p/ Cambio Aceite",
  m.last_maintenance AS "Último Mant."
FROM mills m
ORDER BY m.name;
