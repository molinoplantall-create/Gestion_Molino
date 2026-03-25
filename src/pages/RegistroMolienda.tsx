import React, { useState, useEffect } from 'react';
import { Save, Printer, MessageSquare, Clock, AlertTriangle, TrendingUp, Factory, RefreshCw } from 'lucide-react';
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
  estimated_end?: string;
}

interface TiemposProceso {
  oxido: { hora40: boolean; hora30: boolean; hora00: boolean };
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
      oxido: { hora40: true, hora30: false, hora00: false },
      sulfuro: { hora00: false, hora30: true }
    },
    fechaInicio: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD local robusto
    horaInicio: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
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

  const [isRegistering, setIsRegistering] = useState(false);

  const { validate, errors } = useFormValidation({
    schema: millingProcessSchema
  });

  // Fetch data
  useEffect(() => {
    fetchClients({ pageSize: 500 });
    fetchMills();
  }, [fetchClients, fetchMills]);

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
      if (molienda.tiempos.oxido.hora40) return 100;
      if (molienda.tiempos.oxido.hora30) return 90;
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
            estimated_end: m.estimated_end
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
              estimated_end: storeM.estimated_end || localM.estimated_end
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
  const handleClienteChange = async (clienteId: string) => {
    const cliente = clients.find(c => c.id === clienteId);
    if (!cliente) return;

    // 🔄 Forzar resincronización antes de mostrar stock
    // Esto recalcula clients.stock_* desde los lotes reales
    await useSupabaseStore.getState().recalcClientStock(clienteId);

    // Obtener datos frescos directo de la base de datos (no del cache del store)
    const { supabase } = await import('@/lib/supabase');
    const { data: freshClient } = await supabase
      .from('clients')
      .select('stock_cuarzo, stock_llampo, last_mineral_type')
      .eq('id', clienteId)
      .single();

    const stockCuarzo = freshClient?.stock_cuarzo || 0;
    const stockLlampo = freshClient?.stock_llampo || 0;
    const stockTotal = stockCuarzo + stockLlampo;

    // Auto-set mineral type if available from client intake history
    const mineralType = (freshClient?.last_mineral_type || cliente.last_mineral_type || '') as 'OXIDO' | 'SULFURO' | '';

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
      stockCuarzo,
      stockLlampo,
      stockRestanteTotal: stockTotal,
      stockRestanteCuarzo: stockCuarzo,
      stockRestanteLlampo: stockLlampo
    }));

    console.log(`✅ handleClienteChange: Stock sincronizado para ${cliente.name}: Cu=${stockCuarzo}, Ll=${stockLlampo}, Total=${stockTotal}`);
    toast.info('Cliente Seleccionado', `Stock verificado: ${stockTotal} sacos (${mineralType || 'Tipo no registrado'})`);
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
    if (molienda.mineral === 'OXIDO' && !molienda.tiempos.oxido.hora40 && !molienda.tiempos.oxido.hora30 && !molienda.tiempos.oxido.hora00) {
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
    if (isRegistering) return;

    const isValid = await validarRegistro();
    if (!isValid) return;

    setIsRegistering(true);

    // Safety timeout: Reset isRegistering if the operation takes too long (45s)
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ RegistroMolienda: Safety timeout reached for registration.');
      setIsRegistering(false);
      toast.error('Tiempo de Espera Agotado', 'El registro está tardando demasiado. Verifique su conexión o actualice la página.');
    }, 45000);

    try {
      console.log('🚀 RegistroMolienda: Iniciando registro...', {
        cliente: molienda.clienteNombre,
        mineral: molienda.mineral,
        total: totalCalculado.totalSacos
      });

      const ahora = new Date();
      const horaInicio = molienda.horaInicio || ahora.toTimeString().slice(0, 5);
      const molinosActivos = molienda.molinos.filter(m => m.activo);

      // Generar timestamps ISO robustos usando fecha local del sistema
      const [startH, startM] = horaInicio.split(':').map(Number);
      const dateStr = molienda.fechaInicio || ahora.toISOString().split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);

      // Crear objeto fecha en horario local del navegador
      let startDate = new Date(year, month - 1, day, startH, startM, 0, 0);

      // Fallback si la fecha es inválida
      if (isNaN(startDate.getTime())) {
        console.error('❌ RegistroMolienda: Fecha inválida detectada:', { dateStr, startH, startM });
        startDate = new Date();
      }

      const horaInicioISO = startDate.toISOString();

      const tiempoPorMolino = getTiempoSeleccionado();
      const endDate = new Date(startDate.getTime() + (tiempoPorMolino * 60 * 1000));
      const horaFinISO = endDate.toISOString();
      const horaFinCalculada = endDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });

      console.log('📦 RegistroMolienda: Datos a enviar:', {
        clientId: molienda.clienteId,
        mineralType: molienda.mineral,
        totalSacos: totalCalculado.totalSacos,
        mills: molinosActivos.map(m => m.name),
        horaInicioISO,
        horaFinISO
      });

      const success = await registerMilling({
        clientId: molienda.clienteId,
        mineralType: molienda.mineral as 'OXIDO' | 'SULFURO',
        totalSacos: totalCalculado.totalSacos,
        totalCuarzo: totalCalculado.totalCuarzo,
        totalLlampo: totalCalculado.totalLlampo,
        mills: molinosActivos.map(m => ({
          id: m.id,
          name: m.name,
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
        const fechaFormateada = startDate.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

        toast.success(
          '¡Proceso Registrado!',
          `La molienda ha sido guardada correctamente.\n\nFecha: ${fechaFormateada}\nHora inicio: ${horaInicio}\nHora fin estimada: ${horaFinCalculada}\n\nDETALLE:\n${detalleMolinos}`
        );

        resetFormulario();
      } else {
        toast.error('Error', 'Hubo un error al registrar la molienda. Inténtelo de nuevo.');
      }
    } catch (err) {
      console.error('Error in registrarMolienda:', err);
      toast.error('Error Crítico', 'Ocurrió un error inesperado al procesar el registro.');
    } finally {
      clearTimeout(safetyTimeout);
      setIsRegistering(false);
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
    if (!molienda.clienteId || totalCalculado.totalSacos === 0) {
      toast.warning('Molienda Vacía', 'Complete los datos de la molienda antes de enviar el reporte.');
      return;
    }

    const molinosActivos = molienda.molinos.filter(m => m.activo && m.total > 0);
    const moliendasActivas = mills.filter(m => m.current_client_id === molienda.clienteId && m.status === 'OCUPADO').length;

    let mensaje = `🏭 *AVISO DE NUEVA MOLIENDA*\n\n`;
    mensaje += `*Cliente:* ${molienda.clienteNombre}\n`;
    mensaje += `*Mineral:* ${molienda.mineral}\n\n`;

    if (moliendasActivas > 0) {
      mensaje += `🔄 *Total moliendas activas del cliente:* ${moliendasActivas + 1}\n\n`;
    }

    mensaje += `📋 *STOCK DEL CLIENTE:*\n`;
    mensaje += `• *Total:* ${molienda.stockTotal}\n`;
    mensaje += `• Cuarzo: ${molienda.stockCuarzo}\n`;
    mensaje += `• Llampo: ${molienda.stockLlampo}\n\n`;

    mensaje += `📦 *DETALLE DE CARGA:*\n`;
    mensaje += `• *Total Sacos:* ${totalCalculado.totalSacos}\n`;
    mensaje += `• Cuarzo: ${totalCalculado.totalCuarzo} sacos\n`;
    mensaje += `• Llampo: ${totalCalculado.totalLlampo} sacos\n\n`;

    mensaje += `⚙️ *DISTRIBUCIÓN POR MOLINO:*\n`;
    molinosActivos.forEach(m => {
      mensaje += `▫️ *${m.name}:* ${m.total} sacos (${m.cuarzo} Cu / ${m.llampo} Ll)\n`;
    });

    if (molienda.horaInicio) {
      mensaje += `\n⏰ *Inicio:* ${molienda.horaInicio}\n`;
    }

    if (totalCalculado.horaFin) {
      mensaje += `🏁 *Final Estimado:* ${totalCalculado.horaFin}\n`;
    }

    if (totalCalculado.stockRestanteTotal >= 0) {
      mensaje += `\n📉 *STOCK RESTANTE:*\n`;
      mensaje += `• *Total:* ${totalCalculado.stockRestanteTotal} sacos\n`;
      mensaje += `• Cuarzo: ${totalCalculado.stockRestanteCuarzo}\n`;
      mensaje += `• Llampo: ${totalCalculado.stockRestanteLlampo}\n`;
    }

    if (molienda.observaciones) {
      mensaje += `\n📝 *Obs:* ${molienda.observaciones}\n`;
    }

    mensaje += `\n_Generado por Sistema Gestión Molino_`;

    const mensajeCodificado = encodeURIComponent(mensaje);
    // Abrir WhatsApp con el mensaje pre-cargado
    window.open(`https://api.whatsapp.com/send?text=${mensajeCodificado}`, '_blank');
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
    <div className="space-y-8 pb-32 max-w-[1600px] mx-auto px-4 md:px-6">
      {/* HEADER INDUSTRIAL UNIFICADO */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">CENTRO DE OPERACIONES</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight text-balance">Registro de Molienda</h1>
          <p className="text-slate-500 font-medium flex items-center mt-2">
            <Factory size={18} className="mr-2 text-indigo-500" />
            Configuración técnica y despliegue de carga por molino
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => receiptModal.open()}
            disabled={totalCalculado.totalSacos === 0}
            className={`flex items-center px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg ${totalCalculado.totalSacos > 0
              ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
              }`}
          >
            <Printer size={18} className="mr-3" />
            VISTA PREVIA TICKET
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: IDENTIFICACIÓN DE CARGA */}
      <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-[2.5rem] blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
          <div className="relative">
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
        </div>
      </div>

      {/* SECCIÓN 2: PARÁMETROS TÉCNICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Horario con Estética Dashboard */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <Clock className="text-amber-600" size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">Horario del Proceso</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Control de tiempos operativos</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-black text-slate-400">{new Date().toLocaleDateString('es-PE')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 flex-grow">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">FECHA DEL PROCESO</label>
                  <input
                    type="date"
                    value={molienda.fechaInicio || ''}
                    onChange={(e) => setMolienda(prev => ({ ...prev, fechaInicio: e.target.value }))}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-black text-slate-700 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">HORA DE ENCENDIDO (INICIO)</label>
                  <input
                    type="time"
                    value={molienda.horaInicio || ''}
                    onChange={(e) => setMolienda(prev => ({ ...prev, horaInicio: e.target.value }))}
                    className="w-full px-5 py-5 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-black text-slate-900 text-3xl transition-all shadow-inner"
                  />
                  <div className="flex items-center gap-2 mt-3 ml-1 text-amber-600">
                    <AlertTriangle size={12} />
                    <span className="text-[9px] font-black uppercase tracking-tight">Verificar hora real antes de guardar</span>
                  </div>
                </div>
              </div>

              <div className="relative group overflow-hidden">
                <div className="absolute inset-0 bg-indigo-900 transition-transform duration-500 group-hover:scale-105"></div>
                <div className="relative p-8 h-full flex flex-col justify-between text-white z-10">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-indigo-800/50 rounded-lg backdrop-blur-sm">
                      <Clock size={20} />
                    </div>
                    <span className="text-[10px] font-black tracking-widest bg-white/10 px-2 py-1 rounded-md backdrop-blur-sm">CÁLCULO AUTO</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">HORA FIN ESTIMADA</label>
                    <div className="text-5xl font-black tracking-tighter mb-2">
                      {totalCalculado.horaFin || '00:00'}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-800/50 rounded-full w-fit backdrop-blur-sm">
                      <TrendingUp size={14} className="text-indigo-300" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">
                        +{totalCalculado.tiempoPorMolino} minutos de ciclo
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tipo de Mineral Estilo Tarjeta Premium */}
        <div className="lg:col-span-5">
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
          onClick={generarReporteWhatsApp}
          className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 font-bold text-sm tracking-tight mr-4"
        >
          <MessageSquare size={18} className="mr-2" />
          NOTIFICAR WHATSAPP
        </button>

        <button
          onClick={registrarMolienda}
          className={`flex items-center px-6 py-3 rounded-xl transition-all shadow-lg font-bold text-sm tracking-tight ${isRegistering
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
            }`}
          disabled={isRegistering || molienda.procesoIniciado}
        >
          {isRegistering ? (
            <>
              <RefreshCw size={18} className="mr-2 animate-spin" />
              REGISTRANDO...
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              REGISTRAR MOLIENDA
            </>
          )}
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
