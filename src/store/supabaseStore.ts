import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Mill, Client, MillingLog } from '@/types';

interface SupabaseStore {
  mills: Mill[];
  clients: Client[];
  millingLogs: MillingLog[];
  maintenanceLogs: any[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchMills: () => Promise<void>;
  fetchClients: () => Promise<void>;
  fetchMillingLogs: (limit?: number) => Promise<void>;
  fetchMaintenanceLogs: () => Promise<void>;
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
  registerMaintenance: (data: any) => Promise<boolean>;
  updateMillStatus: (id: string, status: string) => Promise<void>;
  addClientStock: (clientId: string, cuarzo: number, llampo: number) => Promise<boolean>;
}

export const useSupabaseStore = create<SupabaseStore>((set, get) => ({
  mills: [],
  clients: [],
  millingLogs: [],
  maintenanceLogs: [],
  loading: false,
  error: null,

  fetchMills: async () => {
    set({ loading: true, error: null });
    try {
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

  fetchMaintenanceLogs: async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select(`
          *,
          mills (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ maintenanceLogs: data || [] });
    } catch (error: any) {
      console.error('❌ Error fetchMaintenanceLogs:', error);
    }
  },

  registerMilling: async (data) => {
    set({ loading: true, error: null });
    try {
      const { data: clientData, error: clientFetchError } = await supabase
        .from('clients')
        .select('stock_cuarzo, stock_llampo')
        .eq('id', data.clientId)
        .single();

      if (clientFetchError) throw clientFetchError;

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

      const millUpdates = data.mills.map(async (m) => {
        return supabase
          .from('mills')
          .update({
            status: 'ocupado',
            current_client_id: data.clientId,
            current_cuarzo: m.cuarzo,
            current_llampo: m.llampo,
            start_time: new Date().toISOString(),
          })
          .eq('id', m.id);
      });

      await Promise.all(millUpdates);

      await get().fetchMills();
      await get().fetchClients();
      await get().fetchMillingLogs(10);

      return true;
    } catch (error: any) {
      console.error('❌ Error registerMilling:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  registerMaintenance: async (data) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('maintenance_logs')
        .insert(data);

      if (error) throw error;

      await get().fetchMaintenanceLogs();
      return true;
    } catch (error: any) {
      console.error('❌ Error registerMaintenance:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  updateMillStatus: async (id, status) => {
    try {
      const updateData: any = { status };
      if (status === 'libre') {
        updateData.current_cuarzo = 0;
        updateData.current_llampo = 0;
        updateData.current_client_id = null;
        updateData.current_client = null;
      }

      await supabase.from('mills').update(updateData).eq('id', id);
      get().fetchMills();
    } catch (error) {
      console.error('Error updating mill status:', error);
    }
  },

  addClientStock: async (clientId: string, cuarzo: number, llampo: number) => {
    set({ loading: true, error: null });
    try {
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('stock_cuarzo, stock_llampo')
        .eq('id', clientId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('clients')
        .update({
          stock_cuarzo: (client.stock_cuarzo || 0) + cuarzo,
          stock_llampo: (client.stock_llampo || 0) + llampo,
        })
        .eq('id', clientId);

      if (updateError) throw updateError;

      await get().fetchClients();
      return true;
    } catch (error: any) {
      console.error('❌ Error addClientStock:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  }
}));