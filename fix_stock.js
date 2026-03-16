import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStock() {
  console.log('Fetching all clients...');
  const { data: clients, error: clientsError } = await supabase.from('clients').select('id, name');
  if (clientsError) throw clientsError;

  for (const client of clients) {
    // Calculate actual stock from stock_batches
    const { data: batches, error: batchesError } = await supabase
      .from('stock_batches')
      .select('sub_mineral, remaining_quantity')
      .eq('client_id', client.id);
    
    if (batchesError) throw batchesError;

    let totalCuarzo = 0;
    let totalLlampo = 0;

    for (const batch of batches) {
      if (batch.sub_mineral === 'CUARZO') {
        totalCuarzo += batch.remaining_quantity;
      } else if (batch.sub_mineral === 'LLAMPO') {
        totalLlampo += batch.remaining_quantity;
      }
    }

    // Also get the current values to see if they differ
    const { data: currentClient, error: getError } = await supabase
      .from('clients')
      .select('stock_cuarzo, stock_llampo')
      .eq('id', client.id)
      .single();

    if (currentClient.stock_cuarzo !== totalCuarzo || currentClient.stock_llampo !== totalLlampo) {
      console.log(`Fixing stock for ${client.name} (ID: ${client.id})`);
      console.log(`  Current: Cuarzo=${currentClient.stock_cuarzo}, Llampo=${currentClient.stock_llampo}`);
      console.log(`  Real:    Cuarzo=${totalCuarzo}, Llampo=${totalLlampo}`);
      
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          stock_cuarzo: totalCuarzo,
          stock_llampo: totalLlampo
        })
        .eq('id', client.id);
        
      if (updateError) {
        console.error(`  Error updating ${client.name}:`, updateError);
      } else {
        console.log(`  Successfully updated ${client.name}.`);
      }
    }
  }
  console.log('Done fixing stock.');
}

fixStock().catch(console.error);
