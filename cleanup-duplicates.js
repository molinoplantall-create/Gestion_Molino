import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function deleteDuplicates() {
  const toDelete = [
    { id: '31b84f91-d6e0-4c00-b9f3-a2a8c5998589', name: 'Filomena  (empty duplicate)' },
    { id: 'e8b05735-0f95-4523-8b88-fb10a6e86d9c', name: 'Cinthia Champe ch (duplicate)' },
    { id: '486b39ce-95a3-4e26-8a24-bd550ba6bec3', name: 'Saúl Herrera (empty duplicate, no data)' },
  ];

  for (const client of toDelete) {
    // First delete any batches (should be 0, but just in case)
    await supabase.from('stock_batches').delete().eq('client_id', client.id);
    // Then delete any milling logs
    await supabase.from('milling_logs').delete().eq('client_id', client.id);
    // Then delete the client
    const { error } = await supabase.from('clients').delete().eq('id', client.id);
    if (error) {
      console.error(`ERROR deleting ${client.name}:`, error);
    } else {
      console.log(`DELETED: ${client.name}`);
    }
  }

  console.log('\nDone. Remaining clients:');
  const { data } = await supabase.from('clients').select('name, stock_cuarzo, stock_llampo, cumulative_cuarzo, cumulative_llampo').order('name');
  data.forEach(c => console.log(`  ${c.name} | stock: c=${c.stock_cuarzo} l=${c.stock_llampo} | cum: c=${c.cumulative_cuarzo} l=${c.cumulative_llampo}`));
}

deleteDuplicates().catch(console.error);
