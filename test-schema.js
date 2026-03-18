import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'milling_logs' });
  if (error) {
    // try selecting 1 row to get schema from error or something, or use postgrest reflection
    const req = await fetch(`${supabaseUrl}/rest/v1/milling_logs?limit=1`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const result = await req.json();
    console.log("fallback rest result:", result);
  } else {
    console.log("RPC result:", data);
  }
}
checkSchema().catch(console.error);
