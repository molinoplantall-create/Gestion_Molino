import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function cleanup() {
  const clientId = '9376ce4e-3c77-4a41-87d1-fb28593715ce'; // Jorge Huamani
  const batchId = 'eea9443a-a387-44e1-9723-266227818e9d';  // Test batch

  // 1. Delete the test batch
  const { error: batchErr } = await supabase.from('stock_batches').delete().eq('id', batchId);
  if (batchErr) { console.error('Error deleting batch:', batchErr); return; }
  console.log('Deleted test batch (10 CUARZO, zone=Test)');

  // 2. Reset Jorge Huamani stock and cumulative to 0
  const { error: updateErr } = await supabase.from('clients').update({
    stock_cuarzo: 0,
    stock_llampo: 0,
    cumulative_cuarzo: 0,
    cumulative_llampo: 0,
    last_intake_date: null,
    last_intake_zone: null
  }).eq('id', clientId);
  
  if (updateErr) { console.error('Error updating client:', updateErr); return; }
  console.log('Reset Jorge Huamani stock to 0. Ready for manual re-entry.');
}

cleanup().catch(console.error);
