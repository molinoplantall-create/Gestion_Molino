import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    const { data: mills, error: fetchError } = await supabase.from('mills').select('id, name, status').limit(1);
    if (fetchError || !mills || mills.length === 0) {
        console.error('Fetch error:', fetchError);
        return;
    }

    const mill = mills[0];
    console.log('Testing update on mill:', mill.name);

    const updateData = {
        status: 'OCUPADO',
        current_cuarzo: 10,
        current_llampo: 10,
        start_time: new Date().toISOString(),
        estimated_end: new Date(Date.now() + 60000).toISOString(),
        sacks_processing: 20
    };

    const { error } = await supabase.from('mills').update(updateData).eq('id', mill.id);

    if (error) {
        console.error('UPDATE FAILED with error code:', error.code);
        console.error('Error details:', error);
    } else {
        console.log('UPDATE SUCCESSFUL without falling back to basicData!');
    }
}

testUpdate();
