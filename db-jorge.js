import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function investigateJorge() {
  // 1. Find all clients matching "Jorge"
  const { data: clients, error: ce } = await supabase
    .from('clients')
    .select('*')
    .ilike('name', '%Jorge%');
  
  if (ce) { console.error(ce); return; }
  
  console.log("=== ALL 'JORGE' CLIENTS ===");
  for (const c of clients) {
    console.log(`\nClient: ${c.name} (ID: ${c.id})`);
    console.log(`  zone=${c.zone}, type=${c.client_type}`);
    console.log(`  stock_cuarzo=${c.stock_cuarzo}, stock_llampo=${c.stock_llampo}`);
    console.log(`  cumulative_cuarzo=${c.cumulative_cuarzo}, cumulative_llampo=${c.cumulative_llampo}`);
    console.log(`  last_intake_date=${c.last_intake_date}`);
    console.log(`  last_intake_zone=${c.last_intake_zone}`);
    console.log(`  created_at=${c.created_at}`);
    
    // 2. All batches for this client
    const { data: batches } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('client_id', c.id)
      .order('created_at', { ascending: true });
    
    console.log(`\n  BATCHES (${batches?.length || 0}):`);
    for (const b of (batches || [])) {
      console.log(`    [${b.created_at}] ${b.sub_mineral} initial=${b.initial_quantity} remaining=${b.remaining_quantity} zone=${b.zone} mineral_type=${b.mineral_type} (id=${b.id})`);
    }
    
    // 3. All milling logs for this client
    const { data: logs } = await supabase
      .from('milling_logs')
      .select('*')
      .eq('client_id', c.id)
      .order('created_at', { ascending: true });
    
    console.log(`\n  MILLING LOGS (${logs?.length || 0}):`);
    for (const l of (logs || [])) {
      console.log(`    [${l.created_at}] sacks=${l.total_sacks} cuarzo=${l.total_cuarzo} llampo=${l.total_llampo} mineral=${l.mineral_type} status=${l.status}`);
    }
  }
}

investigateJorge().catch(console.error);
