import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fullAudit() {
  // 1. Fetch ALL clients (no pagination)
  const { data: allClients, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');
  
  if (error) { console.error(error); return; }
  
  console.log(`Total clients in DB: ${allClients.length}\n`);
  
  // 2. Simulate what the Dashboard chart CURRENTLY computes (deployed code uses stock_cuarzo + stock_llampo)
  const zoneDataOld = {};
  const zoneDataNew = {};
  
  allClients.forEach(c => {
    const volumeOld = (c.stock_cuarzo || 0) + (c.stock_llampo || 0);
    const volumeNew = (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0);
    const zone = c.zone || 'SIN ZONA';
    
    if (volumeOld > 0) {
      zoneDataOld[zone] = (zoneDataOld[zone] || 0) + volumeOld;
    }
    if (volumeNew > 0) {
      zoneDataNew[zone] = (zoneDataNew[zone] || 0) + volumeNew;
    }
  });
  
  console.log("=== CHART (OLD CODE - stock_cuarzo + stock_llampo) ===");
  Object.entries(zoneDataOld).sort((a,b) => b[1] - a[1]).forEach(([zone, val]) => {
    console.log(`  ${zone}: ${val}`);
  });
  
  console.log("\n=== CHART (NEW CODE - cumulative_cuarzo + cumulative_llampo) ===");
  Object.entries(zoneDataNew).sort((a,b) => b[1] - a[1]).forEach(([zone, val]) => {
    console.log(`  ${zone}: ${val}`);
  });
  
  // 3. Show ALL clients in zone "Niño Jesús" 
  console.log("\n=== CLIENTS IN ZONE 'Niño Jesús' ===");
  const ninoClients = allClients.filter(c => c.zone && c.zone.includes('Ni'));
  ninoClients.forEach(c => {
    console.log(`  ${c.name} | zone=${c.zone} | stock_c=${c.stock_cuarzo} stock_l=${c.stock_llampo} | cum_c=${c.cumulative_cuarzo} cum_l=${c.cumulative_llampo}`);
  });
  
  // 4. Check: Dashboard calls fetchClients with default pageSize=20. Show clients from position 1-20 vs all
  console.log(`\n=== PAGINATION ISSUE ===`);
  console.log(`Total clients: ${allClients.length}`);
  console.log(`Dashboard only loads: 20 (default pageSize)`);
  const first20 = allClients.slice(0, 20);
  console.log(`First 20 clients (by name order):`);
  first20.forEach((c, i) => {
    const vol = (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0);
    console.log(`  ${i+1}. ${c.name} (zone=${c.zone}) vol=${vol}`);
  });
  
  const missing = allClients.slice(20);
  if (missing.length > 0) {
    console.log(`\nClients MISSING from Dashboard (beyond page 1):`);
    missing.forEach((c, i) => {
      const vol = (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0);
      console.log(`  ${i+21}. ${c.name} (zone=${c.zone}) vol=${vol}`);
    });
  }
}

fullAudit().catch(console.error);
