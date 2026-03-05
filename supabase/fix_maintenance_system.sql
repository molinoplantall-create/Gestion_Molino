-- SQL Migration: fix_maintenance_system.sql
-- 1. Asegurar que la tabla existe y tiene el nombre correcto (minúsculas)
DO $$ 
BEGIN 
  -- Si existe la tabla con M mayúscula (común al importar de otros sistemas)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Maintenance') THEN
    ALTER TABLE public."Maintenance" RENAME TO maintenance_logs;
  END IF;

  -- Si no existe la tabla, crearla con el esquema esperado
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='maintenance_logs') THEN
    CREATE TABLE maintenance_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      mill_id UUID REFERENCES mills(id), -- Usamos mill_id como estándar
      type VARCHAR(50),
      description TEXT,
      technician_name VARCHAR(100),
      worked_hours DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'PENDIENTE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;

  -- 2. Asegurar columnas específicas (Compatibilidad con molino_id / mill_id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='maintenance_logs' AND column_name='molino_id') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='maintenance_logs' AND column_name='mill_id') THEN
    ALTER TABLE maintenance_logs RENAME COLUMN molino_id TO mill_id;
  END IF;

END $$;

-- 3. Habilitar RLS y definir políticas (CRITICAL: Faltaban políticas de SELECT)
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Política de lectura: Todos los autenticados pueden ver los logs
DROP POLICY IF EXISTS "Permitir lectura para todos" ON maintenance_logs;
CREATE POLICY "Permitir lectura para todos" ON maintenance_logs 
  FOR SELECT USING (true);

-- Política de inserción: Solo usuarios autenticados
DROP POLICY IF EXISTS "Permitir inserción para autenticados" ON maintenance_logs;
CREATE POLICY "Permitir inserción para autenticados" ON maintenance_logs 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política de actualización: Solo usuarios autenticados
DROP POLICY IF EXISTS "Permitir actualización para autenticados" ON maintenance_logs;
CREATE POLICY "Permitir actualización para autenticados" ON maintenance_logs 
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Asegurar que la tabla mills tiene la relación correcta si es necesario
-- Supabase lo maneja automáticamente con las FKs, pero esto asegura visibilidad en PostgREST.
GRANT ALL ON TABLE maintenance_logs TO authenticated;
GRANT ALL ON TABLE maintenance_logs TO service_role;
GRANT ALL ON TABLE maintenance_logs TO anon;
