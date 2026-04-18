import React from 'react';
import {
  Clock,
  Wrench,
  CheckCircle,
  User,
  Package,
  Droplets,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  AlertCircle
} from 'lucide-react';

import { useSupabaseStore } from '@/store/supabaseStore';
import { useToast } from '@/hooks/useToast';

interface MillCardProps {
  mill: any;
}

const MillCard: React.FC<MillCardProps> = ({ mill }) => {
  const { finalizeMilling } = useSupabaseStore();
  const toast = useToast();

  // Normalizar datos
  const normalizedMill = {
    id: mill?.id || '1',
    nombre: mill?.nombre || mill?.name || 'Molino I',
    estado: mill?.estado || mill?.status || 'LIBRE',

    // Datos operativos (SOLO informativos, no editables)
    clienteActual: mill?.clienteActual || mill?.current_client || null,
    sacosProcesando: mill?.sacosProcesando || mill?.sacks_processing || 0,
    capacidad: mill?.capacidad || mill?.capacity || 150,

    // Horarios
    horaInicio: mill?.horaInicio || mill?.start_time || null,
    horaFinEstimada: mill?.estimated_end || mill?.horaFinEstimada || null,
    horasTrabajadas: mill?.horasTrabajadas || mill?.total_hours_worked || 0,

    // Mantenimiento
    horasParaCambioAceite: mill?.horasParaCambioAceite || mill?.hours_to_oil_change || 500,
    ultimoMantenimiento: mill?.ultimoMantenimiento || mill?.last_maintenance || '2024-01-15',
    proximoMantenimiento: mill?.proximoMantenimiento || mill?.next_maintenance || '2024-02-15',

    // Información adicional del sistema
    operativo: mill?.operativo !== false, // true por defecto
    necesitaMantenimiento: mill?.necesitaMantenimiento || false,
    mineralActual: mill?.current_mineral || null
  };

  // Determinar estado REAL (no mostrar "sacos procesando" si está en mantenimiento)
  const getEstadoReal = () => {
    const estado = normalizedMill.estado.toString().toUpperCase();

    if (estado === 'MANTENIMIENTO') {
      return 'mantenimiento';
    }

    if (estado === 'OCUPADO') {
      return 'ocupado';
    }

    if (!normalizedMill.operativo) {
      return 'no_operativo';
    }

    if (normalizedMill.necesitaMantenimiento) {
      return 'necesita_mantenimiento';
    }

    return 'libre';
  };

  const estadoReal = getEstadoReal();

  // Configuración visual por estado
  const getConfig = () => {
    switch (estadoReal) {
      case 'ocupado':
        return {
          color: 'bg-orange-50 border-orange-200',
          icon: <PlayCircle className="text-orange-600" size={20} />,
          label: 'En Proceso',
          badge: 'bg-orange-100 text-orange-800',
          description: 'Molienda activa'
        };
      case 'mantenimiento':
        return {
          color: 'bg-red-50 border-red-200',
          icon: <Wrench className="text-red-600" size={20} />,
          label: 'En Mantenimiento',
          badge: 'bg-red-100 text-red-800',
          description: 'No disponible'
        };
      case 'necesita_mantenimiento':
        return {
          color: 'bg-amber-50 border-amber-200',
          icon: <AlertCircle className="text-amber-600" size={20} />,
          label: 'Necesita Mantenimiento',
          badge: 'bg-amber-100 text-amber-800',
          description: 'Próximo a revisión'
        };
      case 'no_operativo':
        return {
          color: 'bg-gray-100 border-gray-300',
          icon: <PauseCircle className="text-gray-600" size={20} />,
          label: 'No Operativo',
          badge: 'bg-gray-200 text-gray-700',
          description: 'Fuera de servicio'
        };
      default: // libre
        return {
          color: 'bg-green-50 border-green-200',
          icon: <CheckCircle className="text-green-600" size={20} />,
          label: 'Libre',
          badge: 'bg-green-100 text-green-800',
          description: 'Disponible'
        };
    }
  };

  const config = getConfig();

  // Calcular progreso para cambio de aceite
  const calcularProgresoAceite = () => {
    const maxHoras = 500; // Cambio de aceite cada 500 horas
    // Usar directamente el valor de hours_to_oil_change de la BD
    const horasRestantes = normalizedMill.horasParaCambioAceite;
    const horasUsadas = maxHoras - horasRestantes;
    const progreso = Math.min(100, Math.max(0, (horasUsadas / maxHoras) * 100));

    return {
      progreso,
      horasRestantes,
      necesitaCambio: horasRestantes < 50
    };
  };

  const aceiteInfo = calcularProgresoAceite();

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    try {
      // Intentar forzar el parseo si viene en formato ISO o similar
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return '--:--';

      return date.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return '--:--';
    }
  };

  const [timeRemaining, setTimeRemaining] = React.useState<string | null>(null);
  const [percentProgress, setPercentProgress] = React.useState<number>(0);

  // Update countdown and progress
  React.useEffect(() => {
    if (estadoReal !== 'ocupado' || !normalizedMill.horaFinEstimada || !normalizedMill.horaInicio) return;

    const calculateValues = () => {
      try {
        const start = new Date(normalizedMill.horaInicio).getTime();
        const end = new Date(normalizedMill.horaFinEstimada).getTime();
        const now = new Date().getTime();

        const totalDuration = end - start;
        const elapsed = now - start;

        // Progress percentage
        const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        setPercentProgress(progress);

        // Time remaining
        const diffMs = end - now;
        if (diffMs <= 0) {
          setTimeRemaining('Finalizado');
          // Único trigger para finalizar automáticamente
          if (normalizedMill.estado.toUpperCase() === 'OCUPADO') {
            console.log(`🕒 MillCard: Proceso de ${normalizedMill.nombre} terminado. Finalizando...`);
            finalizeMilling(normalizedMill.id);
          }
        } else {
          const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setTimeRemaining(`${diffHoras > 0 ? `${diffHoras}h ` : ''}${diffMinutos}m`);
        }
      } catch (e) {
        console.error('Error calculating mill progress:', e);
      }
    };

    calculateValues();
    const interval = setInterval(calculateValues, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [estadoReal, normalizedMill.horaFinEstimada, normalizedMill.horaInicio]);

  return (
    <div className={`card-hover border rounded-xl sm:rounded-2xl p-3 sm:p-5 ${config.color} h-full flex flex-col sm:flex-col transition-all hover:shadow-sm group relative overflow-hidden`}>
      {/* ProgressBar for process */}
      {estadoReal === 'ocupado' && percentProgress < 100 && (
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
            style={{ width: `${percentProgress}%` }}
          />
        </div>
      )}

      {/* RENDERIZADO RESPONSIVO: MOBILE (Horizontal) vs DESKTOP (Vertical) */}
      <div className="flex flex-row sm:flex-col h-full gap-3 sm:gap-0">
        
        {/* LADO IZQUIERDO / SUPERIOR: Header e Icono */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-0 sm:mb-4 w-1/3 sm:w-full">
          <div className="flex flex-col sm:flex-row items-center">
            <div className={`p-2 sm:p-2.5 rounded-lg ${config.badge} mb-2 sm:mb-0 sm:mr-3 group-hover:scale-110 transition-transform`}>
              {React.cloneElement(config.icon as React.ReactElement, { size: 18, strokeWidth: 1.5 })}
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-black text-slate-900 text-xs sm:text-lg leading-tight">{normalizedMill.nombre}</h3>
              <div className="flex items-center justify-center sm:justify-start mt-1">
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${config.badge}`}>
                  {config.label}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            {estadoReal === 'ocupado' ? (
              <>
                <div className="text-xl font-black text-slate-900">{normalizedMill.sacosProcesando}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">sacos</div>
              </>
            ) : (
              <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest pt-2 opacity-50">
                INMACULADA
              </div>
            )}
          </div>
        </div>

        {/* LADO DERECHO / INFERIOR: Info Operativa + Mantenimiento */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          
          {/* Info Operativa (Solo si está ocupado) */}
          <div className="space-y-2 mb-2 sm:mb-4">
            {estadoReal === 'ocupado' && (
              <div className="space-y-1.5">
                <div className="flex flex-col px-2 py-1.5 bg-white/60 rounded-lg border border-orange-100 shadow-sm">
                  <div className="flex items-center">
                    <User className="text-orange-400 mr-2 shrink-0" size={10} strokeWidth={2.5} />
                    <div className="text-[9px] sm:text-[11px] font-bold text-slate-800 truncate">
                      {normalizedMill.clienteActual || 'Cliente Anónimo'}
                    </div>
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-black text-orange-600/70 uppercase tracking-tighter pl-4">
                     {timeRemaining || '--:--'} restantes
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje de mantenimiento compacto */}
            {estadoReal === 'mantenimiento' && (
              <div className="p-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                <Wrench size={12} className="text-red-500 shrink-0" />
                <span className="text-[9px] text-red-700 font-bold">Mantenimiento Activo</span>
              </div>
            )}
          </div>

          {/* Sección de Horas y Aceite (Siempre visible, más compacta) */}
          <div className="pt-2 border-t border-slate-200/50 space-y-2">
             <div className="flex items-center justify-between text-[9px] sm:text-xs">
                <div className="flex items-center text-slate-500">
                  <Clock size={12} className="mr-1" />
                  <span className="hidden sm:inline">Horas:</span>
                </div>
                <span className="font-black text-slate-900">{normalizedMill.horasTrabajadas}h</span>
             </div>

             <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] sm:text-xs">
                  <span className="text-slate-500 hidden sm:inline">Aceite:</span>
                  <span className={`font-black ${aceiteInfo.necesitaCambio ? 'text-red-600' : 'text-slate-700'}`}>
                    {aceiteInfo.horasRestantes}h
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full ${aceiteInfo.necesitaCambio ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${aceiteInfo.progreso}%` }}
                  />
                </div>
             </div>
          </div>

          {/* Footer: ID y Estado Operativo */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[8px] sm:text-[10px]">
             <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${normalizedMill.operativo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className={`font-black ${normalizedMill.operativo ? 'text-emerald-600' : 'text-red-500'}`}>
                  {normalizedMill.operativo ? 'OPERATIVO' : 'FUERA'}
                </span>
             </div>
             <div className="text-slate-400 font-mono">
                #{normalizedMill.id.substring(0, 4)}
             </div>
          </div>
        </div>

      </div>
    </div >
  );
};

export default MillCard;