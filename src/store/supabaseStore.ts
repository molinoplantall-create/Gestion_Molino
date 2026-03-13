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
  updateMillHours: (millId: string, hoursToAdd: number) => Promise<boolean>;
  finalizeMaintenance: (id: string, millId: string) => Promise<boolean>;
  resetMillOil: (millId: string, targetHours: number) => Promise<boolean>;
  updateMaintenanceLog: (id: string, updateData: any) => Promise<{ error: any }>;
  deleteMillingLog: (logId: string) => Promise<boolean>;
  startPollingMills: () => void;
  stopPollingMills: () => void;
  isPolling: boolean;
  fetchClientBatches: (clientId: string) => Promise<any[]>;
  updateBatchMineralType: (batchId: string, mineralType: 'OXIDO' | 'SULFURO') => Promise<boolean>;
  deleteStockBatch: (batchId: string, clientId: string) => Promise<boolean>;
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
  isPolling: false,
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
      console.error('❌ Error fetchMillingLogs:', error);
      set({ error: error.message });
    } finally {
      set({ logsLoading: false });
    }
  },

  fetchMaintenanceLogs: async (options = {}) => {
    const { page = 1, pageSize = 20, search, millId, startDate, endDate, type, status } = options;
    set({ loading: true, error: null });
    try {
      console.log('📡 store: fetching maintenance logs...', { millId, search, type, status });

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
        query = query.or(`description.ilike.%${search}%,descripcion_falla.ilike.%${search}%`);
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
        console.warn('⚠️ store: maintenance_logs table NOT FOUND, trying fallback "Maintenance" table...');
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
        console.error('❌ Supabase error in fetchMaintenanceLogs:', error);
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

      set({ maintenanceLogs: normalizedLogs });
      console.log(`✅ store: ${normalizedLogs.length} maintenance logs loaded.`);
    } catch (error: any) {
      console.error('❌ Error fetchMaintenanceLogs:', error);
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
      console.log('🏁 registerMilling: 1. Cliente verificado', clientData);

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

        console.log('📅 registerMilling: date check:', {
          provided: datePart,
          today: nowDate.toISOString().split('T')[0],
          isHistorical
        });
      }

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
      console.log('🏁 registerMilling: 2. Log de molienda creado', millingData.id);

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
      console.log('🏁 registerMilling: 3. Stock general de cliente actualizado');

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
          console.error(`❌ store: Error fetching batches for ${subMineral}:`, fetchBatchesError);
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
            console.error(`❌ store: Error updating batch ${batch.id}:`, batchUpdateError);
          }
        }

        if (remainingToConsume > 0) {
          console.warn(`⚠️ store: Insufficient batch stock for ${subMineral}. Remaining: ${remainingToConsume}`);
        }
      };

      // Consume for Cuarzo and Llampo sequentially
      if (data.totalCuarzo > 0) {
        await consumeBatches(data.clientId, 'CUARZO', data.totalCuarzo);
      }
      if (data.totalLlampo > 0) {
        await consumeBatches(data.clientId, 'LLAMPO', data.totalLlampo);
      }
      console.log('🏁 registerMilling: 4. Lotes (FIFO) consumidos');
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
          console.warn('⚠️ store: missing time columns in mills table, retrying basic update...', m.id);
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

      console.log('🏁 registerMilling: 5. Iniciando actualización de molinos...', millUpdates.length);
      await Promise.all(millUpdates);
      console.log('🏁 registerMilling: 6. Molinos actualizados');

      await Promise.all([
        get().fetchMills(),
        get().fetchClients(),
        get().fetchMillingLogs({ pageSize: 12 })
      ]);
      console.log('🏁 registerMilling: 7. Datos de UI refrescados');

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
      m.estimated_end &&
      new Date(m.estimated_end).getTime() + gracePeriod < now.getTime()
    );

    if (millsToLiberate.length === 0) return;

    console.log(`🕒 store: Liberando automáticamente ${millsToLiberate.length} molinos...`);

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
      // Intentar inserción estandarizada primero
      const insertData: any = {
        mill_id: data.mill_id,
        type: data.type,
        description: data.description,
        technician_name: data.technician_name,
        worked_hours: data.worked_hours,
        status: data.status || 'PENDIENTE',
        created_at: data.fechaProgramada || new Date().toISOString()
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
        console.warn('⚠️ store: error in registerMaintenance, retrying with fallback columns (SPANISH)...');
        const compatData = {
          molino_id: data.mill_id,
          tipo: data.type,
          descripcion_falla: data.description,
          horas_trabajadas: data.worked_hours,
          asignado_a: data.technician_name,
          estado: data.status || 'PENDIENTE',
          accion_tomada: data.description // Fallback a descripcion si falta campo
        };
        const { error: retryError } = await supabase
          .from('maintenance_logs')
          .insert(compatData);
        error = retryError;
      }

      // FALLBACK 404: Si la tabla maintenance_logs no existe
      if (error && ((error as any).status === 404 || error.code === '42P01')) {
        console.warn('⚠️ store: table maintenance_logs not found for insert, trying fallback "Maintenance"...');
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
      console.error('❌ Error registerMaintenance:', error);
      set({ error: error.message || 'Error al registrar mantenimiento. Por favor ejecute fix_maintenance_system.sql' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  updateMaintenanceLog: async (id: string, updateData: any) => {
    try {
      const { error } = await supabase
        .from('maintenance_logs')
        .update(updateData)
        .eq('id', id);

      return { error };
    } catch (error) {
      console.error('Error updateMaintenanceLog:', error);
      return { error };
    }
  },

  finalizeMaintenance: async (id: string, millId: string) => {
    set({ loading: true, error: null });
    try {
      console.log(`🔧 store: finalizing maintenance ${id} for mill ${millId}`);

      // 1. Actualizar el log de mantenimiento a COMPLETADO
      // Intentar primero con columna 'status'
      let { error: logError } = await supabase
        .from('maintenance_logs')
        .update({ status: 'COMPLETADO', completed_at: new Date().toISOString() })
        .eq('id', id);

      // Fallback a 'estado' si falla
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
      console.error('❌ Error finalizeMaintenance:', error);
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
      console.error('Error updating mill status:', error);
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

  deleteMillingLog: async (logId: string) => {
    set({ loading: true, error: null });
    try {
      console.log(`🗑️ store: intentando borrar molienda ${logId}`);

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

      console.log('✅ store: molienda borrada y stock revertido correctamente');

      await get().fetchMillingLogs();
      await get().fetchClients();
      await get().fetchMills();

      return true;
    } catch (error: any) {
      console.error('❌ Error deleteMillingLog:', error);
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
        .select('stock_cuarzo, stock_llampo, cumulative_cuarzo, cumulative_llampo')
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

      // 4. Create stock batches for FIFO tracking
      if (cuarzo > 0) {
        await supabase.from('stock_batches').insert({
          client_id: clientId,
          mineral_type: mineralType || 'OXIDO',
          sub_mineral: 'CUARZO',
          initial_quantity: cuarzo,
          remaining_quantity: cuarzo,
          zone: zone
        });
      }

      if (llampo > 0) {
        await supabase.from('stock_batches').insert({
          client_id: clientId,
          mineral_type: mineralType || 'OXIDO',
          sub_mineral: 'LLAMPO',
          initial_quantity: llampo,
          remaining_quantity: llampo,
          zone: zone
        });
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
      console.log(`🔧 updateMillHours: ${millId} +${hoursToAdd}h → total=${newHoursWorked}h, aceite=${newOilHours}h restantes`);
      return true;
    } catch (error) {
      console.error('❌ Error updateMillHours:', error);
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
      console.error('❌ Error resetMillOil:', error);
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

    (window as any)._millPollingInterval = interval;
    console.log('📡 store: Polling de molinos iniciado (60s)');
  },

  stopPollingMills: () => {
    const interval = (window as any)._millPollingInterval;
    if (interval) {
      clearInterval(interval);
      (window as any)._millPollingInterval = null;
    }
    set({ isPolling: false });
    console.log('📡 store: Polling de molinos detenido');
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
      console.error('❌ Error fetchClientBatches:', error);
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
      return true;
    } catch (error) {
      console.error('❌ Error updateBatchMineralType:', error);
      return false;
    }
  },

  deleteStockBatch: async (batchId: string, clientId: string) => {
    set({ loading: true, error: null });
    try {
      // 1. Obtener los datos del lote antes de borrarlo
      const { data: batch, error: fetchError } = await supabase
        .from('stock_batches')
        .select('*')
        .eq('id', batchId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Obtener el stock actual del cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('stock_cuarzo, stock_llampo, cumulative_cuarzo, cumulative_llampo')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // 3. Calcular los nuevos totales (revertir)
      const updateData: any = {};
      if (batch.sub_mineral === 'CUARZO') {
        updateData.stock_cuarzo = Math.max(0, (client.stock_cuarzo || 0) - batch.remaining_quantity);
        updateData.cumulative_cuarzo = Math.max(0, (client.cumulative_cuarzo || 0) - batch.initial_quantity);
      } else {
        updateData.stock_llampo = Math.max(0, (client.stock_llampo || 0) - batch.remaining_quantity);
        updateData.cumulative_llampo = Math.max(0, (client.cumulative_llampo || 0) - batch.initial_quantity);
      }

      // 4. Actualizar el cliente
      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

      if (updateError) throw updateError;

      // 5. Borrar el lote
      const { error: deleteError } = await supabase
        .from('stock_batches')
        .delete()
        .eq('id', batchId);

      if (deleteError) throw deleteError;

      // 6. Refrescar datos
      await get().fetchClients();
      return true;
    } catch (error: any) {
      console.error('❌ Error deleteStockBatch:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  }
}));
