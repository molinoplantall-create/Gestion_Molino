-- ============================================================
-- Agregar columnas de mano de obra (Labor Cost)
-- Tabla: maintenance_logs
-- ============================================================

ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS labor_cost_pen NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS labor_cost_usd NUMERIC(10, 2) DEFAULT 0;
