-- 1. Habilitar RLS en user_profiles (ya debería estar, pero aseguramos)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Admins can do everything on profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- 3. Crear política para que todos vean los perfiles (necesario para la lista)
CREATE POLICY "Everyone can view profiles" 
ON public.user_profiles FOR SELECT 
USING (true);

-- 4. Crear política de poder total para Admins
CREATE POLICY "Admins have full control" 
ON public.user_profiles FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

-- 5. Crear política para que usuarios normales editen su propio nombre
CREATE POLICY "Users can update own profile name" 
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
