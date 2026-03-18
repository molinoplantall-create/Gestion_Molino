import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function auditClient(namePattern) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`CLIENTS MATCHING: "${namePattern}"`);
  console.log('='.repeat(60));

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .ilike('name', `%${namePattern}%`)
    .order('name');

  for (const c of clients) {
    console.log(`\n  Client: "${c.name}" (ID: ${c.id})`);
    console.log(`    zone=${c.zone}, type=${c.client_type}, created=${c.created_at}`);
    console.log(`    stock_cuarzo=${c.stock_cuarzo}, stock_llampo=${c.stock_llampo}`);
    console.log(`    cumulative_cuarzo=${c.cumulative_cuarzo}, cumulative_llampo=${c.cumulative_llampo}`);
    console.log(`    last_intake_date=${c.last_intake_date}, last_intake_zone=${c.last_intake_zone}`);

    const { data: batches } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('client_id', c.id)
      .order('created_at');

    console.log(`    BATCHES (${batches?.length || 0}):`);
    for (const b of (batches || [])) {
      console.log(`      [${b.created_at}] ${b.sub_mineral} init=${b.initial_quantity} remain=${b.remaining_quantity} zone=${b.zone} type=${b.mineral_type}`);
    }

    const { data: logs } = await supabase
      .from('milling_logs')
      .select('*')
      .eq('client_id', c.id)
      .order('created_at');

    console.log(`    MILLING LOGS (${logs?.length || 0}):`);
    for (const l of (logs || [])) {
      console.log(`      [${l.created_at}] sacks=${l.total_sacks} cuarzo=${l.total_cuarzo} llampo=${l.total_llampo} mineral=${l.mineral_type}`);
    }
  }
}

async function main() {
  await auditClient('Filomena');
  await auditClient('Cinthia');
  await auditClient('Saúl');
}

main().catch(console.error);
