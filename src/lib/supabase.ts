import { createClient } from '@supabase/supabase-js';

// REEMPLAZA ESTOS VALORES con los de tu proyecto Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificar que tenemos las credenciales
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Faltan credenciales de Supabase');
  console.log('Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env o en Vercel.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});