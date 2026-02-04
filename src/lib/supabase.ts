import { createClient } from '@supabase/supabase-js';

// REEMPLAZA ESTOS VALORES con los de tu proyecto Supabase
const supabaseUrl = 'https://rdcwtvmbilfbybzjxltc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkY3d0dm1iaWxmYnliemp4bHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzc1NjYsImV4cCI6MjA4MzkxMzU2Nn0._Quxv_OMncC6WPtxaINRr8nJnKQEwxmV4l-h9RbuN5k';

// Verificar que tenemos las credenciales
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Faltan credenciales de Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});