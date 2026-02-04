-- 1. Asegurar que la tabla user_profiles existe (usando el nombre que usa el código)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  nombre TEXT,
  role TEXT CHECK (role IN ('ADMIN', 'OPERADOR', 'GERENCIA')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Función para crear perfil (esta debe estar en public)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, nombre, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario Nuevo'),
    'OPERADOR',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger sobre auth.users
-- NOTA: Si este comando falla por permisos, deberás crear el perfil manualmente 
-- desde el frontend o contactar al administrador del proyecto para habilitar triggers en auth.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Sincronizar usuarios existentes
INSERT INTO public.user_profiles (id, email, nombre, role, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'nombre', 'Usuario Migrado'),
  'OPERADOR',
  true
FROM auth.users
ON CONFLICT (id) DO NOTHING;
