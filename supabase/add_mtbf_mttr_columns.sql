-- ============================================================
-- MIGRACIÓN: Columnas para indicadores MTBF / MTTR
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna failure_start_time (momento exacto de la falla)
--    Solo se usa en mantenimientos CORRECTIVOS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maintenance_logs' AND column_name = 'failure_start_time'
  ) THEN
    ALTER TABLE maintenance_logs 
      ADD COLUMN failure_start_time TIMESTAMPTZ;
    RAISE NOTICE '✅ Columna failure_start_time agregada.';
  ELSE
    RAISE NOTICE '⚠️ Columna failure_start_time ya existe.';
  END IF;
END $$;

-- 2. Agregar columna completed_at (momento en que se finalizó la reparación)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maintenance_logs' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE maintenance_logs 
      ADD COLUMN completed_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Columna completed_at agregada.';
  ELSE
    RAISE NOTICE '⚠️ Columna completed_at ya existe.';
  END IF;
END $$;

-- 3. (Opcional) Backfill: Rellenar completed_at para mantenimientos ya COMPLETADOS
--    Usa created_at + worked_hours como estimación
UPDATE maintenance_logs
SET completed_at = created_at + (COALESCE(worked_hours, 0) * INTERVAL '1 hour')
WHERE status = 'COMPLETADO'
  AND completed_at IS NULL;

-- 4. (Opcional) Backfill: Rellenar failure_start_time para correctivos ya existentes
UPDATE maintenance_logs
SET failure_start_time = created_at
WHERE type = 'CORRECTIVO'
  AND failure_start_time IS NULL;

-- 5. Índice para consultas de KPI por período
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_failure_start 
  ON maintenance_logs(failure_start_time);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_completed_at 
  ON maintenance_logs(completed_at);

-- ✅ Migración MTBF/MTTR completada exitosamente.
