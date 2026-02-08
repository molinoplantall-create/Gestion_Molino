export type UserRole = 'ADMIN' | 'OPERADOR' | 'GERENCIA';
export type MillStatus = 'LIBRE' | 'OCUPADO' | 'MANTENIMIENTO';
export type MineralType = 'OXIDO' | 'SULFURO';
export type SubMineralType = 'CUARZO' | 'LLAMPO';
export type MillingStatus = 'EN_PROCESO' | 'FINALIZADO';
export type MaintenanceType = 'PREVENTIVO' | 'CORRECTIVO';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  nombre?: string;
  is_active: boolean;
  created_at?: string;
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
  start_time?: string;
  estimated_end_time?: string;
  hours_to_oil_change?: number;
  last_maintenance?: string;
  operativo: boolean;
  necesita_mantenimiento: boolean;
}

export interface Client {
  id: string;
  name: string;
  contact_name?: string;
  client_type?: string;
  email?: string;
  phone?: string;
  ruc_dni?: string;
  address?: string;
  zone?: string;
  stock_cuarzo: number;
  stock_llampo: number;
  last_intake_date?: string;
  last_intake_zone?: string;
  last_mineral_type?: string;
  is_active: boolean;
  observations?: string;
  created_at?: string;
}

export interface MillingLog {
  id: string;
  client_id: string;
  mineral_type: 'OXIDO' | 'SULFURO';
  total_sacks: number;
  total_cuarzo: number;
  total_llampo: number;
  mills_used: any; // array of {mill_id, cuarzo, llampo}
  status: 'IN_PROGRESS' | 'FINALIZADO';
  observations?: string;
  created_at: string;
  clients?: {
    name: string;
  };
}

export interface MaintenanceLog {
  id: string;
  mill_id: string;
  type: 'PREVENTIVO' | 'CORRECTIVO';
  description: string;
  action_taken?: string;
  worked_hours?: number;
  technician_name?: string;
  status: string;
  created_at: string;
  mills?: {
    name: string;
  };
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

export interface Zone {
  id: string;
  name: string;
  created_at?: string;
}

export interface ReportFilter {
  fechaInicio?: Date;
  fechaFin?: Date;
  molinoId?: string;
  clienteId?: string;
  mineral?: MineralType;
  operadorId?: string;
}