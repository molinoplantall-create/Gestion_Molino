const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStuckMills() {
    console.log('🔍 Buscando molinos atascados (sin estimated_end)...');

    const { data: mills, error: fetchError } = await supabase
        .from('mills')
        .select('*')
        .eq('status', 'OCUPADO')
        .is('estimated_end', null);

    if (fetchError) {
        console.error('❌ Error buscando molinos:', fetchError);
        return;
    }

    if (!mills || mills.length === 0) {
        console.log('✅ No hay molinos atascados sin fecha final estimada.');
        return;
    }

    console.log(`⚠️ Se encontraron ${mills.length} molinos atascados. Liberando...`);

    for (const mill of mills) {
        // 1. Marcar el log de molienda como FINALIZADO si es que hay uno
        if (mill.current_client_id) {
            await supabase
                .from('milling_logs')
                .update({ status: 'FINALIZADO' })
                .eq('client_id', mill.current_client_id)
                .eq('status', 'IN_PROGRESS');
        }

        // 2. Liberar el molino
        const { error: updateError } = await supabase
            .from('mills')
            .update({
                status: 'LIBRE',
                current_client_id: null,
                current_cuarzo: 0,
                current_llampo: 0,
                start_time: null,
                estimated_end: null,
                sacks_processing: 0
            })
            .eq('id', mill.id);

        if (updateError) {
            console.error(`❌ Error liberando molino ${mill.name}:`, updateError);
        } else {
            console.log(`✅ Molino ${mill.name} liberado exitosamente.`);
        }
    }

    console.log('🎉 Proceso de limpieza terminado.');
}

fixStuckMills();
