import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Mill, Client, MillingLog } from '@/types';

interface SupabaseStore {
  mills: Mill[];
  clients: Client[];
  millingLogs: MillingLog[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchMills: () => Promise<void>;
  fetchClients: () => Promise<void>;
  fetchMillingLogs: (limit?: number) => Promise<void>;
  registerMilling: (
    data: {
      clientId: string;
      mineralType: 'OXIDO' | 'SULFURO';
      totalSacos: number;
      totalCuarzo: number;
      totalLlampo: number;
      mills: {
        id: string;
        cuarzo: number;
        llampo: number;
        total: number;
      }[];
      observations?: string;
    }
  ) => Promise<boolean>;
  updateMillStatus: (id: string, status: string) => Promise<void>;
}

export const useSupabaseStore = create<SupabaseStore>((set, get) => ({
  mills: [],
  clients: [],
  millingLogs: [],
  loading: false,
  error: null,

  fetchMills: async () => {
    set({ loading: true, error: null });
    try {
      // Fetch mills directly. The 'mills' table now contains all current state info
      const { data, error } = await supabase
        .from('mills')
        .select('*')
        .order('name');

      if (error) throw error;

      set({ mills: data as Mill[] });
    } catch (error: any) {
      console.error('❌ Error fetchMills:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchClients: async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      set({ clients: data as Client[] });
    } catch (error: any) {
      console.error('❌ Error fetchClients:', error);
    }
  },

  registerMilling: async (data) => {
    set({ loading: true, error: null });
    try {
      // 1. Get Client to verify stock (Double check)
      const { data: clientData, error: clientFetchError } = await supabase
        .from('clients')
        .select('stock_cuarzo, stock_llampo')
        .eq('id', data.clientId)
        .single();

      if (clientFetchError) throw clientFetchError;

      // 2. Insert into milling_logs
      // Format mills_used for JSONB
      const millsUsedJson = data.mills.map(m => ({
        mill_id: m.id,
        cuarzo: m.cuarzo,
        llampo: m.llampo
      }));

      const { error: logError } = await supabase
        .from('milling_logs')
        .insert({
          client_id: data.clientId,
          mineral_type: data.mineralType,
          total_sacks: data.totalSacos,
          total_cuarzo: data.totalCuarzo,
          total_llampo: data.totalLlampo,
          mills_used: millsUsedJson,
          status: 'IN_PROGRESS',
          observations: data.observations
        });

      if (logError) throw logError;

      // 3. Update Client Stock (Deduction)
      const newCuarzo = (clientData.stock_cuarzo || 0) - data.totalCuarzo;
      const newLlampo = (clientData.stock_llampo || 0) - data.totalLlampo;

      const { error: stockError } = await supabase
        .from('clients')
        .update({
          stock_cuarzo: Math.max(0, newCuarzo),
          stock_llampo: Math.max(0, newLlampo)
        })
        .eq('id', data.clientId);

      if (stockError) throw stockError;

      // 4. Update Mills Status & Load
      // We do this in parallel for speed
      const millUpdates = data.mills.map(async (m) => {
        return supabase
          .from('mills')
          .update({
            status: 'ocupado',
            current_client_id: data.clientId,
            // current_client name is redundant but good for quick UI read, assume we fetch it or store ID
            // Ideally we store ID. For now let's update status and current loads.
            current_cuarzo: m.cuarzo,
            current_llampo: m.llampo,
            start_time: new Date().toISOString(),
            // hours_to_oil_change decrement logic handled elsewhere or by cron
          })
          .eq('id', m.id);
      });

      await Promise.all(millUpdates);

      // Refresh data
      await get().fetchMills();
      await get().fetchClients();
      await get().fetchMillingLogs(10); // Refresh logs too

      return true;

    } catch (error: any) {
      console.error('❌ Error registerMilling:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  fetchMillingLogs: async (limit = 20) => {
    try {
      const { data, error } = await supabase
        .from('milling_logs')
        .select(`
          *,
          clients (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      set({ millingLogs: data || [] });
    } catch (error: any) {
      console.error('❌ Error fetchMillingLogs:', error);
    }
  },

  updateMillStatus: async (id, status) => {
    try {
      const updateData: any = { status };

      // If freeing up the mill, clear current load
      if (status === 'libre') {
        updateData.current_cuarzo = 0;
        updateData.current_llampo = 0;
        updateData.current_client_id = null;
        updateData.current_client = null;
      }

      await supabase.from('mills').update(updateData).eq('id', id);

      // Optimistic update or refetch
      get().fetchMills();
    } catch (error) {
      console.error('Error updating mill status:', error);
    }
  }
}));