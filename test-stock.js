import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.from('milling_logs').select('*').limit(1);
  console.log("Milling logs columns:", data && data.length ? Object.keys(data[0]) : "No data");
}

checkSchema().catch(console.error);
