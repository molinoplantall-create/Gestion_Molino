import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: logs, error } = await supabase
    .from('milling_logs')
    .select('*')
    .limit(1);
  console.log("Milling logs columns:", logs ? Object.keys(logs[0]) : error);
  
  const { data: mills, error: err2 } = await supabase
    .from('mills')
    .select('id, name, hours_to_oil_change');
  console.log("Mills:", mills);
}

check().catch(console.error);
