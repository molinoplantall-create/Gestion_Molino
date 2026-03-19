import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkOtherTables() {
  console.log("=== CHECKING 'stock' TABLE ===");
  const { data: stockData, error: stockErr } = await supabase.from('stock').select('*').limit(10);
  if (stockErr) console.log("Error or missing 'stock' table:", stockErr.message);
  else console.log(`'stock' rows: ${stockData.length}`, stockData);

  console.log("\n=== CHECKING 'maintenance' TABLE ===");
  const { data: maintData, error: maintErr } = await supabase.from('maintenance').select('*').limit(10);
  if (maintErr) console.log("Error or missing 'maintenance' table:", maintErr.message);
  else console.log(`'maintenance' rows: ${maintData.length}`, maintData);

  console.log("\n=== CHECKING 'milling_logs' RAW ===");
  const { data: rawLogs, error: rawErr } = await supabase.from('milling_logs').select('*');
  if (rawErr) console.log("Error 'milling_logs':", rawErr.message);
  else console.log(`'milling_logs' RAW count: ${rawLogs?.length || 0}`);
}

checkOtherTables().catch(console.error);
