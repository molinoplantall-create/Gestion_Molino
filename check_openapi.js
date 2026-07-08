import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function check() {
  const req = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
    headers: { Authorization: `Bearer ${supabaseKey}` }
  });
  const text = await req.text();
  console.log("Raw response:", text.substring(0, 500));
}

check().catch(console.error);
