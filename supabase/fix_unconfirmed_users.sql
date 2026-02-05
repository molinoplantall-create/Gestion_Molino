-- EJECUTAR ESTO SI "auto_confirm_trigger.sql" FALLÓ POR PERMISOS

-- 1. Confirmar manualmente a todos los usuarios actuales
-- (Supabase te permite hacer UPDATE en auth.users desde el SQL Editor usualmente)
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW(),
  last_sign_in_at = NOW()
WHERE confirmed_at IS NULL;

-- 2. Asegurar que tengan perfil en public.user_profiles
INSERT INTO public.user_profiles (id, email, nombre, role, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'nombre', 'Usuario Migrado'),
  'OPERADOR',
  true
FROM auth.users
ON CONFLICT (id) DO NOTHING;
