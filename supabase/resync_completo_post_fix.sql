-- =============================================================================
-- resync_completo_post_fix.sql
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase, DESPUÉS de confirmar
-- el deploy exitoso del fix de arquitectura en Vercel.
--
-- Hace 3 cosas, en este orden:
--   1. Cierra moliendas atascadas en IN_PROGRESS (incluyendo las últimas
--      registradas hoy que no se contaron).
--   2. Resincroniza total_hours_worked de los 4 molinos sumando directo
--      desde milling_logs (fuente única de verdad).
--   3. Resincroniza hours_to_oil_change usando las fechas reales de último
--      cambio de aceite confirmadas por el usuario:
--        - Molino I  : último cambio 18-ago-2026
--        - Molino II : último cambio 18-ago-2026
--        - Molino III: último cambio 29-abr-2026
--        - Molino IV : nunca cambiado (desde el inicio de registros)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1: Cerrar todas las moliendas huérfanas en IN_PROGRESS
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE milling_logs
SET
  status = 'FINALIZADO',
  duration_hours = CASE
    WHEN duration_hours IS NOT NULL AND duration_hours > 0 THEN duration_hours
    WHEN mineral_type = 'SULFURO' THEN 2.5
    ELSE 1.67
  END
WHERE status = 'IN_PROGRESS';

-- Liberar el estado de los molinos que quedaron OCUPADO sin molienda activa
UPDATE mills
SET
  status = 'LIBRE',
  current_client_id = NULL,
  current_cuarzo    = 0,
  current_llampo    = 0,
  start_time        = NULL,
  estimated_end     = NULL,
  sacks_processing  = 0
WHERE status = 'OCUPADO'
  AND NOT EXISTS (
    SELECT 1 FROM milling_logs ml
    WHERE ml.status = 'IN_PROGRESS'
      AND ml.mills_used @> jsonb_build_array(jsonb_build_object('id', mills.id::text))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2: Resincronizar total_hours_worked de cada molino
-- (suma de duration_hours de todas las moliendas FINALIZADAS de ese molino)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE mills m
SET total_hours_worked = COALESCE(
  (
    SELECT ROUND(SUM(
      COALESCE(ml.duration_hours,
        CASE WHEN ml.mineral_type = 'SULFURO' THEN 2.5 ELSE 1.67 END
      )
    )::numeric, 2)
    FROM milling_logs ml
    WHERE ml.status = 'FINALIZADO'
      AND ml.mills_used @> jsonb_build_array(jsonb_build_object('id', m.id::text))
  ), 0
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 3: Resincronizar hours_to_oil_change de cada molino
-- Fórmula: horas acumuladas DESDE el último cambio de aceite
--          = SUM(duration_hours de moliendas FINALIZADAS después de esa fecha)
-- Luego: hours_to_oil_change = tope_max - horas_desde_ultimo_cambio
-- ─────────────────────────────────────────────────────────────────────────────

-- Molino I — tope 100h, último cambio: 2026-08-18
UPDATE mills
SET hours_to_oil_change = GREATEST(0,
  100 - COALESCE((
    SELECT ROUND(SUM(
      COALESCE(ml.duration_hours,
        CASE WHEN ml.mineral_type = 'SULFURO' THEN 2.5 ELSE 1.67 END
      )
    )::numeric, 2)
    FROM milling_logs ml
    WHERE ml.status = 'FINALIZADO'
      AND ml.mills_used @> jsonb_build_array(jsonb_build_object('id', mills.id::text))
      AND ml.created_at >= '2026-08-18T00:00:00'
  ), 0)
)
WHERE name IN ('Molino I', 'MOLINO I');

-- Molino II — tope 100h, último cambio: 2026-08-18
UPDATE mills
SET hours_to_oil_change = GREATEST(0,
  100 - COALESCE((
    SELECT ROUND(SUM(
      COALESCE(ml.duration_hours,
        CASE WHEN ml.mineral_type = 'SULFURO' THEN 2.5 ELSE 1.67 END
      )
    )::numeric, 2)
    FROM milling_logs ml
    WHERE ml.status = 'FINALIZADO'
      AND ml.mills_used @> jsonb_build_array(jsonb_build_object('id', mills.id::text))
      AND ml.created_at >= '2026-08-18T00:00:00'
  ), 0)
)
WHERE name IN ('Molino II', 'MOLINO II');

-- Molino III — tope 1000h, último cambio: 2026-04-29
UPDATE mills
SET hours_to_oil_change = GREATEST(0,
  1000 - COALESCE((
    SELECT ROUND(SUM(
      COALESCE(ml.duration_hours,
        CASE WHEN ml.mineral_type = 'SULFURO' THEN 2.5 ELSE 1.67 END
      )
    )::numeric, 2)
    FROM milling_logs ml
    WHERE ml.status = 'FINALIZADO'
      AND ml.mills_used @> jsonb_build_array(jsonb_build_object('id', mills.id::text))
      AND ml.created_at >= '2026-04-29T00:00:00'
  ), 0)
)
WHERE name IN ('Molino III', 'MOLINO III');

-- Molino IV — tope 1000h, nunca cambiado (desde inicio de registros = toda la historia)
UPDATE mills
SET hours_to_oil_change = GREATEST(0,
  1000 - COALESCE((
    SELECT ROUND(SUM(
      COALESCE(ml.duration_hours,
        CASE WHEN ml.mineral_type = 'SULFURO' THEN 2.5 ELSE 1.67 END
      )
    )::numeric, 2)
    FROM milling_logs ml
    WHERE ml.status = 'FINALIZADO'
      AND ml.mills_used @> jsonb_build_array(jsonb_build_object('id', mills.id::text))
  ), 0)
)
WHERE name IN ('Molino IV', 'MOLINO IV');

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN: Revisar resultados finales
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  name,
  status,
  total_hours_worked,
  hours_to_oil_change
FROM mills
ORDER BY name;
