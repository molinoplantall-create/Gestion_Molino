-- ============================================================
-- Nueva tabla: mill_requirements (Lista de Requerimientos por Molino)
-- Para anotar repuestos/piezas que le faltan a cada molino (ej. fajas
-- de Molino III y IV), con modelo, cantidad, prioridad, costo estimado
-- y proveedor -así queda registrado y no depende de la memoria.
--
-- No borra ni modifica ninguna tabla existente.
-- ============================================================

CREATE TABLE IF NOT EXISTS mill_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID REFERENCES mills(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,              -- Qué falta (ej. "Faja")
  model_spec TEXT,                       -- Modelo/especificación (ej. "B-52 doble")
  quantity INTEGER DEFAULT 1,
  priority TEXT DEFAULT 'NORMAL',        -- URGENTE | NORMAL | BAJA
  estimated_cost_pen DECIMAL(10,2) DEFAULT 0,
  estimated_cost_usd DECIMAL(10,2) DEFAULT 0,
  provider TEXT,                         -- Proveedor sugerido/de siempre
  notes TEXT,
  requested_by TEXT,                     -- Quién lo pidió/anotó
  status TEXT DEFAULT 'PENDIENTE',       -- PENDIENTE | RESUELTO
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mill_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver requerimientos" ON mill_requirements;
CREATE POLICY "Ver requerimientos" ON mill_requirements
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Crear requerimientos" ON mill_requirements;
CREATE POLICY "Crear requerimientos" ON mill_requirements
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Actualizar requerimientos" ON mill_requirements;
CREATE POLICY "Actualizar requerimientos" ON mill_requirements
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Eliminar requerimientos" ON mill_requirements;
CREATE POLICY "Eliminar requerimientos" ON mill_requirements
  FOR DELETE USING (auth.role() = 'authenticated');

-- Verificación
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'mill_requirements' ORDER BY ordinal_position;