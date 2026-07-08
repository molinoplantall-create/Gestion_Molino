import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function checkAllTables() {
  const req = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const data = await req.json();
  console.log("All routes/tables:", Object.keys(data.paths).filter(p => p.startsWith('/')));
}

checkAllTables().catch(console.error);
