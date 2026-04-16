const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkMaintenanceLogs() {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .select('*')
    .limit(1);
    
  console.log("Maintenance logs data:", data);
  console.log("Error:", error);
}

checkMaintenanceLogs();
