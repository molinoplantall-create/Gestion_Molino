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

interface MillCardProps {
  mill: any;
}

const MillCard: React.FC<MillCardProps> = ({ mill }) => {
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
    horaFinEstimada: mill?.estimated_end_time || mill?.horaFinEstimada || mill?.estimated_end || null,
    horasTrabajadas: mill?.horasTrabajadas || mill?.total_hours_worked || 0,

    // Mantenimiento
    horasParaCambioAceite: mill?.horasParaCambioAceite || mill?.hours_to_oil_change || 500,
    ultimoMantenimiento: mill?.ultimoMantenimiento || mill?.last_maintenance || '2024-01-15',
    proximoMantenimiento: mill?.proximoMantenimiento || mill?.next_maintenance || '2024-02-15',

    // Información adicional del sistema
    operativo: mill?.operativo !== false, // true por defecto
    necesitaMantenimiento: mill?.necesitaMantenimiento || false
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
          label: 'Ocupado',
          badge: 'bg-orange-100 text-orange-800',
          description: 'Procesando mineral'
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
    const horasUsadas = normalizedMill.horasTrabajadas % maxHoras;
    const progreso = (horasUsadas / maxHoras) * 100;
    const horasRestantes = maxHoras - horasUsadas;

    return {
      progreso: Math.min(progreso, 100),
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
    <div className={`card-hover border rounded-xl p-5 ${config.color} h-full flex flex-col transition-all hover:shadow-sm group`}>
      {/* ProgressBar for process */}
      {estadoReal === 'ocupado' && percentProgress < 100 && (
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 overflow-hidden rounded-t-xl">
          <div
            className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
            style={{ width: `${percentProgress}%` }}
          />
        </div>
      )}

      {/* HEADER: Nombre y Estado */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className={`p-2.5 rounded-lg ${config.badge} mr-3 group-hover:scale-110 transition-transform`}>
            {React.cloneElement(config.icon as React.ReactElement, { strokeWidth: 1.5 })}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{normalizedMill.nombre}</h3>
            <div className="flex items-center mt-1">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.badge}`}>
                {config.label}
              </span>
            </div>
          </div>
        </div>

        {/* Indicador de capacidad */}
        <div className="text-right">
          <div className="text-xl font-black text-slate-900">{normalizedMill.capacidad}</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">sacos/h</div>
        </div>
      </div>

      {/* SECCIÓN 1: INFORMACIÓN OPERATIVA */}
      <div className="space-y-3 mb-4 flex-1">
        {/* Información de Ocupación Compacta */}
        {estadoReal === 'ocupado' && (
          <div className="space-y-2">
            {/* Fila Cliente */}
            <div className="flex items-center px-3 py-2 bg-white/60 rounded-lg border border-orange-100 shadow-sm">
              <User className="text-orange-400 mr-2" size={14} strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-slate-800 truncate" title={normalizedMill.clienteActual}>
                  {normalizedMill.clienteActual || 'Cliente'}
                </div>
              </div>
            </div>

            {/* Fila Tiempos */}
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 bg-indigo-50/50 rounded-lg border border-indigo-100/50 shadow-sm flex flex-col items-center">
                <div className="text-[9px] text-indigo-400 font-black uppercase tracking-wider mb-0.5">Inicio</div>
                <div className="text-sm font-black text-indigo-700">{formatTime(normalizedMill.horaInicio)}</div>
              </div>
              <div className="px-3 py-2 bg-emerald-50/50 rounded-lg border border-emerald-100/50 shadow-sm flex flex-col items-center">
                <div className="text-[9px] text-emerald-500 font-black uppercase tracking-wider mb-0.5 flex items-center">
                  <Clock size={10} className="mr-1" /> Hora fin
                </div>
                <div className="text-sm font-black text-emerald-700">{formatTime(normalizedMill.horaFinEstimada)}</div>
              </div>
            </div>

            {/* Fila Contador */}
            <div className="bg-orange-600/10 p-3 rounded-xl border border-orange-200/50 flex flex-col items-center">
              <div className="text-[9px] text-orange-600 font-black uppercase tracking-widest mb-0.5 flex items-center">
                <Clock size={10} className="mr-1" /> Tiempo Restante
              </div>
              <div className="text-2xl font-black text-orange-700 tracking-tighter leading-none">
                {timeRemaining || '--:--'}
              </div>
            </div>
          </div>
        )}

        {/* Mensaje especial para mantenimiento */}
        {estadoReal === 'mantenimiento' && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-center">
              <Wrench size={16} strokeWidth={1.5} className="text-red-500 mr-2" />
              <div className="text-sm text-red-700">
                En proceso de mantenimiento preventivo/correctivo
              </div>
            </div>
            <div className="text-xs text-red-600 mt-1">
              Próximo disponible: {normalizedMill.proximoMantenimiento}
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: MANTENIMIENTO Y HORAS (SIEMPRE visible) */}
      <div className="pt-4 border-t border-slate-200/50 mt-auto">
        {/* Horas trabajadas acumuladas */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Clock className="text-slate-400 mr-2" size={16} strokeWidth={1.5} />
            <span className="text-sm text-slate-700">Horas totales:</span>
          </div>
          <div className="font-bold text-slate-900">{normalizedMill.horasTrabajadas}h</div>
        </div>

        {/* Progreso cambio de aceite */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center">
              <Droplets className="text-blue-500 mr-2" size={14} strokeWidth={1.5} />
              <span className="text-slate-700">Cambio de aceite:</span>
            </div>
            <span className={`font-semibold ${aceiteInfo.necesitaCambio ? 'text-red-600' : 'text-slate-700'}`}>
              {aceiteInfo.horasRestantes}h
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${aceiteInfo.necesitaCambio ? 'bg-red-500' : 'bg-blue-500'
                }`}
              style={{ width: `${aceiteInfo.progreso}%` }}
            ></div>
          </div>

          {aceiteInfo.necesitaCambio && (
            <div className="flex items-center mt-2 text-xs">
              <AlertTriangle className="text-red-500 mr-1" size={12} strokeWidth={1.5} />
              <span className="text-red-600 font-medium">Próximo cambio requerido</span>
            </div>
          )}
        </div>

        {/* Último mantenimiento */}
        <div className="text-xs text-slate-500 flex justify-between items-center pt-2 border-t border-slate-100">
          <span>Último mantenimiento:</span>
          <span className="font-medium text-slate-700">{normalizedMill.ultimoMantenimiento}</span>
        </div>
      </div>

      {/* BADGE de estado operativo */}
      <div className="mt-4 pt-3 border-t border-slate-200/50">
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Estado operativo:
            <span className={`ml-1 font-medium ${normalizedMill.operativo ? 'text-emerald-600' : 'text-red-600'
              }`}>
              {normalizedMill.operativo ? 'Operativo' : 'No Operativo'}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            ID: {normalizedMill.id.substring(0, 6)}...
          </div>
        </div>
      </div>
    </div>
  );
};

export default MillCard;