-- SOLUCIÓN AL ERROR 500 (RECURSIÓN INFINITA)

-- 1. Eliminar la política que causa el error
DROP POLICY IF EXISTS "Admins have full control" ON public.user_profiles;
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile name" ON public.user_profiles;

-- 2. Crear una función para verificar el rol sin causar recursión
-- SECURITY DEFINER permite que la función ignore RLS durante su ejecución
CREATE OR REPLACE FUNCTION public.check_user_role(target_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = target_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Nuevas políticas usando la función
-- Todos pueden ver los perfiles
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.user_profiles FOR SELECT
TO authenticated
USING (true);

-- Solo Admins pueden insertar, actualizar o borrar perfiles
CREATE POLICY "Admins have full control over profiles"
ON public.user_profiles FOR ALL
TO authenticated
USING (public.check_user_role('ADMIN'))
WITH CHECK (public.check_user_role('ADMIN'));

-- El propio usuario puede actualizar su información básica si no es Admin
-- (Aunque con la política de arriba el Admin ya tiene permiso)
CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
