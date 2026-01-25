import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tablas de Supabase
export const TABLES = {
  USERS: 'users',
  MILLS: 'mills',
  MILLING_SESSIONS: 'milling_sessions',
  CLIENTS: 'clients',
  MAINTENANCE_LOGS: 'maintenance_logs',
  NOTIFICATIONS: 'notifications',
  STOCK: 'stock',
} as const;

// Funciones de autenticación
export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
};

// Funciones de datos
export const dataService = {
  // Molinos
  async getMills() {
    const { data, error } = await supabase
      .from(TABLES.MILLS)
      .select('*')
      .order('nombre');
    return { data, error };
  },

  // Moliendas
  async getMillingSessions(filters?: any) {
    let query = supabase
      .from(TABLES.MILLING_SESSIONS)
      .select(`
        *,
        mills (nombre),
        clients (nombre)
      `)
      .order('created_at', { ascending: false });

    if (filters?.fechaInicio && filters?.fechaFin) {
      query = query.gte('hora_inicio', filters.fechaInicio).lte('hora_inicio', filters.fechaFin);
    }
    
    if (filters?.molinoId) {
      query = query.eq('molino_id', filters.molinoId);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async createMillingSession(sessionData: any) {
    const { data, error } = await supabase
      .from(TABLES.MILLING_SESSIONS)
      .insert([sessionData])
      .select()
      .single();
    return { data, error };
  },

  // Clientes
  async getClients() {
    const { data, error } = await supabase
      .from(TABLES.CLIENTS)
      .select('*')
      .order('nombre');
    return { data, error };
  },

  // Mantenimiento
  async getMaintenanceLogs() {
    const { data, error } = await supabase
      .from(TABLES.MAINTENANCE_LOGS)
      .select(`
        *,
        mills (nombre)
      `)
      .order('fecha_registro', { ascending: false });
    return { data, error };
  },

  // Stock
  async getStock() {
    const { data, error } = await supabase
      .from(TABLES.STOCK)
      .select(`
        *,
        clients (nombre)
      `)
      .order('cantidad_actual', { ascending: true });
    return { data, error };
  },

  // Reportes
  async getProductionReport(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from(TABLES.MILLING_SESSIONS)
      .select(`
        cantidad_sacos,
        mineral,
        mills (nombre),
        clients (nombre)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    return { data, error };
  },
};