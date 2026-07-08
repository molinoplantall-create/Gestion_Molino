import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: mills, error: err1 } = await supabase.from('mills').select('*').limit(1);
  console.log("Mills schema sample:", mills);
  
  const { data: millingLogs, error: err2 } = await supabase.from('milling_logs').select('*').limit(1);
  console.log("Milling Logs schema sample:", millingLogs);
}

checkSchema().catch(console.error);
