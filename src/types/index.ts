export type UserRole = 'ADMIN' | 'OPERADOR' | 'GERENCIA';
export type MillStatus = 'LIBRE' | 'OCUPADO' | 'MANTENIMIENTO';
export type MineralType = 'OXIDO' | 'SULFURO';
export type SubMineralType = 'CUARZO' | 'LLAMPO';
export type MillingStatus = 'EN_PROCESO' | 'FINALIZADO';
export type MaintenanceType = 'PREVENTIVO' | 'CORRECTIVO' | 'PREDICTIVO' | 'EMERGENCIA';
export type MaintenancePriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

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
  current_client_id?: string;
  current_sacks?: number;
  current_cuarzo?: number; // New DB column
  current_llampo?: number; // New DB column
  start_time?: string;
  estimated_end?: string;
  hours_to_oil_change?: number;
  last_maintenance?: string;
  operativo: boolean;
  necesita_mantenimiento: boolean;
  horasTrabajadas?: number;
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
  cumulative_cuarzo?: number;
  cumulative_llampo?: number;
  last_intake_date?: string;
  last_intake_zone?: string;
  last_mineral_type?: string;
  is_active: boolean;
  observations?: string;
  created_at?: string;
}

export interface MillEntry {
  id?: string;
  mill_id: string;
  name?: string;
  cuarzo: number;
  llampo: number;
  total?: number;
  total_sacks?: number;
}

export interface MillingLog {
  id: string;
  client_id: string;
  mineral_type: 'OXIDO' | 'SULFURO';
  total_sacks: number;
  total_cuarzo: number;
  total_llampo: number;
  mills_used: MillEntry[] | null;
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
  type: 'PREVENTIVO' | 'CORRECTIVO' | 'PREDICTIVO' | 'EMERGENCIA';
  description: string;
  action_taken?: string;
  worked_hours?: number;
  technician_name?: string;
  status: string;
  priority?: MaintenancePriority;
  category?: string;
  cost_pen?: number;
  cost_usd?: number;
  tasks_checklist?: any[];
  failure_start_time?: string;
  completed_at?: string;
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

export interface MaintenanceRegisterData {
  mill_id: string;
  type: MaintenanceType;
  category?: string;
  description: string;
  priority: MaintenancePriority;
  status: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';
  fechaProgramada?: string;
  worked_hours?: number;
  technician_name: string;
  cost_pen?: number;
  cost_usd?: number;
  tasks_checklist?: { id: string, text: string, completed: boolean }[];
  action_taken?: string;
}

export interface MaintenanceUpdateData {
  mill_id?: string;
  type?: MaintenanceType;
  category?: string;
  description?: string;
  priority?: MaintenancePriority;
  status?: string;
  worked_hours?: number;
  technician_name?: string;
  cost_pen?: number;
  cost_usd?: number;
  tasks_checklist?: any[];
  action_taken?: string;
  created_at?: string;
}