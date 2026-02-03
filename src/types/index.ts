export type UserRole = 'ADMIN' | 'OPERADOR' | 'GERENCIA';
export type MillStatus = 'LIBRE' | 'OCUPADO' | 'MANTENIMIENTO';
export type MineralType = 'OXIDO' | 'SULFURO';
export type SubMineralType = 'CUARZO' | 'LLAMPO';
export type MillingStatus = 'EN_PROCESO' | 'FINALIZADO';
export type MaintenanceType = 'PREVENTIVO' | 'CORRECTIVO';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  createdAt: Date;
  isActive: boolean;
}

export interface Mill {
  id: string;
  name: string; // Changed from nombre to match DB
  status: string; // 'libre', 'ocupado', 'mantenimiento'
  capacity: number;
  current_client?: string;
  current_sacks?: number;
  current_cuarzo?: number; // New DB column
  current_llampo?: number; // New DB column
  hours_to_oil_change?: number;
  last_maintenance?: string;
  operativo: boolean;
  necesita_mantenimiento: boolean;
}

export interface Client {
  id: string;
  name: string; // Changed from nombre
  type: 'MINERO' | 'PALLAQUERO'; // New DB column
  email?: string;
  phone?: string;
  company?: string;
  stock_cuarzo: number; // New DB column
  stock_llampo: number; // New DB column
  is_active: boolean;
  created_at?: string;
}

export interface MillingLog {
  id: string;
  client_id: string;
  mineral_type: 'OXIDO' | 'SULFURO';
  start_date: string;
  end_date?: string;
  total_sacks: number;
  total_cuarzo: number; // New DB column
  total_llampo: number; // New DB column
  mills_used: any; // JSONB
  status: 'COMPLETED' | 'IN_PROGRESS';
  observations?: string;
  created_at: string;
}

// Deprecated interfaces kept for compatibility during migration if needed, but prefer above
export interface MillingSession {
  id: string;
  molinoId: string;
  clienteId: string;
  clienteNombre: string;
  cantidadSacos: number;
  mineral: MineralType;
  subMineral: SubMineralType;
  horaInicio: Date;
  horaFinCalculada: Date;
  duracionMinutos: number;
  estado: MillingStatus;
  operadorId: string;
  operadorNombre: string;
  createdAt: Date;
}

export interface MaintenanceLog {
  id: string;
  molinoId: string;
  molinoNombre: string;
  tipo: MaintenanceType;
  descripcionFalla: string;
  accionTomada: string;
  horasTrabajadas: number;
  requiereNotificacion: boolean;
  asignadoA: string;
  fechaRegistro: Date;
  fechaResolucion?: Date;
  createdAt: Date;
}

export interface Notification {
  id: string;
  tipo: 'MOLIENDA' | 'MANTENIMIENTO' | 'SISTEMA';
  titulo: string;
  mensaje: string;
  leida: boolean;
  userId: string;
  createdAt: Date;
}

export interface ReportFilter {
  fechaInicio?: Date;
  fechaFin?: Date;
  molinoId?: string;
  clienteId?: string;
  mineral?: MineralType;
  operadorId?: string;
}