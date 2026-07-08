import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMillingLogs() {
  const { data: logs, error } = await supabase
    .from('milling_logs')
    .select('id, mill_id, duration_hours, created_at, status')
    .limit(5);
  
  if (error) {
    console.error("Error fetching logs:", error);
  } else {
    console.log("Milling logs sample:", logs);
  }
}

checkMillingLogs().catch(console.error);
