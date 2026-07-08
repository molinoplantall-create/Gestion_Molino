import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const req = await fetch(`${supabaseUrl}/rest/v1/milling_logs?limit=1`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const result = await req.json();
  console.log("Milling logs data:", result);
  if (result.length > 0) {
    console.log("Columns:", Object.keys(result[0]));
  }
}

check().catch(console.error);
