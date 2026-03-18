import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .ilike('name', '%Niño %');
    
  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
    return;
  }
  
  console.log("CLIENTS:");
  console.log(JSON.stringify(clients, null, 2));
  
  for (const client of clients) {
    const { data: batches } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('client_id', client.id);
    console.log(`\nBATCHES FOR ${client.name}:`);
    console.log(JSON.stringify(batches, null, 2));
  }
}

inspectData().catch(console.error);
