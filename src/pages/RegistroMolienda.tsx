import React, { useState, useEffect } from 'react';
import { Save, Printer, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSupabaseStore } from '../store/supabaseStore';
import { useModal } from '@/hooks/useModal';
import { useToast } from '@/hooks/useToast';
import { ClientSelector } from '@/components/molienda/ClientSelector';
import { MineralTypeSelector } from '@/components/molienda/MineralTypeSelector';
import { MillSelector } from '@/components/molienda/MillSelector';
import { ProcessSummary } from '@/components/molienda/ProcessSummary';
import { ReceiptModal } from '@/components/molienda/ReceiptModal';
import { TIPO_CLIENTE, MINERAL_TYPES_STOCK } from '../constants';
import { useFormValidation } from '@/hooks/useFormValidation';
import { millingProcessSchema } from '@/schemas/millingSchema';

// Types
interface MolinoProceso {
  id: string;
  name: string; // Changed from nombre
  activo: boolean;
  cuarzo: number;
  llampo: number;
  total: number;
  capacidadMaxima: number;
  disponible: boolean;
  status: string; // Changed from estado
  tiempoEstimado: number;
  horaFin: string | null;
  current_client?: string;
  current_sacks?: number;
  start_time?: string;
  estimated_end_time?: string;
}

interface TiemposProceso {
  oxido: { hora40: boolean; hora00: boolean };
  sulfuro: { hora00: boolean; hora30: boolean };
}

interface MoliendaData {
  clienteId: string;
  clienteNombre: string;
  tipoCliente: 'MINERO' | 'PALLAQUERO' | '';
  mineral: 'OXIDO' | 'SULFURO' | '';
  tiempos: TiemposProceso;
  fechaInicio: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  stockTotal: number;
  stockCuarzo: number;
  stockLlampo: number;
  molinos: MolinoProceso[];
  observaciones: string;
  totalSacos: number;
  totalCuarzo: number;
  totalLlampo: number;
  stockRestanteTotal: number;
  stockRestanteCuarzo: number;
  stockRestanteLlampo: number;
  tiempoPorMolino: number;
  procesoIniciado: boolean;
  procesoId: string | null;
  estado_proceso: 'PROCESANDO' | 'COMPLETADO' | 'CANCELADO'; // Renamed to avoid confusion with mill status
  allowedMineralType: 'OXIDO' | 'SULFURO' | '';
}

const RegistroMolienda: React.FC = () => {
  const { user } = useAuthStore();
  const { mills, clients, fetchMills, fetchClients, registerMilling } = useSupabaseStore();
  const toast = useToast();
  const receiptModal = useModal();

  // Estado principal
  const [molienda, setMolienda] = useState<MoliendaData>({
    clienteId: '',
    clienteNombre: '',
    tipoCliente: '',
    mineral: '',
    tiempos: {
      oxido: { hora40: true, hora00: false },
      sulfuro: { hora00: false, hora30: true }
    },
    fechaInicio: new Date().toISOString().split('T')[0],
    horaInicio: null,
    horaFin: null,
    stockTotal: 0,
    stockCuarzo: 0,
    stockLlampo: 0,
    stockRestanteTotal: 0,
    stockRestanteCuarzo: 0,
    stockRestanteLlampo: 0,
    molinos: [],
    observaciones: '',
    totalSacos: 0,
    totalCuarzo: 0,
    totalLlampo: 0,
    tiempoPorMolino: 0,
    procesoIniciado: false,
    procesoId: null,
    estado_proceso: 'PROCESANDO',
    allowedMineralType: ''
  });

  const { validate, errors } = useFormValidation({
    schema: millingProcessSchema
  });

  // Fetch data
  useEffect(() => {
    fetchMills();
    fetchClients();
  }, [fetchMills, fetchClients]);

  // Utility functions
  const calcularHoraFin = (horaInicio: string, minutosTotales: number): string => {
    if (!horaInicio || minutosTotales <= 0) return '--:--';
    const [horas, minutos] = horaInicio.split(':').map(Number);
    const totalMinutos = horas * 60 + minutos + minutosTotales;
    let horasFin = Math.floor(totalMinutos / 60) % 24;
    const minutosFin = totalMinutos % 60;
    return `${horasFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}`;
  };

  const getTiempoSeleccionado = (): number => {
    if (molienda.mineral === 'OXIDO') {
      if (molienda.tiempos.oxido.hora40 && molienda.tiempos.oxido.hora00) return 100;
      if (molienda.tiempos.oxido.hora40) return 100;
      if (molienda.tiempos.oxido.hora00) return 60;
      return 100;
    } else if (molienda.mineral === 'SULFURO') {
      if (molienda.tiempos.sulfuro.hora00 && molienda.tiempos.sulfuro.hora30) return 150;
      if (molienda.tiempos.sulfuro.hora30) return 150;
      if (molienda.tiempos.sulfuro.hora00) return 120;
      return 150;
    }
    return 0;
  };

  // Derived state for totals and calculations
  const totalCalculado = React.useMemo(() => {
    let totalSacos = 0;
    let totalCuarzo = 0;
    let totalLlampo = 0;
    const tiempoPorMolino = getTiempoSeleccionado();

    molienda.molinos.forEach(molino => {
      if (molino.activo) {
        totalSacos += molino.total;
        totalCuarzo += molino.cuarzo;
        totalLlampo += molino.llampo;
      }
    });

    const stockRestanteTotal = molienda.stockTotal - totalSacos;
    const stockRestanteCuarzo = molienda.stockCuarzo - totalCuarzo;
    const stockRestanteLlampo = molienda.stockLlampo - totalLlampo;

    let horaFinGlobal = null;
    if (molienda.horaInicio && tiempoPorMolino > 0) {
      horaFinGlobal = calcularHoraFin(molienda.horaInicio, tiempoPorMolino);
    }

    return {
      totalSacos,
      totalCuarzo,
      totalLlampo,
      stockRestanteTotal,
      stockRestanteCuarzo,
      stockRestanteLlampo,
      tiempoPorMolino,
      horaFin: horaFinGlobal
    };
  }, [molienda.molinos, molienda.stockTotal, molienda.stockCuarzo, molienda.stockLlampo, molienda.tiempos, molienda.mineral, molienda.horaInicio]);

  // Update mill calculations (time and end hour) within the list when inputs change
  // This is handled in handleMolinoChange to avoid infinite loops

  // Initialize and Sync mills from store
  useEffect(() => {
    console.log('🔄 RegistroMolienda: mills from store:', mills);

    if (mills.length > 0) {
      setMolienda(prev => {
        console.log('🔧 RegistroMolienda: Initializing/Syncing molinos. Current length:', prev.molinos.length);

        // If we haven't initialized mills yet
        if (prev.molinos.length === 0) {
          const initialMolinos = mills.map(m => ({
            id: m.id,
            name: m.name || m.id,
            activo: false,
            cuarzo: 0,
            llampo: 0,
            total: 0,
            capacidadMaxima: m.capacity || 150,
            disponible: m.status && m.status.toUpperCase() === 'LIBRE',
            status: m.status,
            tiempoEstimado: 0,
            horaFin: null,
            current_client: m.current_client,
            current_sacks: m.current_sacks,
            start_time: m.start_time,
            estimated_end_time: m.estimated_end_time
          }));
          console.log('✅ RegistroMolienda: Initialized molinos:', initialMolinos);
          return {
            ...prev,
            molinos: initialMolinos
          };
        }

        // Sync availability and status for existing mills
        const updatedMolinos = prev.molinos.map(localM => {
          const storeM = mills.find(sm => sm.id === localM.id);
          if (storeM) {
            const isNowBusy = storeM.status && storeM.status.toUpperCase() !== 'LIBRE';
            return {
              ...localM,
              disponible: !isNowBusy,
              status: storeM.status,
              activo: isNowBusy ? false : localM.activo,
              current_client: storeM.current_client || localM.current_client,
              current_sacks: storeM.current_sacks || localM.current_sacks,
              start_time: storeM.start_time || localM.start_time,
              estimated_end_time: storeM.estimated_end_time || localM.estimated_end_time
            };
          }
          return localM;
        });

        // Add any NEW mills
        const existingIds = prev.molinos.map(m => m.id);
        const newMillsInStore = mills.filter(m => !existingIds.includes(m.id));

        if (newMillsInStore.length > 0) {
          console.log('🆕 RegistroMolienda: Adding new mills from store:', newMillsInStore.length);
          const extraMolinos = newMillsInStore.map(m => ({
            id: m.id,
            name: m.name || m.id,
            activo: false,
            cuarzo: 0,
            llampo: 0,
            total: 0,
            capacidadMaxima: m.capacity || 150,
            disponible: m.status && m.status.toUpperCase() === 'LIBRE',
            status: m.status,
            tiempoEstimado: 0,
            horaFin: null,
            current_client: m.current_client,
            current_sacks: m.current_sacks
          }));
          return { ...prev, molinos: [...updatedMolinos, ...extraMolinos] };
        }

        return { ...prev, molinos: updatedMolinos };
      });
    } else {
      console.log('⚠️ RegistroMolienda: mills is empty in store');
    }
  }, [mills]);

  // Handlers
  const handleClienteChange = (clienteId: string) => {
    const cliente = clients.find(c => c.id === clienteId);
    if (cliente) {
      const stockTotal = (cliente.stock_cuarzo || 0) + (cliente.stock_llampo || 0);

      // Auto-set mineral type if available from client intake history
      const mineralType = (cliente as any).last_mineral_type as 'OXIDO' | 'SULFURO' | '';

      // Set current time as default if not already set
      const currentHora = new Date().toTimeString().slice(0, 5);

      setMolienda(prev => ({
        ...prev,
        clienteId: cliente.id,
        clienteNombre: cliente.name,
        tipoCliente: (cliente.client_type || 'MINERO') as any,
        mineral: mineralType || prev.mineral,
        allowedMineralType: mineralType,
        horaInicio: prev.horaInicio || currentHora,
        stockTotal,
        stockCuarzo: cliente.stock_cuarzo || 0,
        stockLlampo: cliente.stock_llampo || 0,
        stockRestanteTotal: stockTotal,
        stockRestanteCuarzo: cliente.stock_cuarzo || 0,
        stockRestanteLlampo: cliente.stock_llampo || 0
      }));

      toast.info('Cliente Seleccionado', `Se cargó el stock y el tipo de mineral (${mineralType || 'No registrado'})`);
    }
  };

  const handleMineralChange = (type: 'OXIDO' | 'SULFURO') => {
    setMolienda(prev => ({ ...prev, mineral: type }));
  };

  const handleTiempoChange = (mineral: string, opcion: string, checked: boolean) => {
    setMolienda(prev => {
      if (mineral === 'OXIDO') {
        return {
          ...prev,
          tiempos: {
            ...prev.tiempos,
            oxido: { ...prev.tiempos.oxido, [opcion]: checked }
          }
        };
      } else if (mineral === 'SULFURO') {
        return {
          ...prev,
          tiempos: {
            ...prev.tiempos,
            sulfuro: { ...prev.tiempos.sulfuro, [opcion]: checked }
          }
        };
      }
      return prev;
    });
  };

  const handleMolinoChange = (molinoId: string, campo: string, valor: any) => {
    setMolienda(prev => {
      const nuevosMolinos = prev.molinos.map(molino => {
        if (molino.id === molinoId) {
          let updatedMolino = { ...molino };

          if (campo === 'activo') {
            updatedMolino.activo = valor;
            if (!valor) {
              updatedMolino.cuarzo = 0;
              updatedMolino.llampo = 0;
              updatedMolino.total = 0;
              updatedMolino.tiempoEstimado = 0;
              updatedMolino.horaFin = null;
            } else {
              const tiempoPorMolino = getTiempoSeleccionado();
              updatedMolino.tiempoEstimado = tiempoPorMolino;
              if (prev.horaInicio) {
                updatedMolino.horaFin = calcularHoraFin(prev.horaInicio, tiempoPorMolino);
              }
            }
          } else if (campo === 'cuarzo') {
            const cuarzo = Math.max(0, Math.min(valor, updatedMolino.capacidadMaxima));
            updatedMolino.cuarzo = cuarzo;
            updatedMolino.total = updatedMolino.cuarzo + updatedMolino.llampo;
          } else if (campo === 'llampo') {
            const llampo = Math.max(0, Math.min(valor, updatedMolino.capacidadMaxima));
            updatedMolino.llampo = llampo;
            updatedMolino.total = updatedMolino.cuarzo + updatedMolino.llampo;
          }

          return updatedMolino;
        }
        return molino;
      });

      return { ...prev, molinos: nuevosMolinos };
    });
  };

  const handleReplicate = (sourceMolinoId: string) => {
    setMolienda(prev => {
      const sourceMolino = prev.molinos.find(m => m.id === sourceMolinoId);
      if (!sourceMolino) return prev;

      const nuevosMolinos = prev.molinos.map(molino => {
        if (molino.activo && molino.id !== sourceMolinoId) {
          return {
            ...molino,
            cuarzo: Math.min(sourceMolino.cuarzo, molino.capacidadMaxima),
            llampo: Math.min(sourceMolino.llampo, molino.capacidadMaxima),
            total: Math.min(sourceMolino.total, molino.capacidadMaxima)
          };
        }
        return molino;
      });

      toast.info('Configuración Replicada', 'Se ha copiado la carga a todos los molinos activos.');
      return { ...prev, molinos: nuevosMolinos };
    });
  };

  // Validation
  const validarRegistro = async (): Promise<boolean> => {
    // 1. Zod Basic Validation
    const basicData = {
      clientId: molienda.clienteId,
      mineral: molienda.mineral,
      totalSacos: totalCalculado.totalSacos,
      totalCuarzo: totalCalculado.totalCuarzo,
      totalLlampo: totalCalculado.totalLlampo,
      observaciones: molienda.observaciones
    };

    const isValid = await validate(basicData);
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      toast.warning('Datos Inválidos', firstError || 'Por favor revise los campos del formulario');
      return false;
    }

    // 2. Business Logic Validation
    if (molienda.mineral === 'OXIDO' && !molienda.tiempos.oxido.hora40 && !molienda.tiempos.oxido.hora00) {
      toast.warning('Tiempo no seleccionado', 'Debe seleccionar al menos un tiempo para Óxido.');
      return false;
    }

    if (molienda.mineral === 'SULFURO' && !molienda.tiempos.sulfuro.hora00 && !molienda.tiempos.sulfuro.hora30) {
      toast.warning('Tiempo no seleccionado', 'Debe seleccionar al menos un tiempo para Sulfuro.');
      return false;
    }

    const molinosActivos = molienda.molinos.filter(m => m.activo);
    if (molinosActivos.length === 0) {
      toast.warning('Sin Molinos', 'Debe seleccionar al menos un molino para procesar.');
      return false;
    }

    const molinosConSacos = molinosActivos.filter(m => m.total > 0);
    if (molinosConSacos.length === 0) {
      toast.warning('Molinos Vacíos', 'Debe ingresar la cantidad de sacos en los molinos seleccionados.');
      return false;
    }

    if (totalCalculado.stockRestanteTotal < 0) {
      toast.error('Stock Insuficiente', 'La cantidad total de sacos excede el stock disponible del cliente.');
      return false;
    }

    if (totalCalculado.stockRestanteCuarzo < 0) {
      toast.error('Falta Cuarzo', 'No hay suficiente stock de mineral Cuarzo para cubrir la demanda.');
      return false;
    }

    if (totalCalculado.stockRestanteLlampo < 0) {
      toast.error('Falta Llampo', 'No hay suficiente stock de mineral Llampo para cubrir la demanda.');
      return false;
    }

    const molinosNoDisponibles = molinosActivos.filter(m => !m.disponible).map(m => m.name);
    if (molinosNoDisponibles.length > 0) {
      toast.warning('Molinos Ocupados', `Los siguientes molinos no están disponibles: ${molinosNoDisponibles.join(', ')}`);
      return false;
    }

    return true;
  };

  // Register milling
  const registrarMolienda = async () => {
    const isValid = await validarRegistro();
    if (!isValid) return;

    const ahora = new Date();
    const horaInicio = molienda.horaInicio || ahora.toTimeString().slice(0, 5);
    const molinosActivos = molienda.molinos.filter(m => m.activo);

    // Generar timestamps ISO para el estado del molino (si es hoy)
    const fechaProceso = molienda.fechaInicio || ahora.toISOString().split('T')[0];
    const horaInicioISO = new Date(`${fechaProceso}T${horaInicio}`).toISOString();

    const tiempoPorMolino = getTiempoSeleccionado();
    const horaFinCalculada = calcularHoraFin(horaInicio, tiempoPorMolino);
    const horaFinISO = new Date(`${fechaProceso}T${horaFinCalculada}`).toISOString();

    const success = await registerMilling({
      clientId: molienda.clienteId,
      mineralType: molienda.mineral as 'OXIDO' | 'SULFURO',
      totalSacos: totalCalculado.totalSacos,
      totalCuarzo: totalCalculado.totalCuarzo,
      totalLlampo: totalCalculado.totalLlampo,
      mills: molinosActivos.map(m => ({
        id: m.id,
        cuarzo: m.cuarzo,
        llampo: m.llampo,
        total: m.total
      })),
      observations: molienda.observaciones,
      fecha: horaInicioISO, // Persistimos el inicio real como created_at
      horaInicioISO: horaInicioISO,
      horaFinISO: horaFinISO
    });

    if (success) {
      const detalleMolinos = molinosActivos.map(m => `• ${m.name}: ${m.total} sacos`).join('\n');

      toast.success(
        '¡Proceso Registrado!',
        `La molienda ha sido guardada correctamente.\n\nFecha: ${fechaProceso}\nHora inicio: ${horaInicio}\nHora fin estimada: ${horaFinCalculada}\n\nDETALLE:\n${detalleMolinos}`
      );

      resetFormulario();
    } else {
      toast.error('Error', 'Hubo un error al registrar la molienda. Inténtelo de nuevo.');
    }
  };

  const resetFormulario = () => {
    setMolienda(prev => ({
      ...prev,
      clienteId: '',
      clienteNombre: '',
      stockTotal: 0,
      stockCuarzo: 0,
      stockLlampo: 0,
      totalSacos: 0,
      totalCuarzo: 0,
      totalLlampo: 0,
      stockRestanteTotal: 0,
      stockRestanteCuarzo: 0,
      stockRestanteLlampo: 0,
      molinos: prev.molinos.map(m => ({
        ...m,
        activo: false,
        total: 0,
        cuarzo: 0,
        llampo: 0,
        tiempoEstimado: 0,
        horaFin: null
      })),
      observaciones: '',
      procesoIniciado: false
    }));
  };

  // WhatsApp report
  const generarReporteWhatsApp = () => {
    if (!molienda.clienteId || molienda.totalSacos === 0) {
      toast.warning('Molienda Vacía', 'Complete los datos de la molienda antes de enviar el reporte.');
      return;
    }

    let mensaje = `🏭 *DETALLE DE MOLIENDA*\n\n`;
    mensaje += `*Cliente:* ${molienda.clienteNombre}\n`;
    mensaje += `*Tipo Cliente:* ${TIPO_CLIENTE.find(t => t.value === molienda.tipoCliente)?.label}\n`;
    mensaje += `*Mineral:* ${MINERAL_TYPES_STOCK.find(m => m.value === molienda.mineral)?.label}\n\n`;
    mensaje += `*TOTALES:*\n`;
    mensaje += `• Total sacos: ${totalCalculado.totalSacos}\n`;
    mensaje += `• Cuarzo: ${totalCalculado.totalCuarzo} sacos\n`;
    mensaje += `• Llampo: ${totalCalculado.totalLlampo} sacos\n`;
    mensaje += `• Molinos activos: ${molienda.molinos.filter(m => m.activo).length}\n\n`;
    mensaje += `📋 *Vista Previa* - ${new Date().toLocaleString()}\n`;

    const mensajeCodificado = encodeURIComponent(mensaje);
    window.open(`https://wa.me/?text=${mensajeCodificado}`, '_blank');
  };

  const handleSeed = async () => {
    const success = await useSupabaseStore.getState().seedMills();
    if (success) {
      toast.success('Molinos Inicializados', 'Se han creado los 4 molinos principales correctamente.');
    } else {
      toast.error('Error', 'No se pudieron inicializar los molinos. Verifique su conexión.');
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Nueva Molienda</h1>
          <p className="text-slate-500 mt-1 font-medium">Registro de proceso de molienda</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => receiptModal.open()}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-bold text-sm"
            disabled={totalCalculado.totalSacos === 0}
          >
            <Printer size={18} strokeWidth={2} className="mr-2" />
            Ticket
          </button>
          <button
            onClick={generarReporteWhatsApp}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm font-bold text-sm"
          >
            <MessageSquare size={18} strokeWidth={2} className="mr-2" />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Row 1: Client Selection */}
      <div className="grid grid-cols-1 gap-6">
        <ClientSelector
          clients={clients}
          selectedClientId={molienda.clienteId}
          onClientChange={handleClienteChange}
          stockInfo={molienda.clienteId ? {
            total: molienda.stockTotal,
            cuarzo: molienda.stockCuarzo,
            llampo: molienda.stockLlampo
          } : undefined}
          disabled={molienda.procesoIniciado}
        />
      </div>

      {/* Row 2: Time & Mineral */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Time Config */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <span className="mr-2">⏱️</span>
                Horario del Proceso
              </h2>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
                {new Date().toLocaleDateString()}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha del Proceso</label>
                  <input
                    type="date"
                    value={molienda.fechaInicio || ''}
                    onChange={(e) => setMolienda(prev => ({ ...prev, fechaInicio: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hora de Inicio</label>
                  <input
                    type="time"
                    value={molienda.horaInicio || ''}
                    onChange={(e) => setMolienda(prev => ({ ...prev, horaInicio: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Ingrese la hora real de encendido</p>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col justify-center">
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hora Fin Estimada</label>
                <div className="text-2xl font-black text-indigo-900">
                  {totalCalculado.horaFin || '--:--'}
                </div>
                <div className="text-[10px] text-indigo-600 mt-1 font-bold">
                  {totalCalculado.tiempoPorMolino} min de molienda
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mineral Selection */}
        <div className="lg:col-span-2">
          <MineralTypeSelector
            mineralType={molienda.mineral}
            onMineralChange={(tipo) => setMolienda(prev => ({ ...prev, mineral: tipo }))}
            tiempos={molienda.tiempos}
            onTiempoChange={handleTiempoChange}
            disabled={molienda.procesoIniciado}
            allowedType={molienda.allowedMineralType}
          />
        </div>
      </div>

      {/* Row 3: Mill Config */}
      <MillSelector
        molinos={molienda.molinos}
        onMolinoChange={handleMolinoChange}
        onReplicate={handleReplicate}
        onSeed={handleSeed}
        loading={useSupabaseStore.getState().millsLoading}
        disabled={molienda.procesoIniciado}
      />

      {/* Row 4: Summary */}
      <ProcessSummary
        totalSacos={totalCalculado.totalSacos}
        totalCuarzo={totalCalculado.totalCuarzo}
        totalLlampo={totalCalculado.totalLlampo}
        stockRestante={{
          total: totalCalculado.stockRestanteTotal,
          cuarzo: totalCalculado.stockRestanteCuarzo,
          llampo: totalCalculado.stockRestanteLlampo
        }}
        tiempoPorMolino={totalCalculado.tiempoPorMolino}
        horaInicio={molienda.horaInicio}
        horaFin={totalCalculado.horaFin}
        molinosActivos={molienda.molinos.filter(m => m.activo).length}
        observaciones={molienda.observaciones}
        onObservacionesChange={(value) => setMolienda(prev => ({ ...prev, observaciones: value }))}
      />

      {/* Final Action */}
      <div className="flex justify-end">
        <button
          onClick={registrarMolienda}
          className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg font-medium"
          disabled={molienda.procesoIniciado}
        >
          <Save size={20} className="mr-2" />
          Registrar Molienda
        </button>
      </div>

      {/* Modal */}
      <ReceiptModal
        isOpen={receiptModal.isOpen}
        onClose={receiptModal.close}
        moliendaData={molienda as any}
        userEmail={user?.email}
      />
    </div>
  );
};

export default RegistroMolienda;
