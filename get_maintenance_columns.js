import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('maintenance_logs').select('*').limit(1);
  if (error) console.error(error);
  else if (data && data.length > 0) {
    console.log("Columns from data:", Object.keys(data[0]));
  } else {
    console.log("No data returned, fetching OpenAPI schema...");
    const req = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
      headers: { Authorization: `Bearer ${supabaseKey}` }
    });
    const schema = await req.json();
    console.log("Schema definitions/components:", schema.definitions ? Object.keys(schema.definitions.maintenance_logs.properties) : (schema.components ? Object.keys(schema.components.schemas.maintenance_logs.properties) : 'Unknown schema format'));
  }
}

check().catch(console.error);
