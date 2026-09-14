import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const req = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
    headers: { Authorization: `Bearer ${supabaseKey}` }
  });
  const schema = await req.json();
  const defs = schema.definitions || schema.components?.schemas;
  for (const table of ['clients', 'milling_logs', 'stock_batches', 'maintenance_logs', 'mills']) {
    if (defs[table]) {
      console.log(`\nTable ${table} columns:`, Object.keys(defs[table].properties).join(', '));
    }
  }
}

check().catch(console.error);
