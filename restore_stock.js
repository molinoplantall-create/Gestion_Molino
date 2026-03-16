import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
  const fixes = JSON.parse(fs.readFileSync('recalc.json', 'utf8'));
  for (const client of fixes) {
    console.log(`Restoring ${client.name} - Cuarzo: ${client.calcCuarzo}, Llampo: ${client.calcLlampo}`);
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        stock_cuarzo: client.calcCuarzo,
        stock_llampo: client.calcLlampo
      })
      .eq('id', client.id);

    if (updateError) {
      console.error(`Error restoring ${client.name}:`, updateError);
    } else {
      console.log(`Success restoring ${client.name}`);
    }
  }
}

restore().catch(console.error);
