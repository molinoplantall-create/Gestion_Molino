import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function searchLogs() {
  console.log("=== BUSCANDO LOGS DE MOLIENDA HUÉRFANOS O SOSPECHOSOS ===");
  
  // Get all logs
  const { data: logs, error } = await supabase
    .from('milling_logs')
    .select('*, clients(name)')
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return; }

  console.log(`Total logs encontrados: ${logs.length}`);
  
  for (const l of logs) {
    console.log(`Log [${l.created_at}] | Client: ${l.clients?.name || 'DESCONOCIDO'} (ID: ${l.client_id}) | Sacks: ${l.total_sacks} | Status: ${l.status}`);
  }
}

searchLogs().catch(console.error);
