export const MILLS = [
  { id: '1', nombre: 'Molino I' },
  { id: '2', nombre: 'Molino II' },
  { id: '3', nombre: 'Molino III' },
  { id: '4', nombre: 'Molino IV' },
] as const;

export const MINERAL_TYPES = [
  { value: 'OXIDO', label: 'Óxido', duracionBase: 100 },
  { value: 'SULFURO', label: 'Sulfuro', duracionBase: 120, duracionMax: 150 },
] as const;

export const SUBMINERAL_TYPES = [
  { value: 'CUARZO', label: 'Cuarzo' },
  { value: 'LLAMPO', label: 'Llampo' }, // CORREGIDO: Llampi → Llampo
] as const;

export const TIPOS_MINERAL = [
  { value: 'MINERO', label: 'Minero' },
  { value: 'PALLAQUERO', label: 'Pallaquero' },
] as const;

// Resto del archivo se mantiene igual...
export const USER_ROLES = [
  { value: 'ADMIN', label: 'Administrador', color: 'bg-purple-100 text-purple-800' },
  { value: 'OPERADOR', label: 'Operador', color: 'bg-blue-100 text-blue-800' },
  { value: 'GERENCIA', label: 'Gerencia', color: 'bg-green-100 text-green-800' },
] as const;

export const MAINTENANCE_TYPES = [
  { value: 'PREVENTIVO', label: 'Preventivo', color: 'bg-blue-100 text-blue-800' },
  { value: 'CORRECTIVO', label: 'Correctivo', color: 'bg-red-100 text-red-800' },
] as const;

export const MILL_STATUS_CONFIG = {
  LIBRE: { label: 'Libre', color: 'status-free', icon: 'CheckCircle' },
  OCUPADO: { label: 'Ocupado', color: 'status-busy', icon: 'Clock' },
  MANTENIMIENTO: { label: 'Mantenimiento', color: 'status-maintenance', icon: 'Wrench' },
} as const;

// Reglas de negocio
export const MAINTENANCE_THRESHOLD_HOURS = 50; // Horas de trabajo antes de mantenimiento

// Agrega al final de tu archivo constants/index.ts
export const TIPO_CLIENTE = [
  { value: 'MINERO', label: 'Minero' },
  { value: 'PALLAQUERO', label: 'Pallaquero' },
] as const;

export const MINERAL_TYPES_STOCK = [
  { value: 'OXIDO', label: 'Óxido' },
  { value: 'SULFURO', label: 'Sulfuro' },
] as const;

export const SUBMINERAL_TYPES_STOCK = [
  { value: 'CUARZO', label: 'Cuarzo' },
  { value: 'LLAMPO', label: 'Llampo' },
] as const;

// Estados de los molinos para visualización
export const MOLINO_STATUS = {
  LIBRE: {
    label: 'Libre',
    color: 'bg-green-100 text-green-800',
    icon: 'CheckCircle',
    disponible: true
  },
  OCUPADO: {
    label: 'Ocupado',
    color: 'bg-red-100 text-red-800',
    icon: 'XCircle',
    disponible: false
  },
  MANTENIMIENTO: {
    label: 'Mantenimiento',
    color: 'bg-yellow-100 text-yellow-800',
    icon: 'Wrench',
    disponible: false
  },
  PROCESANDO: {
    label: 'Procesando',
    color: 'bg-blue-100 text-blue-800',
    icon: 'Loader',
    disponible: false
  }
} as const;

// Tiempos estimados por tipo de mineral (horas por 10 sacos)
export const TIEMPO_ESTIMADO_MOLIENDA = {
  OXIDO: { base: 2, porSaco: 0.2 }, // 2 horas base + 0.2 por saco
  SULFURO: { base: 3, porSaco: 0.3 } // 3 horas base + 0.3 por saco
};