import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Mill, Client, MillingLog, Zone } from '@/types';

interface SupabaseStore {
  mills: Mill[];
  clients: Client[];
  zones: Zone[];
  millingLogs: MillingLog[];
  maintenanceLogs: any[];
  clientsCount: number;
  logsCount: number;
  loading: boolean;
  millsLoading: boolean;
  clientsLoading: boolean;
  zonesLoading: boolean;
  logsLoading: boolean;
  error: string | null;

  // Actions
  fetchMills: () => Promise<void>;
  fetchClients: (options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    zone?: string;
  }) => Promise<void>;
  fetchZones: () => Promise<void>;
  fetchMillingLogs: (options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    millId?: string;
    mineralType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number; // legacy support
  }) => Promise<void>;
  fetchMaintenanceLogs: (options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    millId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
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
  updateClient: (id: string, clientData: Partial<Client>) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;
  addClientStock: (clientId: string, cuarzo: number, llampo: number, zone?: string, mineralType?: string) => Promise<boolean>;
  addZone: (name: string) => Promise<boolean>;
  updateZone: (id: string, name: string) => Promise<boolean>;
  deleteZone: (id: string) => Promise<boolean>;
}

export const useSupabaseStore = create<SupabaseStore>((set, get) => ({
  mills: [],
  clients: [],
  zones: [],
  millingLogs: [],
  maintenanceLogs: [],
  clientsCount: 0,
  logsCount: 0,
  loading: false,
  millsLoading: false,
  clientsLoading: false,
  zonesLoading: false,
  logsLoading: false,
  error: null,

  fetchMills: async () => {
    set({ millsLoading: true, error: null });
    try {
      // First try to fetch all data without a specific order to avoid crashing if 'name' doesn't exist
      const { data, error } = await supabase
        .from('mills')
        .select('*');

      if (error) {
        console.error('❌ Supabase error in fetchMills:', error);
        throw error;
      }

      if (!data) {
        set({ mills: [] });
        return;
      }

      // Normalize data: handle both 'name' and 'nombre' columns
      const normalizedMills = (data as any[]).map(m => ({
        ...m,
        name: m.name || m.nombre || `Molino ${m.id}`
      })) as Mill[];

      // Sort alphabetically by name
      normalizedMills.sort((a, b) => a.name.localeCompare(b.name));

      set({ mills: normalizedMills });
      console.log('✅ store: mills loaded and normalized:', normalizedMills.length);
    } catch (error: any) {
      console.error('❌ Error fetchMills:', error);
      set({ error: error.message });
    } finally {
      set({ millsLoading: false });
    }
  },

  fetchClients: async (options = {}) => {
    const { page = 1, pageSize = 20, search, status, zone } = options;
    set({ clientsLoading: true, error: null });
    try {
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' });

      if (status && status !== 'all') {
        const isActive = status === 'ACTIVO';
        query = query.eq('is_active', isActive);
      } else {
        query = query.eq('is_active', true);
      }

      if (zone && zone !== 'all') {
        query = query.eq('zone', zone);
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('name')
        .range(from, to);

      if (error) throw error;
      set({ clients: data as Client[], clientsCount: count || 0 });
    } catch (error: any) {
      console.error('❌ Error fetchClients:', error);
      set({ error: error.message });
    } finally {
      set({ clientsLoading: false });
    }
  },

  fetchZones: async () => {
    set({ zonesLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .order('name');

      if (error) throw error;
      set({ zones: data as Zone[] });
    } catch (error: any) {
      console.error('❌ Error fetchZones:', error);
      set({ error: error.message });
    } finally {
      set({ zonesLoading: false });
    }
  },

  fetchMillingLogs: async (options = {}) => {
    // Handle both legacy (number as limit) and new options object
    let page = 1;
    let pageSize = 20;
    let search = '';
    let status = 'all';
    let millId = '';
    let mineralType = '';
    let startDate = '';
    let endDate = '';

    if (typeof options === 'number') {
      pageSize = options;
    } else {
      page = options.page || 1;
      pageSize = options.pageSize || options.limit || 20;
      search = options.search || '';
      status = options.status || 'all';
      millId = options.millId || '';
      mineralType = options.mineralType || '';
      startDate = options.startDate || '';
      endDate = options.endDate || '';
    }

    set({ logsLoading: true, error: null });
    try {
      let query = supabase
        .from('milling_logs')
        .select(`
          *,
          clients (
            name
          )
        `, { count: 'exact' });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`observations.ilike.%${search}%,mineral_type.ilike.%${search}%`);
      }

      if (millId && millId !== 'all') {
        // mills_used is a jsonb array, searching for mill_id inside it
        query = query.contains('mills_used', [{ mill_id: millId }]);
      }

      if (mineralType && mineralType !== 'all') {
        query = query.eq('mineral_type', mineralType);
      }

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }

      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      set({ millingLogs: data || [], logsCount: count || 0 });
    } catch (error: any) {
      console.error('❌ Error fetchMillingLogs:', error);
      set({ error: error.message });
    } finally {
      set({ logsLoading: false });
    }
  },

  fetchMaintenanceLogs: async (options = {}) => {
    const { page = 1, pageSize = 20, search, millId, startDate, endDate } = options;
    set({ loading: true, error: null });
    try {
      let query = supabase
        .from('maintenance_logs')
        .select(`
          *,
          mills (
            name
          )
        `, { count: 'exact' });

      if (millId && millId !== 'all') {
        query = query.eq('mill_id', millId);
      }

      if (search) {
        query = query.ilike('description', `%${search}%`);
      }

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }

      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      set({ maintenanceLogs: data || [] });
    } catch (error: any) {
      console.error('❌ Error fetchMaintenanceLogs:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
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
      await get().fetchMillingLogs({ pageSize: 10 });

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

  updateClient: async (id, clientData) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', id);

      if (error) throw error;
      await get().fetchClients();
      return true;
    } catch (error: any) {
      console.error('❌ Error updateClient:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  deleteClient: async (id) => {
    set({ loading: true, error: null });
    try {
      // Soft delete: just set is_active to false
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      await get().fetchClients();
      return true;
    } catch (error: any) {
      console.error('❌ Error deleteClient:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  addClientStock: async (clientId, cuarzo, llampo, zone, mineralType) => {
    set({ loading: true, error: null });
    try {
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('stock_cuarzo, stock_llampo')
        .eq('id', clientId)
        .single();

      if (fetchError) throw fetchError;

      const updateData: any = {
        stock_cuarzo: (client.stock_cuarzo || 0) + cuarzo,
        stock_llampo: (client.stock_llampo || 0) + llampo,
        last_intake_date: new Date().toISOString(),
      };

      if (zone) {
        updateData.last_intake_zone = zone;
      }

      if (mineralType) {
        updateData.last_mineral_type = mineralType;
      }

      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
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
  },

  addZone: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('zones')
        .insert({ name });

      if (error) throw error;

      await get().fetchZones();
      return true;
    } catch (error: any) {
      console.error('❌ Error addZone:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  updateZone: async (id: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('zones')
        .update({ name })
        .eq('id', id);

      if (error) throw error;

      await get().fetchZones();
      return true;
    } catch (error: any) {
      console.error('❌ Error updateZone:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  deleteZone: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('zones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await get().fetchZones();
      return true;
    } catch (error: any) {
      console.error('❌ Error deleteZone:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  }
}));