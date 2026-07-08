import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, count, error } = await supabase
    .from('milling_logs')
    .select('*', { count: 'exact' });
  console.log("Total logs in milling_logs:", count, data ? data.length : 0);
  if (error) console.error("Error:", error);
}

check().catch(console.error);
