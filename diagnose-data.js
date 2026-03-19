import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function diagnose() {
  console.log("========================================");
  console.log("DIAGNÓSTICO COMPLETO DE DATOS");
  console.log("========================================\n");

  // 1. FILOMENA
  console.log("=== FILOMENA ===");
  const { data: filomenaClients } = await supabase
    .from('clients')
    .select('*')
    .ilike('name', '%filomena%');
  
  for (const c of (filomenaClients || [])) {
    console.log(`\nCliente: ${c.name} (ID: ${c.id})`);
    console.log(`  zone=${c.zone}, type=${c.client_type}`);
    console.log(`  stock_cuarzo=${c.stock_cuarzo}, stock_llampo=${c.stock_llampo}`);
    console.log(`  cumulative_cuarzo=${c.cumulative_cuarzo}, cumulative_llampo=${c.cumulative_llampo}`);
    console.log(`  last_intake_date=${c.last_intake_date}`);
    console.log(`  last_intake_zone=${c.last_intake_zone}`);
    console.log(`  is_active=${c.is_active}`);
    console.log(`  created_at=${c.created_at}`);

    // Batches
    const { data: batches } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('client_id', c.id)
      .order('created_at', { ascending: true });
    
    console.log(`\n  STOCK BATCHES (${batches?.length || 0}):`);
    for (const b of (batches || [])) {
      console.log(`    [${b.created_at}] ${b.sub_mineral} initial=${b.initial_quantity} remaining=${b.remaining_quantity} zone=${b.zone} mineral=${b.mineral_type} (id=${b.id})`);
    }

    // Milling logs
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

  // 2. ALL CLIENTS - summary of who has batches and who doesn't  
  console.log("\n\n========================================");
  console.log("=== RESUMEN DE TODOS LOS CLIENTES ===");
  console.log("========================================\n");
  
  const { data: allClients } = await supabase
    .from('clients')
    .select('*')
    .order('name');
  
  for (const c of (allClients || [])) {
    const { data: batches, count: batchCount } = await supabase
      .from('stock_batches')
      .select('*', { count: 'exact' })
      .eq('client_id', c.id);
    
    const { count: logCount } = await supabase
      .from('milling_logs')
      .select('*', { count: 'exact' })
      .eq('client_id', c.id);
    
    const totalCum = (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0);
    const totalStock = (c.stock_cuarzo || 0) + (c.stock_llampo || 0);
    
    const hasIssue = totalCum > 0 && (batchCount === 0);
    const flag = hasIssue ? ' ⚠️ NO BATCHES BUT HAS CUMULATIVE!' : '';
    
    console.log(`${c.name}: stock=${totalStock} cum=${totalCum} batches=${batchCount || 0} logs=${logCount || 0} zone=${c.zone}${flag}`);
  }

  // 3. MILLS - Check hours
  console.log("\n\n========================================");
  console.log("=== ESTADO DE MOLINOS ===");
  console.log("========================================\n");
  
  const { data: mills } = await supabase
    .from('mills')
    .select('*')
    .order('name');
  
  for (const m of (mills || [])) {
    console.log(`${m.name}: status=${m.status} total_hours=${m.total_hours_worked} oil_hours=${m.oil_change_hours} capacity=${m.capacity}`);
    if (m.current_client_id) {
      console.log(`  Current client: ${m.current_client_id} sacks=${m.sacks_processing}`);
    }
  }
}

diagnose().catch(console.error);
