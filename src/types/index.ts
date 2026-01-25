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
  nombre: string;
  estado: MillStatus;
  sacosProcesados: number;
  horasTrabajadas: number;
  ultimoMantenimiento?: Date;
  createdAt: Date;
}

export interface Client {
  id: string;
  nombre: string;
  contacto: string;
  telefono?: string;
  email?: string;
  stockActual: number;
  totalSacos: number;
  createdAt: Date;
}

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