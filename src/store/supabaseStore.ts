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
  cleanupHistoricalLogs: () => Promise<void>;
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
      fecha?: string;
      horaInicioISO?: string;
      horaFinISO?: string;
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
  seedMills: () => Promise<boolean>;
  checkAndLiberateMills: (millsToProcess: Mill[]) => Promise<void>;
  finalizeMilling: (millId: string) => Promise<boolean>;
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
        .select(`
        *,
        clients:current_client_id ( name )
      `);

      if (error) {
        console.error('❌ Supabase error in fetchMills:', error);
        throw error;
      }

      if (!data) {
        set({ mills: [] });
        return;
      }

      // Normalize data: only handle essential defaults
      const normalizedMills = (data as any[]).map(m => ({
        ...m,
        name: m.name || `Molino ${m.id}`,
        status: (m.status || 'LIBRE').toUpperCase(),
        capacity: m.capacity || 150,
        horas_trabajadas: m.total_hours_worked || 0,
        sacks_processing: m.sacks_processing || 0,
        current_sacks: m.sacks_processing || 0,
        current_client: m.clients?.name || null,
        current_client_id: m.current_client_id || null
      })) as Mill[];

      // Sort alphabetically by name
      normalizedMills.sort((a, b) => a.name.localeCompare(b.name));

      set({ mills: normalizedMills });
      console.log('✅ store: mills loaded and normalized:', normalizedMills.length);

      // Liberar molinos automáticamente si ya terminó su tiempo
      await get().checkAndLiberateMills(normalizedMills);
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

  cleanupHistoricalLogs: async () => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Inicio del día de hoy

      const { error } = await supabase
        .from('milling_logs')
        .update({ status: 'FINALIZADO' })
        .eq('status', 'IN_PROGRESS')
        .lt('created_at', now.toISOString());

      if (error) console.error('⚠️ store: error cleaning up historical logs:', error);
      else console.log('✅ store: historical logs cleaned up successfully.');
    } catch (error) {
      console.error('❌ Error cleanupHistoricalLogs:', error);
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
      // Clean up historical logs before fetching
      await get().cleanupHistoricalLogs();

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

      const isHistorical = data.fecha && new Date(data.fecha).toDateString() !== new Date().toDateString();

      const { data: millingData, error: millingError } = await supabase
        .from('milling_logs')
        .insert({
          client_id: data.clientId,
          mineral_type: data.mineralType,
          total_sacks: data.totalSacos,
          total_cuarzo: data.totalCuarzo,
          total_llampo: data.totalLlampo,
          mills_used: data.mills,
          status: isHistorical ? 'FINALIZADO' : 'IN_PROGRESS',
          observations: data.observations || '',
          created_at: data.fecha || new Date().toISOString()
        })
        .select()
        .single();

      if (millingError) throw millingError;

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
        // Si es una fecha pasada, asumimos que es solo un registro histórico y no ocupamos el molino hoy.
        if (isHistorical) return Promise.resolve({ error: null });

        const updateData = {
          status: 'OCUPADO',
          current_client_id: data.clientId,
          current_cuarzo: m.cuarzo,
          current_llampo: m.llampo,
          start_time: data.horaInicioISO || new Date().toISOString(),
          estimated_end_time: data.horaFinISO || null,
          sacks_processing: m.total || 0,
        };

        let { error: millError } = await supabase
          .from('mills')
          .update(updateData)
          .eq('id', m.id);

        // FALLBACK PGRST204: Si faltan columnas de tiempo, reintentar sin ellas
        if (millError && millError.code === 'PGRST204') {
          console.warn('⚠️ store: missing time columns in mills table, retrying basic update...', m.id);
          const { estimated_end_time, start_time, ...basicData } = updateData as any;
          const { error: retryError } = await supabase
            .from('mills')
            .update(basicData)
            .eq('id', m.id);
          millError = retryError;
        }

        if (millError) throw millError;
        return { error: null };
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

  checkAndLiberateMills: async (millsToProcess) => {
    const now = new Date();
    // Gracia de 2 minutos para no ser tan estrictos
    const gracePeriod = 2 * 60 * 1000;

    const millsToLiberate = millsToProcess.filter(m =>
      m.status === 'OCUPADO' &&
      m.estimated_end_time &&
      new Date(m.estimated_end_time).getTime() + gracePeriod < now.getTime()
    );

    if (millsToLiberate.length === 0) return;

    console.log(`🕒 store: Liberando automáticamente ${millsToLiberate.length} molinos...`);

    try {
      for (const mill of millsToLiberate) {
        // 1. Liberar el molino
        const { error: millError } = await supabase
          .from('mills')
          .update({
            status: 'LIBRE',
            current_client_id: null,
            current_cuarzo: 0,
            current_llampo: 0,
            start_time: null,
            estimated_end_time: null,
            sacks_processing: 0
          })
          .eq('id', mill.id);

        if (millError) console.error(`Error liberando molino ${mill.name}:`, millError);

        // 2. Marcar la molienda como FINALIZADO si sigue IN_PROGRESS
        const { error: logError } = await supabase
          .from('milling_logs')
          .update({ status: 'FINALIZADO' })
          .eq('client_id', mill.current_client_id)
          .eq('status', 'IN_PROGRESS')
          .contains('mills_used', [{ id: mill.id }]);

        if (logError) console.error(`Error finalizando log para molino ${mill.name}:`, logError);
      }

      // Volver a cargar para reflejar cambios
      const { data: updatedMills, error: refetchError } = await supabase
        .from('mills')
        .select('*, clients:current_client_id ( name )');

      if (!refetchError && updatedMills) {
        const normalized = updatedMills.map(m => ({
          ...m,
          name: m.name || `Molino ${m.id}`,
          status: (m.status || 'LIBRE').toUpperCase(),
          capacity: m.capacity || 150,
          current_client: m.clients?.name || null
        })) as Mill[];
        set({ mills: normalized });
      }

    } catch (e) {
      console.error('Error in checkAndLiberateMills:', e);
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
      const updateData: any = {};
      if (status === 'libre' || status === 'LIBRE') {
        updateData.status = 'LIBRE';
        updateData.current_client_id = null;
        updateData.current_cuarzo = 0;
        updateData.current_llampo = 0;
        updateData.start_time = null;
        updateData.estimated_end_time = null;
        updateData.sacks_processing = 0;
      } else {
        updateData.status = status.toUpperCase();
      }

      let { error } = await supabase.from('mills').update(updateData).eq('id', id);

      // FALLBACK: Si hay columnas inexistentes
      if (error && error.code === 'PGRST204') {
        const { estimated_end_time, start_time, ...basicData } = updateData;
        const { error: retryError } = await supabase.from('mills').update(basicData).eq('id', id);
        error = retryError;
      }

      if (error) throw error;
      get().fetchMills();
    } catch (error) {
      console.error('Error updating mill status:', error);
    }
  },

  finalizeMilling: async (millId: string) => {
    set({ loading: true });
    try {
      const mill = get().mills.find(m => m.id === millId);
      if (!mill) return false;

      // 1. Liberar el molino
      const updateData = {
        status: 'LIBRE',
        current_client_id: null,
        current_cuarzo: 0,
        current_llampo: 0,
        start_time: null,
        estimated_end_time: null,
        sacks_processing: 0
      };

      let { error: millError } = await supabase
        .from('mills')
        .update(updateData)
        .eq('id', millId);

      // FALLBACK PGRST204: Si faltan columnas de tiempo, reintentar sin ellas
      if (millError && millError.code === 'PGRST204') {
        console.warn('⚠️ store: estimated_end_time missing, retrying basic liberation...', millId);
        const { estimated_end_time, start_time, ...basicData } = updateData as any;
        const { error: retryError } = await supabase
          .from('mills')
          .update(basicData)
          .eq('id', millId);
        millError = retryError;
      }

      if (millError) throw millError;

      // 2. Marcar el log como FINALIZADO si es el cliente actual
      if (mill.current_client_id) {
        const { error: logError } = await supabase
          .from('milling_logs')
          .update({ status: 'FINALIZADO' })
          .eq('client_id', mill.current_client_id)
          .eq('status', 'IN_PROGRESS')
          .contains('mills_used', [{ id: millId }]);

        if (logError) console.error('Error finalizing log:', logError);
      }

      await get().fetchMills();
      await get().fetchMillingLogs({ pageSize: 12 });
      return true;
    } catch (error: any) {
      console.error('Error finalizeMilling:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
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
    console.log('🔄 store: addClientStock started', { clientId, cuarzo, llampo, zone, mineralType });
    set({ loading: true, error: null });
    try {
      console.log('📡 store: Fetching client current stock...');
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('stock_cuarzo, stock_llampo')
        .eq('id', clientId)
        .single();

      if (fetchError) {
        console.error('❌ store: Error fetching client:', fetchError);
        throw fetchError;
      }

      console.log('📈 store: Calculating new stock totals...', client);
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

      console.log('💾 store: Updating client in Supabase...', updateData);
      let { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

      // FALLBACK: If columns are missing (Error PGRST204), try updating only the stock
      if (updateError && updateError.code === 'PGRST204') {
        console.warn('⚠️ store: Missing tracking columns in DB. Falling back to basic stock update...');
        const basicUpdateData = {
          stock_cuarzo: updateData.stock_cuarzo,
          stock_llampo: updateData.stock_llampo,
        };
        console.log('💾 store: Retrying basic update...', basicUpdateData);
        const { error: retryError } = await supabase
          .from('clients')
          .update(basicUpdateData)
          .eq('id', clientId);

        updateError = retryError;

        if (!retryError) {
          console.log('✅ store: Basic stock update successful (fallback).');
        }
      }

      if (updateError) {
        console.error('❌ store: Error updating client stock:', updateError);
        throw updateError;
      }

      console.log('✅ store: Stock updated successfully. Refreshing clients list...');
      await get().fetchClients();
      console.log('✨ store: Client list refreshed.');
      return true;
    } catch (error: any) {
      console.error('❌ store: catch in addClientStock:', error);
      set({ error: error.message });
      return false;
    } finally {
      console.log('🏁 store: addClientStock finally block reached.');
      set({ loading: false });
    }
  },

  addZone: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('zones')
        .insert({ name: name });

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
        .update({ name: name })
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

      // Limpiar logs antiguos que se quedaron "En Proceso"
      await get().cleanupHistoricalLogs();

      set({ zones: get().zones.filter(z => z.id !== id) });
      return true;
    } catch (error) {
      console.error('❌ Error deleteZone:', error);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  seedMills: async () => {
    try {
      const defaultMills = [
        { name: 'Molino I', status: 'LIBRE', capacity: 150, total_hours_worked: 0, sacks_processing: 0 },
        { name: 'Molino II', status: 'LIBRE', capacity: 150, total_hours_worked: 0, sacks_processing: 0 },
        { name: 'Molino III', status: 'LIBRE', capacity: 150, total_hours_worked: 0, sacks_processing: 0 },
        { name: 'Molino IV', status: 'LIBRE', capacity: 150, total_hours_worked: 0, sacks_processing: 0 }
      ];

      const { error } = await supabase
        .from('mills')
        .insert(defaultMills);

      if (error) throw error;

      await get().fetchMills();
      return true;
    } catch (error) {
      console.error('❌ Error seedMills:', error);
      return false;
    }
  }
}));