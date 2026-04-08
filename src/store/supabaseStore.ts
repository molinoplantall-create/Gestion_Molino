import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Mill, Client, MillingLog, Zone, MaintenanceLog, MaintenanceUpdateData, MaintenanceRegisterData } from '@/types';
import { logger } from '@/utils/logger';

interface SupabaseStore {
  mills: Mill[];
  clients: Client[];
  allClients: Client[];
  zones: Zone[];
  millingLogs: MillingLog[];
  maintenanceLogs: MaintenanceLog[];
  maintenanceLogsCount: number;
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
  fetchAllClients: () => Promise<void>;
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
    zone?: string;
    limit?: number; // legacy support
  }) => Promise<void>;
  fetchMaintenanceLogs: (options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    millId?: string;
    startDate?: string;
    endDate?: string;
    type?: string;
    status?: string;
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
  registerMaintenance: (data: MaintenanceRegisterData) => Promise<boolean>;
  updateMillStatus: (id: string, status: string) => Promise<void>;
  updateClient: (id: string, clientData: Partial<Client>) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;
  addClientStock: (clientId: string, cuarzo: number, llampo: number, zone?: string, mineralType?: string, receptionDate?: string) => Promise<boolean>;
  addZone: (name: string) => Promise<boolean>;
  updateZone: (id: string, name: string) => Promise<boolean>;
  deleteZone: (id: string) => Promise<boolean>;
  seedMills: () => Promise<boolean>;
  checkAndLiberateMills: (millsToProcess: Mill[]) => Promise<void>;
  finalizeMilling: (millId: string) => Promise<boolean>;
  updateMillHours: (millId: string, hoursToAdd: number) => Promise<boolean>;
  finalizeMaintenance: (id: string, millId: string, details?: { action_taken?: string, worked_hours?: number, completed_at?: string }) => Promise<boolean>;
  resetMillOil: (millId: string, targetHours: number) => Promise<boolean>;
  updateMaintenanceLog: (id: string, updateData: MaintenanceUpdateData) => Promise<{ error: any }>;
  deleteMaintenanceLog: (id: string) => Promise<boolean>;
  deleteMillingLog: (logId: string) => Promise<boolean>;
  startPollingMills: () => void;
  stopPollingMills: () => void;
  isPolling: boolean;
  fetchClientBatches: (clientId: string) => Promise<any[]>;
  updateBatchMineralType: (batchId: string, mineralType: 'OXIDO' | 'SULFURO') => Promise<boolean>;
  deleteStockBatch: (batchId: string, clientId: string) => Promise<boolean>;
  updateStockBatch: (batchId: string, clientId: string, newData: { initial_quantity: number, remaining_quantity: number, zone?: string, mineral_type?: string, created_at?: string }) => Promise<boolean>;
  recalcClientStock: (clientId: string) => Promise<boolean>;
  recalcAllClientsStock: () => Promise<boolean>;
  pollingIntervalId: ReturnType<typeof setInterval> | null;
}

export const useSupabaseStore = create<SupabaseStore>((set, get) => ({
  mills: [],
  clients: [],
  allClients: [],
  zones: [],
  millingLogs: [],
  maintenanceLogs: [],
  maintenanceLogsCount: 0,
  clientsCount: 0,
  logsCount: 0,
  loading: false,
  millsLoading: false,
  clientsLoading: false,
  zonesLoading: false,
  logsLoading: false,
  isPolling: false,
  pollingIntervalId: null,
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
        logger.error('❌ Supabase error in fetchMills:', error);
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
        horas_trabajadas: m.total_hours_worked || m.horas_trabajadas || 0,
        horasTrabajadas: m.total_hours_worked || m.horas_trabajadas || 0,
        sacks_processing: m.sacks_processing || 0,
        current_sacks: m.sacks_processing || 0,
        current_client: m.clients?.name || null,
        current_client_id: m.current_client_id || null,
        current_mineral: m.current_mineral || null
      })) as Mill[];

      // Sort alphabetically by name
      normalizedMills.sort((a, b) => a.name.localeCompare(b.name));

      set({ mills: normalizedMills });
      logger.log('✅ store: mills loaded and normalized:', normalizedMills.length);

      // Liberar molinos automáticamente si ya terminó su tiempo
      await get().checkAndLiberateMills(normalizedMills);
    } catch (error: any) {
      logger.error('❌ Error fetchMills:', error);
      set({ error: error.message });
    } finally {
      set({ millsLoading: false });
    }
  },

  fetchAllClients: async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      set({ allClients: data as Client[] });
    } catch (error: any) {
      logger.error('❌ Error fetchAllClients:', error);
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
      }

      if (zone && zone !== 'all') {
        query = query.eq('zone', zone);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,phone.ilike.%${search}%,zone.ilike.%${search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('name')
        .range(from, to);

      if (error) throw error;
      set({ clients: data as Client[], clientsCount: count || 0 });
    } catch (error: any) {
      logger.error('❌ Error fetchClients:', error);
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
      logger.error('❌ Error fetchZones:', error);
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

      if (error) logger.error('⚠️ store: error cleaning up historical logs:', error);
      else logger.log('✅ store: historical logs cleaned up successfully.');
    } catch (error) {
      logger.error('❌ Error cleanupHistoricalLogs:', error);
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
    let zone = options.zone || '';

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
      zone = options.zone || '';
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
            name, contact_name, phone, zone
          )
        `, { count: 'exact' });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        // En Supabase v2, para buscar en tablas relacionadas se usa el formato 'tabla.columna'
        // Buscamos en observaciones, tipo de mineral o el nombre del cliente
        query = query.or(`observations.ilike.%${search}%,mineral_type.ilike.%${search}%,clients.name.ilike.%${search}%,clients.contact_name.ilike.%${search}%,clients.phone.ilike.%${search}%,clients.zone.ilike.%${search}%`);
      }

      if (zone && zone !== 'all') {
        // Filtrar por la zona de la tabla relacionada 'clients'
        // En Supabase, para filtrar por tabla relacionada: 'tabla(columna)'
        query = query.filter('clients.zone', 'eq', zone);
      }

      if (millId && millId !== 'all') {
        // mills_used es un array jsonb, buscamos por la propiedad correcta (id)
        query = query.contains('mills_used', [{ id: millId }]);
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

      // Normalization check: Ensure fields are mapped consistently
      const normalizedLogs = (data || []).map(log => ({
        ...log,
        total_sacks: log.total_sacks || log.cantidad_sacos || 0,
        mineral_type: log.mineral_type || log.mineral || 'OXIDO',
        sub_mineral: log.sub_mineral || 'CUARZO',
        client_id: log.client_id || log.cliente_id,
        created_at: log.created_at || log.hora_inicio || new Date().toISOString()
      }));

      set({ millingLogs: normalizedLogs as MillingLog[], logsCount: count || 0 });
    } catch (error: any) {
      logger.error('❌ Error fetchMillingLogs:', error);
      set({ error: error.message });
    } finally {
      set({ logsLoading: false });
    }
  },

  fetchMaintenanceLogs: async (options = {}) => {
    const { page = 1, pageSize = 20, search, millId, startDate, endDate, type, status } = options;
    set({ loading: true, error: null });
    try {
      logger.log('📡 store: fetching maintenance logs...', { millId, search, type, status });

      let query = supabase
        .from('maintenance_logs')
        .select(`
          *,
          mills (
            *
          )
        `, { count: 'exact' });

      if (millId && millId !== 'all') {
        // Soporte para mill_id o molino_id
        query = query.or(`mill_id.eq.${millId},molino_id.eq.${millId}`);
      }

      if (type && type !== 'all') {
        query = query.or(`type.eq.${type},tipo.eq.${type}`);
      }

      if (status && status !== 'all') {
        query = query.or(`status.eq.${status.toUpperCase()},estado.eq.${status.toUpperCase()}`);
      }

      if (search) {
        query = query.or(`description.ilike.%${search}%,descripcion_falla.ilike.%${search}%,mills.name.ilike.%${search}%`);
      }

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }

      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      // FALLBACK 404: Si maintenance_logs no existe, intentar con "Maintenance"
      if (error && ((error as any).status === 404 || error.code === 'PGRST116' || error.code === '42P01')) {
        logger.warn('⚠️ store: maintenance_logs table NOT FOUND, trying fallback "Maintenance" table...');
        const { data: retryData, count: retryCount, error: retryError } = await supabase
          .from('Maintenance' as any)
          .select('*, mills(name, nombre)', { count: 'exact' })
          .order('Created_at' as any, { ascending: false })
          .range(from, to);

        data = retryData;
        count = retryCount;
        error = retryError;
      }

      if (error) {
        logger.error('❌ Supabase error in fetchMaintenanceLogs:', error);
        throw error;
      }

      // Normalization: Mapeo de columnas español/inglés
      const normalizedLogs = ((data as any[]) || []).map((log: any) => ({
        ...log,
        id: log.id,
        mill_id: log.mill_id || log.molino_id,
        name: log.mills?.name || log.mills?.nombre || `Molino ${log.mill_id || log.molino_id}`,
        type: log.type || log.tipo || 'PREVENTIVO',
        description: log.description || log.descripcion_falla || '',
        technician_name: log.technician_name || log.asignado_a || '',
        worked_hours: log.worked_hours || log.horas_trabajadas || 0,
        status: (log.status || log.estado || 'PENDIENTE').toUpperCase(),
        failure_start_time: log.failure_start_time || null,
        completed_at: log.completed_at || null,
        created_at: log.created_at || log.fecha_registro || new Date().toISOString()
      }));

      set({ maintenanceLogs: normalizedLogs, maintenanceLogsCount: count || normalizedLogs.length });
      logger.log(`✅ store: ${normalizedLogs.length} maintenance logs loaded.`);
    } catch (error: any) {
      logger.error('❌ Error fetchMaintenanceLogs:', error);
      set({ error: error.message || 'Error al cargar mantenimientos. ¿Se ejecutó el script SQL?' });
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
      logger.log('🏁 registerMilling: 1. Cliente verificado', clientData);

      const nowDate = new Date();
      let isHistorical = false;

      if (data.fecha) {
        // Robusto: Comparar solo el componente de fecha YYYY-MM-DD
        const datePart = data.fecha.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);

        isHistorical = year < nowDate.getFullYear() ||
          (year === nowDate.getFullYear() && (month - 1) < nowDate.getMonth()) ||
          (year === nowDate.getFullYear() && (month - 1) === nowDate.getMonth() && day < nowDate.getDate());

        if (!isHistorical && data.horaFinISO) {
          if (new Date(data.horaFinISO).getTime() <= nowDate.getTime()) {
            isHistorical = true;
          }
        }

        logger.log('📅 registerMilling: date check:', {
          provided: datePart,
          today: nowDate.toISOString().split('T')[0],
          isHistorical
        });
      }

      let { data: millingData, error: millingError } = await supabase
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
        
      if (millingError && millingError.code === 'PGRST204') {
        logger.warn('⚠️ store: missing total_cuarzo columns in milling_logs table. Retrying basic insert...');
        const { error: retryError, data: retryData } = await supabase
          .from('milling_logs')
          .insert({
            client_id: data.clientId,
            mineral_type: data.mineralType,
            total_sacks: data.totalSacos,
            mills_used: data.mills,
            status: isHistorical ? 'FINALIZADO' : 'IN_PROGRESS',
            observations: data.observations || '',
            created_at: data.fecha || new Date().toISOString()
          })
          .select()
          .single();
        millingError = retryError;
        millingData = retryData;
      }

      if (millingError) throw millingError;
      logger.log('🏁 registerMilling: 2. Log de molienda creado', millingData.id);

      // --- FIFO Batch Consumption ---
      const consumeBatches = async (clientId: string, subMineral: 'CUARZO' | 'LLAMPO', totalToConsume: number) => {
        if (totalToConsume <= 0) return;

        // Fetch oldest batches first (ASC)
        const { data: batches, error: fetchBatchesError } = await supabase
          .from('stock_batches')
          .select('*')
          .eq('client_id', clientId)
          .eq('sub_mineral', subMineral)
          .gt('remaining_quantity', 0)
          .order('created_at', { ascending: true });

        if (fetchBatchesError) {
          logger.error(`❌ store: Error fetching batches for ${subMineral}:`, fetchBatchesError);
          return;
        }

        let remainingToConsume = totalToConsume;

        for (const batch of (batches || [])) {
          if (remainingToConsume <= 0) break;

          const consumption = Math.min(batch.remaining_quantity, remainingToConsume);
          const newBatchRemaining = batch.remaining_quantity - consumption;
          remainingToConsume -= consumption;

          const { error: batchUpdateError } = await supabase
            .from('stock_batches')
            .update({ remaining_quantity: newBatchRemaining })
            .eq('id', batch.id);

          if (batchUpdateError) {
            logger.error(`❌ store: Error updating batch ${batch.id}:`, batchUpdateError);
          }
        }

        if (remainingToConsume > 0) {
          logger.warn(`⚠️ store: Insufficient batch stock for ${subMineral}. Remaining: ${remainingToConsume}`);
        }
      };

      // Consume for Cuarzo and Llampo sequentially
      if (data.totalCuarzo > 0) {
        await consumeBatches(data.clientId, 'CUARZO', data.totalCuarzo);
      }
      if (data.totalLlampo > 0) {
        await consumeBatches(data.clientId, 'LLAMPO', data.totalLlampo);
      }
      logger.log('🏁 registerMilling: 3. Lotes (FIFO) consumidos');

      // 4. Recalcular stock del cliente desde lotes reales (fuente única de verdad)
      await get().recalcClientStock(data.clientId);
      logger.log('🏁 registerMilling: 4. Stock recalculado desde lotes');
      // -------------------------------

      const millUpdates = data.mills.map(async (m) => {
        // Calcular duración en horas
        let hoursToAdd = 0;
        if (data.horaInicioISO && data.horaFinISO) {
          const start = new Date(data.horaInicioISO).getTime();
          const end = new Date(data.horaFinISO).getTime();
          hoursToAdd = Number(((end - start) / (1000 * 60 * 60)).toFixed(2));
        }

        // Si es una fecha pasada, asumimos que es solo un registro histórico y no ocupamos el molino hoy.
        if (isHistorical) {
          if (hoursToAdd > 0) {
            await get().updateMillHours(m.id, hoursToAdd);
          }
          return Promise.resolve({ error: null });
        }

        const updateData = {
          status: 'OCUPADO',
          current_client_id: data.clientId,
          current_cuarzo: m.cuarzo,
          current_llampo: m.llampo,
          start_time: data.horaInicioISO || new Date().toISOString(),
          estimated_end: data.horaFinISO || null,
          sacks_processing: m.total || 0
        };

        let { error: millError } = await supabase
          .from('mills')
          .update(updateData)
          .eq('id', m.id);

        // FALLBACK PGRST204: Si faltan columnas de tiempo, reintentar sin ellas
        if (millError && millError.code === 'PGRST204') {
          logger.warn('⚠️ store: missing time columns in mills table, retrying basic update...', m.id);
          const { estimated_end, start_time, current_cuarzo, current_llampo, ...basicData } = updateData as any;
          const { error: retryError } = await supabase
            .from('mills')
            .update(basicData)
            .eq('id', m.id);
          millError = retryError;
        }

        if (millError) throw millError;
        return { error: null };
      });

      logger.log('🏁 registerMilling: 5. Iniciando actualización de molinos...', millUpdates.length);
      await Promise.all(millUpdates);
      logger.log('🏁 registerMilling: 6. Molinos actualizados');

      await Promise.all([
        get().fetchMills(),
        get().fetchClients(),
        get().fetchMillingLogs({ pageSize: 12 })
      ]);
      logger.log('🏁 registerMilling: 7. Datos de UI refrescados');

      return true;
    } catch (error: any) {
      logger.error('❌ Error registerMilling:', error);
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
      m.estimated_end &&
      new Date(m.estimated_end).getTime() + gracePeriod < now.getTime()
    );

    if (millsToLiberate.length === 0) return;

    logger.log(`🕒 store: Liberando automáticamente ${millsToLiberate.length} molinos...`);

    try {
      for (const mill of millsToLiberate) {
        // Calcular horas trabajadas antes de liberar
        if (mill.start_time && mill.estimated_end) {
          const start = new Date(mill.start_time).getTime();
          const end = new Date(mill.estimated_end).getTime();
          const hours = Number(((end - start) / (1000 * 60 * 60)).toFixed(2));
          if (hours > 0) {
            await get().updateMillHours(mill.id, hours);
          }
        }

        // 1. Liberar el molino
        const { error: millError } = await supabase
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

        if (millError) logger.error(`Error liberando molino ${mill.name}:`, millError);

        // 2. Marcar la molienda como FINALIZADO si sigue IN_PROGRESS
        const { error: logError } = await supabase
          .from('milling_logs')
          .update({ status: 'FINALIZADO' })
          .eq('client_id', mill.current_client_id)
          .eq('status', 'IN_PROGRESS')
          .contains('mills_used', [{ id: mill.id }]);

        if (logError) logger.error(`Error finalizando log para molino ${mill.name}:`, logError);
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
      logger.error('Error in checkAndLiberateMills:', e);
    }
  },

  registerMaintenance: async (data: MaintenanceRegisterData) => {
    set({ loading: true, error: null });
    try {
      // Intentar inserción estandarizada primero
      const insertData: any = {
        mill_id: data.mill_id,
        type: data.type,
        description: data.description,
        technician_name: data.technician_name,
        worked_hours: data.worked_hours,
        status: data.status || 'PENDIENTE',
        cost_pen: data.cost_pen || 0,
        cost_usd: data.cost_usd || 0,
        tasks_checklist: data.tasks_checklist || [],
        action_taken: data.action_taken || null,
        created_at: data.fechaProgramada ? `${data.fechaProgramada.split('T')[0]}T12:00:00` : new Date().toISOString()
      };

      // MTBF/MTTR: Registrar momento de falla para mantenimientos CORRECTIVOS
      if (data.type === 'CORRECTIVO') {
        insertData.failure_start_time = new Date().toISOString();
      }

      let { error } = await supabase
        .from('maintenance_logs')
        .insert(insertData);

      // FALLBACK PGRST204: Si fallan columnas inglesas, intentar modo compatibilidad (molino_id, tipo, etc)
      if (error && (error.code === 'PGRST204' || error.code === '42703')) {
        logger.warn('⚠️ store: error in registerMaintenance, retrying with fallback columns (SPANISH)...');
        const compatData = {
          molino_id: data.mill_id,
          tipo: data.type,
          descripcion_falla: data.description,
          horas_trabajadas: data.worked_hours,
          asignado_a: data.technician_name,
          estado: data.status || 'PENDIENTE',
          costo_pen: data.cost_pen || 0,
          costo_usd: data.cost_usd || 0,
          checklist: data.tasks_checklist || [],
          accion_tomada: data.action_taken || data.description // Fallback
        };
        const { error: retryError } = await supabase
          .from('maintenance_logs')
          .insert(compatData);
        error = retryError;
      }

      // FALLBACK 404: Si la tabla maintenance_logs no existe
      if (error && ((error as any).status === 404 || error.code === '42P01')) {
        logger.warn('⚠️ store: table maintenance_logs not found for insert, trying fallback "Maintenance"...');
        const { error: finalError } = await supabase
          .from('Maintenance' as any)
          .insert({
            Mill_id: data.mill_id,
            Type: data.type,
            Description: data.description,
            Technician: data.technician_name,
            Hours_taken: data.worked_hours,
            Created_at: new Date().toISOString()
          });
        error = finalError;
      }

      if (error) throw error;

      // Actualizar estado del molino a 'mantenimiento'
      await supabase
        .from('mills')
        .update({ status: 'mantenimiento' })
        .eq('id', data.mill_id);

      await get().fetchMaintenanceLogs();
      await get().fetchMills(); // Refrescar molinos
      return true;
    } catch (error: any) {
      logger.error('❌ Error registerMaintenance:', error);
      set({ error: error.message || 'Error al registrar mantenimiento. Por favor ejecute fix_maintenance_system.sql' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  updateMaintenanceLog: async (id: string, updateData: MaintenanceUpdateData) => {
    try {
      const { error } = await supabase
        .from('maintenance_logs')
        .update(updateData)
        .eq('id', id);

      return { error };
    } catch (error) {
      logger.error('Error updateMaintenanceLog:', error);
      return { error };
    }
  },

  deleteMaintenanceLog: async (id: string) => {
    try {
      // Check if the maintenance log has a mill in maintenance state
      const log = get().maintenanceLogs.find(l => l.id === id);
      
      const { error } = await supabase
        .from('maintenance_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // If the log was PENDIENTE or EN_PROCESO, check if the mill should be freed
      if (log && (log.status === 'PENDIENTE' || log.status === 'EN_PROCESO')) {
        // Check if there are other active maintenance logs for this mill
        const { data: otherLogs } = await supabase
          .from('maintenance_logs')
          .select('id')
          .eq('mill_id', log.mill_id)
          .in('status', ['PENDIENTE', 'EN_PROCESO'])
          .neq('id', id);

        if (!otherLogs || otherLogs.length === 0) {
          await supabase
            .from('mills')
            .update({ status: 'LIBRE' })
            .eq('id', log.mill_id);
        }
      }

      await get().fetchMaintenanceLogs({});
      await get().fetchMills();
      return true;
    } catch (error) {
      logger.error('❌ Error deleteMaintenanceLog:', error);
      return false;
    }
  },

  finalizeMaintenance: async (id: string, millId: string, details?: { action_taken?: string, worked_hours?: number, completed_at?: string }) => {
    set({ loading: true, error: null });
    try {
      logger.log(`🔧 store: finalizing maintenance ${id} for mill ${millId}`);

      const updatePayload: any = {
        status: 'COMPLETADO',
        completed_at: details?.completed_at || new Date().toISOString()
      };

      if (details?.action_taken) updatePayload.action_taken = details.action_taken;
      if (details?.worked_hours !== undefined) updatePayload.worked_hours = details.worked_hours;

      // 1. Actualizar el log de mantenimiento a COMPLETADO con detalles
      let { error: logError } = await supabase
        .from('maintenance_logs')
        .update(updatePayload)
        .eq('id', id);

      // Fallback a 'estado' si falla columna 'status'
      if (logError && (logError.code === 'PGRST204' || logError.code === '42703')) {
        const { error: retryError } = await supabase
          .from('maintenance_logs')
          .update({ estado: 'COMPLETADO' })
          .eq('id', id);
        logError = retryError;
      }

      if (logError) throw logError;

      // 2. Liberar el molino (volver a 'LIBRE')
      const { error: millError } = await supabase
        .from('mills')
        .update({ status: 'LIBRE' })
        .eq('id', millId);

      if (millError) throw millError;

      await get().fetchMaintenanceLogs();
      await get().fetchMills();
      return true;
    } catch (error: any) {
      logger.error('❌ Error finalizeMaintenance:', error);
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
        const { estimated_end, start_time, ...basicData } = updateData as any;
        const { error: retryError } = await supabase.from('mills').update(basicData).eq('id', id);
        error = retryError;
      }

      if (error) throw error;
      get().fetchMills();
    } catch (error) {
      logger.error('Error updating mill status:', error);
    }
  },

  finalizeMilling: async (millId: string) => {
    set({ loading: true });
    try {
      const mill = get().mills.find(m => m.id === millId);
      if (!mill) return false;

      // Calcular horas trabajadas antes de liberar
      if (mill.start_time && mill.estimated_end) {
        const start = new Date(mill.start_time).getTime();
        const end = new Date(mill.estimated_end).getTime();
        const hours = Number(((end - start) / (1000 * 60 * 60)).toFixed(2));
        if (hours > 0) {
          await get().updateMillHours(millId, hours);
        }
      }

      // 1. Liberar el molino
      const updateData = {
        status: 'LIBRE',
        current_client_id: null,
        current_cuarzo: 0,
        current_llampo: 0,
        start_time: null,
        estimated_end: null,
        sacks_processing: 0
      };

      let { error: millError } = await supabase
        .from('mills')
        .update(updateData)
        .eq('id', millId);

      // FALLBACK PGRST204: Si faltan columnas de tiempo, reintentar sin ellas
      if (millError && millError.code === 'PGRST204') {
        logger.warn('⚠️ store: estimated_end_time missing, retrying basic liberation...', millId);
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

        if (logError) logger.error('Error finalizing log:', logError);
      }

      await get().fetchMills();
      await get().fetchMillingLogs({ pageSize: 12 });
      return true;
    } catch (error: any) {
      logger.error('Error finalizeMilling:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  deleteMillingLog: async (logId: string) => {
    set({ loading: true, error: null });
    try {
      logger.log(`🗑️ store: intentando borrar molienda ${logId}`);

      // 1. Obtener detalles del log para revertir stock
      const { data: log, error: fetchError } = await supabase
        .from('milling_logs')
        .select('*')
        .eq('id', logId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Revertir stock del cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('stock_cuarzo, stock_llampo')
        .eq('id', log.client_id)
        .single();

      if (clientError) throw clientError;

      const revertedCuarzo = (client.stock_cuarzo || 0) + (log.total_cuarzo || 0);
      const revertedLlampo = (client.stock_llampo || 0) + (log.total_llampo || 0);

      const { error: stockError } = await supabase
        .from('clients')
        .update({
          stock_cuarzo: revertedCuarzo,
          stock_llampo: revertedLlampo
        })
        .eq('id', log.client_id);

      if (stockError) throw stockError;

      // 3. Si estaba IN_PROGRESS, liberar los molinos asociados
      if (log.status === 'IN_PROGRESS' || log.status === 'EN_PROCESO') {
        const millsToLiberate = log.mills_used || [];
        for (const m of millsToLiberate) {
          await supabase
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
            .eq('id', m.id);
        }
      }

      // 4. Borrar el log de forma definitiva
      const { error: deleteError } = await supabase
        .from('milling_logs')
        .delete()
        .eq('id', logId);

      if (deleteError) throw deleteError;

      logger.log('✅ store: molienda borrada y stock revertido correctamente');

      await get().fetchMillingLogs();
      await get().fetchClients();
      await get().fetchMills();

      return true;
    } catch (error: any) {
      logger.error('❌ Error deleteMillingLog:', error);
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
      logger.error('❌ Error updateClient:', error);
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
      logger.error('❌ Error deleteClient:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  addClientStock: async (clientId, cuarzo, llampo, zone, mineralType, receptionDate) => {
    set({ loading: true, error: null });
    logger.log('📡 addClientStock: Params:', { clientId, cuarzo, llampo, zone, mineralType, receptionDate });
    try {
      // Usar fecha proporcionada o ahora
      let finalDate = new Date().toISOString();
      if (receptionDate) {
        finalDate = `${receptionDate}T12:00:00Z`;
      }

      // 1. Prevenir duplicados (doble clic)
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { data: recentBatches, error: checkError } = await supabase
        .from('stock_batches')
        .select('id')
        .eq('client_id', clientId)
        .eq('initial_quantity', cuarzo > 0 ? cuarzo : llampo)
        .eq('sub_mineral', cuarzo > 0 ? 'CUARZO' : 'LLAMPO')
        .gt('created_at', oneMinuteAgo);

      if (recentBatches && recentBatches.length > 0) {
        logger.warn('⚠️ addClientStock: Intento de duplicidad detectado. Abortando.');
        throw new Error('Ya se registró un ingreso idéntico hace menos de un minuto. Por favor, espere o verifique el historial.');
      }

      logger.log('📡 store: Fetching client current stock...');
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('stock_cuarzo, stock_llampo, cumulative_cuarzo, cumulative_llampo')
        .eq('id', clientId)
        .single();

      if (fetchError) {
        logger.error('❌ store: Error fetching client:', fetchError);
        throw fetchError;
      }

      logger.log('📈 store: Calculating new stock totals...', client);
      const updateData: any = {
        stock_cuarzo: (client.stock_cuarzo || 0) + cuarzo,
        stock_llampo: (client.stock_llampo || 0) + llampo,
        cumulative_cuarzo: (client.cumulative_cuarzo || 0) + cuarzo,
        cumulative_llampo: (client.cumulative_llampo || 0) + llampo,
        last_intake_date: new Date().toISOString(),
      };

      if (zone) {
        updateData.last_intake_zone = zone;
      }

      if (mineralType) {
        updateData.last_mineral_type = mineralType;
      }

      logger.log('💾 store: Updating client in Supabase...', updateData);
      let { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

      // FALLBACK: If columns are missing (Error PGRST204), try updating only the stock
      if (updateError && updateError.code === 'PGRST204') {
        logger.warn('⚠️ store: Missing tracking columns in DB. Falling back to basic stock update...');
        const basicUpdateData = {
          stock_cuarzo: updateData.stock_cuarzo,
          stock_llampo: updateData.stock_llampo,
        };
        logger.log('💾 store: Retrying basic update...', basicUpdateData);
        const { error: retryError } = await supabase
          .from('clients')
          .update(basicUpdateData)
          .eq('id', clientId);

        updateError = retryError;

        if (!retryError) {
          logger.log('✅ store: Basic stock update successful (fallback).');
        }
      }

      if (updateError) {
        logger.error('❌ store: Error updating client stock:', updateError);
        throw updateError;
      }

      // 4. Create stock batches for FIFO tracking
      if (cuarzo > 0) {
        const { error: batchCuarzoError } = await supabase.from('stock_batches').insert({
          client_id: clientId,
          mineral_type: mineralType || 'OXIDO',
          sub_mineral: 'CUARZO',
          initial_quantity: cuarzo,
          remaining_quantity: cuarzo,
          zone: zone || null,
          created_at: finalDate
        });
        if (batchCuarzoError) throw batchCuarzoError;
      }

      if (llampo > 0) {
        const { error: batchLlampoError } = await supabase.from('stock_batches').insert({
          client_id: clientId,
          mineral_type: mineralType || 'OXIDO',
          sub_mineral: 'LLAMPO',
          initial_quantity: llampo,
          remaining_quantity: llampo,
          zone: zone || null,
          created_at: finalDate
        });
        if (batchLlampoError) throw batchLlampoError;
      }

      logger.log('✅ store: Stock updated successfully. Refreshing clients list...');
      await get().fetchClients();
      logger.log('✨ store: Client list refreshed.');
      return true;
    } catch (error: any) {
      logger.error('❌ store: catch in addClientStock:', error);
      set({ error: error.message });
      return false;
    } finally {
      logger.log('🏁 store: addClientStock finally block reached.');
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
      logger.error('❌ Error addZone:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  updateZone: async (id: string, name: string) => {
    set({ loading: true, error: null });
    try {
      // 1. Obtener el nombre antiguo
      const { data: oldZone, error: fetchError } = await supabase
        .from('zones')
        .select('name')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      const oldName = oldZone.name;

      // 2. Sincronizar con clientes (campo zone y last_intake_zone)
      await supabase
        .from('clients')
        .update({ zone: name })
        .eq('zone', oldName);
      
      await supabase
        .from('clients')
        .update({ last_intake_zone: name })
        .eq('last_intake_zone', oldName);

      // 3. Sincronizar con lotes de stock
      await supabase
        .from('stock_batches')
        .update({ zone: name })
        .eq('zone', oldName);

      // 4. Actualizar la zona en la tabla zones
      const { data, error: zoneError } = await supabase
        .from('zones')
        .update({ name: name })
        .eq('id', id)
        .select();

      if (zoneError) throw zoneError;
      if (!data || data.length === 0) throw new Error("Permiso denegado por RLS o no se encontró la zona para actualizar.");

      await get().fetchZones();
      await get().fetchClients(); // Actualizar lista de clientes para ver el cambio de zona
      return true;
    } catch (error: any) {
      logger.error('❌ Error updateZone:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  deleteZone: async (id: string) => {
    set({ loading: true, error: null });
    try {
      // 1. Obtener el nombre antes de borrar
      const { data: zone, error: fetchError } = await supabase
        .from('zones')
        .select('name')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      const zoneName = zone.name;

      // 2. Limpiar referencias en clientes
      await supabase
        .from('clients')
        .update({ zone: null })
        .eq('zone', zoneName);
      
      await supabase
        .from('clients')
        .update({ last_intake_zone: null })
        .eq('last_intake_zone', zoneName);

      // 3. Limpiar en lotes de stock
      await supabase
        .from('stock_batches')
        .update({ zone: null })
        .eq('zone', zoneName);

      // 4. Borrar la zona
      const { data, error } = await supabase
        .from('zones')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Permiso denegado por RLS o no se encontró la zona para eliminar.");

      // Limpiar logs antiguos que se quedaron "En Proceso"
      await get().cleanupHistoricalLogs();

      set({ zones: get().zones.filter(z => z.id !== id) });
      await get().fetchClients();
      return true;
    } catch (error) {
      logger.error('❌ Error deleteZone:', error);
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
      logger.error('❌ Error seedMills:', error);
      return false;
    }
  },

  updateMillHours: async (millId: string, hoursToAdd: number) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('mills')
        .select('total_hours_worked, hours_to_oil_change')
        .eq('id', millId)
        .single();

      if (fetchError) throw fetchError;

      const newHoursWorked = Number(((data?.total_hours_worked || 0) + hoursToAdd).toFixed(2));
      const currentOilHours = data?.hours_to_oil_change ?? 500;
      const newOilHours = Math.max(0, Number((currentOilHours - hoursToAdd).toFixed(2)));

      const { error: updateError } = await supabase
        .from('mills')
        .update({
          total_hours_worked: newHoursWorked,
          hours_to_oil_change: newOilHours
        })
        .eq('id', millId);

      if (updateError) throw updateError;
      logger.log(`🔧 updateMillHours: ${millId} +${hoursToAdd}h → total=${newHoursWorked}h, aceite=${newOilHours}h restantes`);
      return true;
    } catch (error) {
      logger.error('❌ Error updateMillHours:', error);
      return false;
    }
  },

  resetMillOil: async (id: string, targetHours: number) => {
    try {
      const { error } = await supabase
        .from('mills')
        .update({
          hours_to_oil_change: targetHours,
          last_maintenance: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) throw error;

      // Auto-log the maintenance action
      const mill = get().mills.find(m => m.id === id);
      if (mill) {
        await supabase.from('maintenance_logs').insert({
          mill_id: id,
          type: 'PREVENTIVO',
          status: 'COMPLETADO',
          description: `Cambio de Aceite Automático (Reiniciado a ${targetHours}h)`,
          technician_name: 'Sistema',
          worked_hours: 0
        });
      }

      get().fetchMills();
      get().fetchMaintenanceLogs({});
      return true;
    } catch (error) {
      logger.error('❌ Error resetMillOil:', error);
      return false;
    }
  },

  startPollingMills: () => {
    if (get().isPolling) return;

    set({ isPolling: true });
    const interval = setInterval(() => {
      if (!get().millsLoading) {
        get().fetchMills();
      }
    }, 60000);

    set({ pollingIntervalId: interval });
    logger.log('📡 store: Polling de molinos iniciado (60s)');
  },

  stopPollingMills: () => {
    const interval = get().pollingIntervalId;
    if (interval) {
      clearInterval(interval);
      set({ pollingIntervalId: null });
    }
    set({ isPolling: false });
    logger.log('📡 store: Polling de molinos detenido');
  },

  fetchClientBatches: async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_batches')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('❌ Error fetchClientBatches:', error);
      return [];
    }
  },

  updateBatchMineralType: async (batchId: string, mineralType: 'OXIDO' | 'SULFURO') => {
    try {
      const { error } = await supabase
        .from('stock_batches')
        .update({ mineral_type: mineralType })
        .eq('id', batchId);

      if (error) throw error;
      
      // Obtener el ID del cliente de este lote para recalcular
      const { data: batch } = await supabase
        .from('stock_batches')
        .select('client_id')
        .eq('id', batchId)
        .single();
      
      if (batch?.client_id) {
        await get().recalcClientStock(batch.client_id);
      }

      return true;
    } catch (error) {
      logger.error('❌ Error updateBatchMineralType:', error);
      return false;
    }
  },

  // ★ FUENTE ÚNICA DE VERDAD: Recalcula stock del cliente desde lotes reales
  recalcClientStock: async (clientId: string) => {
    try {
      // Sumar remaining_quantity de todos los lotes agrupados por sub_mineral
      const { data: batches, error } = await supabase
        .from('stock_batches')
        .select('sub_mineral, remaining_quantity, initial_quantity')
        .eq('client_id', clientId);

      if (error) {
        logger.error('❌ recalcClientStock: error fetching batches:', error);
        return false;
      }

      let stockCuarzo = 0;
      let stockLlampo = 0;
      let cumulativeCuarzo = 0;
      let cumulativeLlampo = 0;

      (batches || []).forEach((b: any) => {
        if (b.sub_mineral === 'CUARZO') {
          stockCuarzo += (b.remaining_quantity || 0);
          cumulativeCuarzo += (b.initial_quantity || 0);
        } else {
          stockLlampo += (b.remaining_quantity || 0);
          cumulativeLlampo += (b.initial_quantity || 0);
        }
      });

      const { error: updateError } = await supabase
        .from('clients')
        .update({
          stock_cuarzo: stockCuarzo,
          stock_llampo: stockLlampo,
          cumulative_cuarzo: cumulativeCuarzo,
          cumulative_llampo: cumulativeLlampo
        })
        .eq('id', clientId);

      if (updateError) {
        logger.error('❌ recalcClientStock: error updating client:', updateError);
        return false;
      }

      logger.log(`✅ recalcClientStock: [${clientId}] Cu=${stockCuarzo}, Ll=${stockLlampo}`);
      return true;
    } catch (e) {
      logger.error('❌ recalcClientStock: unexpected error:', e);
      return false;
    }
  },

  // REPARACIÓN SILENCIOSA: Recalcula stock de TODOS los clientes (Fuente de verdad: lotes)
  recalcAllClientsStock: async () => {
    try {
      logger.log('🔄 Iniciando recalibración global de stock...');
      const { data: clients, error: clientError } = await supabase.from('clients').select('id');
      if (clientError) throw clientError;

      if (!clients || clients.length === 0) return true;

      // Usamos una ejecución controlada para no saturar la conexión
      for (const client of clients) {
        await get().recalcClientStock(client.id);
      }

      logger.log('✅ Recalibración global completada.');
      await get().fetchClients();
      return true;
    } catch (e) {
      logger.error('❌ Error en recalcAllClientsStock:', e);
      return false;
    }
  },

  deleteStockBatch: async (batchId: string, clientId: string) => {
    set({ loading: true, error: null });
    try {
      // 1. Borrar el lote
      const { error: deleteError } = await supabase
        .from('stock_batches')
        .delete()
        .eq('id', batchId);

      if (deleteError) throw deleteError;

      // 2. Recalcular stock desde lotes reales (fuente única de verdad)
      await get().recalcClientStock(clientId);

      // 3. Refrescar datos
      await get().fetchClients();
      return true;
    } finally {
      set({ loading: false });
    }
  },

  updateStockBatch: async (batchId: string, clientId: string, newData: { initial_quantity: number, remaining_quantity: number, zone?: string, mineral_type?: string, created_at?: string }) => {
    set({ loading: true, error: null });
    try {
      // 1. Construir payload de actualización del lote
      const updatePayload: any = {
        initial_quantity: newData.initial_quantity,
        remaining_quantity: newData.remaining_quantity
      };

      if (newData.zone !== undefined) updatePayload.zone = newData.zone;
      if (newData.mineral_type !== undefined) updatePayload.mineral_type = newData.mineral_type;

      if (newData.created_at) {
        updatePayload.created_at = newData.created_at.includes('T') 
          ? newData.created_at 
          : `${newData.created_at}T12:00:00Z`;
      }

      // 2. Actualizar el lote
      const { error: batchError } = await supabase
        .from('stock_batches')
        .update(updatePayload)
        .eq('id', batchId);

      if (batchError) throw batchError;

      // 3. Recalcular stock desde lotes reales (fuente única de verdad)
      await get().recalcClientStock(clientId);

      // 4. Refrescar datos
      await get().fetchClients();
      return true;
    } catch (error: any) {
      logger.error('❌ Error updateStockBatch:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  }
}));
