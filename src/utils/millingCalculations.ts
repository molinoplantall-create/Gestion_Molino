import { MineralType } from '@/types';

/**
 * Calcula la duración en minutos basado en mineral y cantidad de sacos
 */
export const calculateDuration = (
  mineral: MineralType,
  cantidadSacos: number
): number => {
  if (mineral === 'OXIDO') {
    return 100; // 1 hora 40 minutos fijos
  }
  
  // SULFURO: proporcional por saco (120-150 min)
  const minTime = 120; // 2 horas
  const maxTime = 150; // 2.5 horas
  const timePerSack = (maxTime - minTime) / 10; // Escala de 0-10 sacos
    
  return Math.ceil(minTime + (cantidadSacos * timePerSack));
};

/**
 * Calcula la hora fin basado en hora inicio y duración
 */
export const calculateEndTime = (
  startTime: Date,
  durationMinutes: number
): Date => {
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);
  return endTime;
};

/**
 * Verifica si un molino necesita mantenimiento
 */
export const needsMaintenance = (
  horasTrabajadas: number,
  ultimoMantenimiento?: Date
): boolean => {
  const MAINTENANCE_THRESHOLD_HOURS = 50;
  const MAINTENANCE_DAYS_THRESHOLD = 30;
  
  // Por horas trabajadas
  if (horasTrabajadas >= MAINTENANCE_THRESHOLD_HOURS) {
    return true;
  }
  
  // Por tiempo desde último mantenimiento
  if (ultimoMantenimiento) {
    const daysSinceMaintenance = Math.floor(
      (new Date().getTime() - ultimoMantenimiento.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceMaintenance >= MAINTENANCE_DAYS_THRESHOLD;
  }
  
  return false;
};

/**
 * Formatea duración a horas y minutos
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

/**
 * Calcula tiempo restante para finalización
 */
export const calculateTimeRemaining = (endTime: Date): string => {
  const now = new Date();
  const diffMs = endTime.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Completado';
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  return `${hours}h ${minutes}m`;
};