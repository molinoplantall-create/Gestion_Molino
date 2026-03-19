import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const FILOMENA_ID = '5938a980-41ed-4952-8aa7-7a21d7d37131';

async function restore() {
  console.log("=== RESTAURANDO HISTORIAL DE FILOMENA ===");

  // 1. ELIMINAR EL LOTE CONSOLIDADO ACTUAL (14 sacos)
  const { error: delError } = await supabase
    .from('stock_batches')
    .delete()
    .eq('client_id', FILOMENA_ID);
  
  if (delError) { console.error("Error eliminando lotes viejos:", delError); return; }
  console.log("Lotes antiguos eliminados.");

  // 2. INSERTAR LOS 4 INGRESOS SEGÚN CAPTURA
  const historicalBatches = [
    { sub_mineral: 'CUARZO', initial_quantity: 4, remaining_quantity: 0, zone: 'Zona Niño Jesús', created_at: '2026-01-22T10:00:00Z' },
    { sub_mineral: 'CUARZO', initial_quantity: 2, remaining_quantity: 0, zone: 'Zona Camargo', created_at: '2026-01-30T10:00:00Z' },
    { sub_mineral: 'CUARZO', initial_quantity: 4, remaining_quantity: 0, zone: 'Zona Joro', created_at: '2026-02-07T10:00:00Z' },
    { sub_mineral: 'CUARZO', initial_quantity: 4, remaining_quantity: 1, zone: 'Zona Niño Jesús', created_at: '2026-02-17T10:00:00Z' }
  ];

  console.log("insertando nuevos lotes...");
  for (const b of historicalBatches) {
    const { error } = await supabase.from('stock_batches').insert({
      client_id: FILOMENA_ID,
      mineral_type: 'OXIDO',
      ...b
    });
    if (error) console.error("Error insertando lote:", error);
  }

  // 3. INSERTAR LOGS DE MOLIENDA
  // Nota: La captura dice que se procesaron el 22/01 y el 17/02
  const logs = [
    { total_sacks: 4, total_cuarzo: 4, total_llampo: 0, created_at: '2026-01-22T15:00:00Z', observations: 'Restauración histórica (Molienda 22/01)' },
    { total_sacks: 9, total_cuarzo: 9, total_llampo: 0, created_at: '2026-02-17T15:00:00Z', observations: 'Restauración histórica (Molienda 17/02 - Acumulado)' }
  ];

  console.log("insertando logs de molienda...");
  for (const l of logs) {
    const { error } = await supabase.from('milling_logs').insert({
      client_id: FILOMENA_ID,
      mineral_type: 'OXIDO',
      status: 'FINALIZADO',
      mills_used: [], // No sabemos qué molinos se usaron
      ...l
    });
    if (error) console.error("Error insertando log:", error);
  }

  // 4. ACTUALIZAR CLIENTE (Stock actual)
  // Según diagnóstico, Filomena tiene 1 saco restante (14 inicial - 13 procesados)
  // Pero el cumulative debe ser 14.
  const { error: clientUpdate } = await supabase.from('clients').update({
    stock_cuarzo: 1,
    stock_llampo: 0,
    cumulative_cuarzo: 14,
    cumulative_llampo: 0,
    last_intake_date: '2026-02-17T10:00:00Z',
    last_intake_zone: 'Niño Jesús'
  }).eq('id', FILOMENA_ID);

  if (clientUpdate) console.error("Error actualizando cliente:", clientUpdate);
  else console.log("Cliente Filomena actualizado.");

  console.log("=== RESTAURACIÓN COMPLETADA ===");
}

restore().catch(console.error);
