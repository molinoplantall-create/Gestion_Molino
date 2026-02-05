import React, { useState, useEffect } from 'react';
import {
  Save,
  Printer,
  MessageSquare,
  Package,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Calculator,
  TrendingUp,
  Factory,
  X
} from 'lucide-react';
import {
  TIPO_CLIENTE,
  MINERAL_TYPES_STOCK,
  MOLINO_STATUS
} from '../constants';
import { useAuthStore } from '../store/authStore';
import { useSupabaseStore } from '../store/supabaseStore';
import ConfirmationModal from '../components/ui/ConfirmationModal';

// Tipo para datos de molino en proceso
interface MolinoProceso {
  id: string;
  nombre: string;
  activo: boolean;
  cuarzo: number;
  llampo: number;
  total: number;
  capacidadMaxima: number;
  disponible: boolean;
  estado: keyof typeof MOLINO_STATUS;
  tiempoEstimado: number; // minutos
  horaFin: string | null; // Hora fin específica para este molino
  // UI Display for busy mills
  current_client?: string;
  current_sacks?: number;
}

// Tipo para tiempos de proceso
interface TiemposProceso {
  oxido: {
    hora40: boolean; // 1:40 (100 min)
    hora00: boolean; // 1:00 (60 min)
  };
  sulfuro: {
    hora00: boolean; // 2:00 (120 min)
    hora30: boolean; // 2:30 (150 min)
  };
}

// Tipo principal para molienda
interface MoliendaData {
  clienteId: string;
  clienteNombre: string;
  tipoCliente: 'MINERO' | 'PALLAQUERO';
  mineral: 'OXIDO' | 'SULFURO';
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
  tiempoPorMolino: number; // minutos por molino (NO suma de todos)
  procesoIniciado: boolean;
  procesoId: string | null;
  estado: 'PROCESANDO' | 'COMPLETADO' | 'CANCELADO';
}

const RegistroMolienda: React.FC = () => {
  const { user } = useAuthStore();
  const { mills, clients, fetchMills, fetchClients, registerMilling } = useSupabaseStore();

  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [firmaOperador, setFirmaOperador] = useState('');
  const [firmaCliente, setFirmaCliente] = useState('');

  // Estados para Modal
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'danger' | 'success',
    onConfirm: () => { },
    showCancel: false,
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    icon: 'alert' as 'alert' | 'trash' | 'logout' | 'success'
  });

  // Init fetch
  useEffect(() => {
    fetchMills();
    fetchClients();
  }, [fetchMills, fetchClients]);

  const showAlert = (title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'warning') => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
      showCancel: false,
      confirmText: 'Aceptar',
      cancelText: '',
      icon: type === 'success' ? 'success' : 'alert'
    });
  };

  // Estado principal de la molienda
  const [molienda, setMolienda] = useState<MoliendaData>({
    clienteId: '',
    clienteNombre: '',
    tipoCliente: '' as any,
    mineral: '' as any,
    tiempos: {
      oxido: { hora40: true, hora00: false },
      sulfuro: { hora00: false, hora30: true }
    },
    fechaInicio: null,
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
    estado: 'PROCESANDO'
  });

  // Inicializar molinos cuando la data esté disponible
  useEffect(() => {
    if (mills.length > 0 && molienda.molinos.length === 0) {
      setMolienda(prev => ({
        ...prev,
        molinos: mills.map(m => ({
          id: m.id,
          nombre: m.name,
          activo: false,
          cuarzo: 0,
          llampo: 0,
          total: 0,
          capacidadMaxima: m.capacity || 200,
          disponible: m.status === 'libre',
          estado: m.status?.toUpperCase() as any || 'LIBRE',
          tiempoEstimado: 0,
          horaFin: null
        }))
      }));
    }
  }, [mills, molienda.molinos.length]);

  // Sync molinos local state with Supabase Store state
  useEffect(() => {
    if (mills.length > 0) {
      setMolienda(prev => {
        // Init or update
        // Si no hay molinos locales, inicializamos con los del store
        if (prev.molinos.length === 0) {
          return {
            ...prev,
            molinos: mills.map(m => ({
              id: m.id,
              nombre: m.name,
              activo: false,
              cuarzo: 0,
              llampo: 0,
              total: 0,
              capacidadMaxima: m.capacity,
              disponible: m.status === 'libre',
              estado: m.status as any,
              tiempoEstimado: 0,
              horaFin: null,
              current_client: m.current_client,
              current_sacks: m.current_sacks
            }))
          };
        }

        // Si ya hay, actualizamos SOLO estado y disponibilidad
        const updatedMolinos = prev.molinos.map(localM => {
          const storeM = mills.find(sm => sm.id === localM.id);
          if (storeM) {
            const isNowBusy = storeM.status !== 'libre';
            return {
              ...localM,
              disponible: !isNowBusy,
              estado: storeM.status as any,
              // Si el molino se ocupó (y no es por nosotros ahora mismo - aunque esta lógica es simple), 
              // desactivar selección si estaba activo pero no iniciado.
              // Para simplificar: si está ocupado en BD, está ocupado en UI.
              activo: isNowBusy ? false : localM.activo
            };
          }
          return localM;
        });

        return { ...prev, molinos: updatedMolinos };
      });
    }
  }, [mills]);

  // Función CORREGIDA para calcular hora fin - Opción A: Cada molino termina igual
  const calcularHoraFin = (horaInicio: string, minutosTotales: number): string => {
    if (!horaInicio || minutosTotales <= 0) return '--:--';

    const [horas, minutos] = horaInicio.split(':').map(Number);
    const totalMinutos = horas * 60 + minutos + minutosTotales;

    // Calcular nuevas horas y minutos
    let horasFin = Math.floor(totalMinutos / 60);
    const minutosFin = totalMinutos % 60;

    // Si pasa de 24 horas, ajustar al formato 24h
    horasFin = horasFin % 24;

    return `${horasFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}`;
  };

  const formatTiempo = (totalMinutos: number): string => {
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }
    return `${minutos}min`;
  };

  // Calcular tiempo seleccionado por molino
  const getTiempoSeleccionado = (): number => {
    if (molienda.mineral === 'OXIDO') {
      if (molienda.tiempos.oxido.hora40 && molienda.tiempos.oxido.hora00) {
        return 100; // Si ambos, usar 1:40
      } else if (molienda.tiempos.oxido.hora40) {
        return 100; // 1:40
      } else if (molienda.tiempos.oxido.hora00) {
        return 60;  // 1:00
      }
      return 100; // Default
    } else if (molienda.mineral === 'SULFURO') {
      if (molienda.tiempos.sulfuro.hora00 && molienda.tiempos.sulfuro.hora30) {
        return 150; // Si ambos, usar 2:30
      } else if (molienda.tiempos.sulfuro.hora30) {
        return 150; // 2:30
      } else if (molienda.tiempos.sulfuro.hora00) {
        return 120; // 2:00
      }
      return 150; // Default
    }
    return 0;
  };

  // Calcular totales cuando cambian los molinos o tiempos
  useEffect(() => {
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

    // Calcular hora fin global (todos los molinos terminan a la misma hora)
    let horaFinGlobal = null;
    if (molienda.horaInicio && tiempoPorMolino > 0) {
      horaFinGlobal = calcularHoraFin(molienda.horaInicio, tiempoPorMolino);
    }

    // Actualizar hora fin de cada molino activo
    const nuevosMolinos = molienda.molinos.map(molino => {
      if (molino.activo && molienda.horaInicio) {
        return {
          ...molino,
          horaFin: horaFinGlobal,
          tiempoEstimado: tiempoPorMolino
        };
      }
      return {
        ...molino,
        horaFin: molino.activo && molienda.horaInicio ? horaFinGlobal : null,
        tiempoEstimado: molino.activo ? tiempoPorMolino : 0
      };
    });

    setMolienda(prev => ({
      ...prev,
      totalSacos,
      totalCuarzo,
      totalLlampo,
      stockRestanteTotal,
      stockRestanteCuarzo,
      stockRestanteLlampo,
      tiempoPorMolino, // Solo tiempo por molino, NO suma
      horaFin: horaFinGlobal,
      molinos: nuevosMolinos
    }));
  }, [molienda.molinos, molienda.stockTotal, molienda.stockCuarzo, molienda.stockLlampo, molienda.tiempos, molienda.mineral, molienda.horaInicio]);

  // Cuando se selecciona un cliente, cargar su stock
  const handleClienteChange = (clienteId: string) => {
    const cliente = clients.find(c => c.id === clienteId);
    if (cliente) {
      const stockTotal = (cliente.stock_cuarzo || 0) + (cliente.stock_llampo || 0);

      setMolienda(prev => ({
        ...prev,
        clienteId: cliente.id,
        clienteNombre: cliente.name,
        tipoCliente: (cliente.client_type || 'MINERO') as any,
        stockTotal: stockTotal,
        stockCuarzo: cliente.stock_cuarzo || 0,
        stockLlampo: cliente.stock_llampo || 0,
        stockRestanteTotal: stockTotal,
        stockRestanteCuarzo: cliente.stock_cuarzo || 0,
        stockRestanteLlampo: cliente.stock_llampo || 0
      }));
    }
  };

  // Manejar cambios en los tiempos
  const handleTiempoChange = (mineral: string, opcion: string, checked: boolean) => {
    setMolienda(prev => {
      if (mineral === 'OXIDO') {
        return {
          ...prev,
          tiempos: {
            ...prev.tiempos,
            oxido: {
              ...prev.tiempos.oxido,
              [opcion]: checked
            }
          }
        };
      } else if (mineral === 'SULFURO') {
        return {
          ...prev,
          tiempos: {
            ...prev.tiempos,
            sulfuro: {
              ...prev.tiempos.sulfuro,
              [opcion]: checked
            }
          }
        };
      }
      return prev;
    });
  };

  // Manejar cambios en un molino específico
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
              // Calcular hora fin si hay hora inicio
              if (prev.horaInicio) {
                updatedMolino.horaFin = calcularHoraFin(prev.horaInicio, tiempoPorMolino);
              }
            }
          }
          else if (campo === 'cuarzo') {
            const cuarzo = Math.max(0, Math.min(valor, updatedMolino.capacidadMaxima));
            updatedMolino.cuarzo = cuarzo;
            updatedMolino.total = updatedMolino.cuarzo + updatedMolino.llampo;
          }
          else if (campo === 'llampo') {
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

  // Validar si se puede registrar
  const validarRegistro = () => {
    if (!molienda.clienteId) {
      showAlert('Faltan Datos', 'Debe seleccionar un cliente para continuar.', 'warning');
      return false;
    }

    if (!molienda.mineral) {
      showAlert('Faltan Datos', 'Debe seleccionar el tipo de mineral.', 'warning');
      return false;
    }

    // Validar que al menos un tiempo esté seleccionado
    if (molienda.mineral === 'OXIDO') {
      if (!molienda.tiempos.oxido.hora40 && !molienda.tiempos.oxido.hora00) {
        showAlert('Tiempo no seleccionado', 'Debe seleccionar al menos un tiempo para Óxido (1:40 o 1:00).', 'warning');
        return false;
      }
    } else if (molienda.mineral === 'SULFURO') {
      if (!molienda.tiempos.sulfuro.hora00 && !molienda.tiempos.sulfuro.hora30) {
        showAlert('Tiempo no seleccionado', 'Debe seleccionar al menos un tiempo para Sulfuro (2:00 o 2:30).', 'warning');
        return false;
      }
    }

    const molinosActivos = molienda.molinos.filter(m => m.activo);
    if (molinosActivos.length === 0) {
      showAlert('Sin Molinos', 'Debe seleccionar al menos un molino para procesar.', 'warning');
      return false;
    }

    const molinosConSacos = molinosActivos.filter(m => m.total > 0);
    if (molinosConSacos.length === 0) {
      showAlert('Molinos Vacíos', 'Debe ingresar la cantidad de sacos en los molinos seleccionados.', 'warning');
      return false;
    }

    if (molienda.stockRestanteTotal < 0) {
      showAlert('Stock Insuficiente', 'La cantidad total de sacos excede el stock disponible del cliente.', 'danger');
      return false;
    }

    if (molienda.stockRestanteCuarzo < 0) {
      showAlert('Falta Cuarzo', 'No hay suficiente stock de mineral Cuarzo para cubrir la demanda.', 'danger');
      return false;
    }

    if (molienda.stockRestanteLlampo < 0) {
      showAlert('Falta Llampo', 'No hay suficiente stock de mineral Llampo para cubrir la demanda.', 'danger');
      return false;
    }

    const molinosNoDisponibles = molinosActivos
      .filter(m => !m.disponible)
      .map(m => m.nombre);

    if (molinosNoDisponibles.length > 0) {
      showAlert('Molinos Ocupados', `Los siguientes molinos no están disponibles: ${molinosNoDisponibles.join(', ')}`, 'warning');
      return false;
    }

    return true;
  };

  // Generar ID de proceso
  const generarProcesoId = (): string => {
    const fecha = new Date();
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    const secuencia = 1; // En sistema real, esto vendría de la base de datos

    return `MOL-${dia}${mes}${año}-${secuencia}`;
  };

  // Registrar la molienda (inicia inmediatamente)
  const registrarMolienda = async () => {
    if (!validarRegistro()) return;

    const ahora = new Date();
    const procesoId = generarProcesoId();
    const horaInicio = ahora.toTimeString().slice(0, 5);
    const tiempoPorMolino = getTiempoSeleccionado();
    const horaFinGlobal = calcularHoraFin(horaInicio, tiempoPorMolino);

    // Prepare data for Store Action
    const molinosActivos = molienda.molinos.filter(m => m.activo);

    // Call the single transactional action
    const success = await registerMilling({
      clientId: molienda.clienteId,
      mineralType: molienda.mineral,
      totalSacos: molienda.totalSacos,
      totalCuarzo: molienda.totalCuarzo,
      totalLlampo: molienda.totalLlampo,
      mills: molinosActivos.map(m => ({
        id: m.id,
        cuarzo: m.cuarzo,
        llampo: m.llampo,
        total: m.total
      })),
      observations: molienda.observaciones
    });

    if (success) {
      // MODAL DE ÉXITO ESTILO "APP"
      const detalleMolinos = molinosActivos.map(m => `• ${m.nombre}: ${m.total} sacos`).join('\n');

      setModalConfig({
        isOpen: true,
        title: '¡Proceso Iniciado!',
        message: `La molienda ha comenzado correctamente.\n\n` +
          `Hora inicio: ${horaInicio}\n` +
          `Hora fin estimada: ${horaFinGlobal}\n\n` +
          `DETALLE:\n${detalleMolinos}`,
        type: 'success',
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          resetFormulario();
        },
        showCancel: false,
        confirmText: 'Aceptar',
        cancelText: '',
        icon: 'success'
      });
    } else {
      showAlert('Error', 'Hubo un error al registrar la molienda. Inténtelo de nuevo.', 'danger');
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
        tiempoEstimado: 0
      })),
      observaciones: '',
      procesoIniciado: false
    }));
  };

  // Generar reporte para WhatsApp
  const generarReporteWhatsApp = () => {
    if (!molienda.clienteId || molienda.totalSacos === 0) {
      showAlert('Molienda Vacía', 'Complete los datos de la molienda antes de enviar el reporte.', 'warning');
      return;
    }

    let mensaje = `🏭 *DETALLE DE MOLIENDA*\n\n`;
    mensaje += `*Cliente:* ${molienda.clienteNombre}\n`;
    mensaje += `*Tipo Cliente:* ${TIPO_CLIENTE.find(t => t.value === molienda.tipoCliente)?.label}\n`;
    mensaje += `*Mineral:* ${MINERAL_TYPES_STOCK.find(m => m.value === molienda.mineral)?.label}\n`;

    // Información de tiempos seleccionados
    mensaje += `*Tiempo por molino:* `;
    if (molienda.mineral === 'OXIDO') {
      const tiempos = [];
      if (molienda.tiempos.oxido.hora40) tiempos.push('1:40');
      if (molienda.tiempos.oxido.hora00) tiempos.push('1:00');
      mensaje += tiempos.join(' | ');
    } else if (molienda.mineral === 'SULFURO') {
      const tiempos = [];
      if (molienda.tiempos.sulfuro.hora00) tiempos.push('2:00');
      if (molienda.tiempos.sulfuro.hora30) tiempos.push('2:30');
      mensaje += tiempos.join(' | ');
    }
    mensaje += `\n`;

    mensaje += `\n*DETALLE POR MOLINO:*\n`;
    molienda.molinos.forEach((molino, index) => {
      if (molino.activo && molino.total > 0) {
        const tiempoHoras = Math.floor(molino.tiempoEstimado / 60);
        const tiempoMinutos = molino.tiempoEstimado % 60;

        mensaje += `\n${index + 1}. ${molino.nombre}:\n`;
        mensaje += `   • Total: ${molino.total} sacos\n`;
        mensaje += `   • Cuarzo: ${molino.cuarzo} sacos\n`;
        mensaje += `   • Llampo: ${molino.llampo} sacos\n`;
        mensaje += `   • Tiempo: ${tiempoHoras}h ${tiempoMinutos}min\n`;
        mensaje += `   • Hora fin: ${molino.horaFin || '--:--'}\n`;
      }
    });

    mensaje += `\n*TOTALES:*\n`;
    mensaje += `• Total sacos: ${molienda.totalSacos}\n`;
    mensaje += `• Cuarzo: ${molienda.totalCuarzo} sacos\n`;
    mensaje += `• Llampo: ${molienda.totalLlampo} sacos\n`;
    mensaje += `• Molinos activos: ${molienda.molinos.filter(m => m.activo).length}\n`;

    const tiempoHoras = Math.floor(molienda.tiempoPorMolino / 60);
    const tiempoMinutos = molienda.tiempoPorMolino % 60;
    mensaje += `• Tiempo por molino: ${tiempoHoras}h ${tiempoMinutos}min\n`;

    if (molienda.horaInicio && molienda.horaFin) {
      mensaje += `• Horario: ${molienda.horaInicio} - ${molienda.horaFin}\n`;
    }

    mensaje += `\n*STOCK:*\n`;
    mensaje += `• Stock inicial: ${molienda.stockTotal} sacos\n`;
    mensaje += `• A procesar: ${molienda.totalSacos} sacos\n`;
    mensaje += `• Stock restante: ${molienda.stockRestanteTotal} sacos\n\n`;

    mensaje += `*Observaciones:* ${molienda.observaciones || 'Ninguna'}\n\n`;
    mensaje += `📋 *Vista Previa* - ${new Date().toLocaleString()}\n`;

    const mensajeCodificado = encodeURIComponent(mensaje);
    const whatsappUrl = `https://wa.me/?text=${mensajeCodificado}`;

    window.open(whatsappUrl, '_blank');
  };

  // Generar comprobante imprimible con firmas
  const generarComprobante = () => {
    // Permitir generar comprobante incluso si ya se reseteó? NO, porque los datos se pierden el resetear
    // Si queremos mantener datos para impresión, NO DEBEMOS resetear inmediatamente, o debemos guardar "lastMilling" state.
    // DADO QUE EL USUARIO QUIERE CONCURRENCIA, priorizamos resetear. IMPRIMIR debe ser antes de confirmar en modal?
    // O mostramos datos en modal y botón de imprimir allí?

    // Por simplicidad y requerimiento "un modal por registro y poder hacer otro":
    // El usuario verá modal "Éxito", al cerrar se limpia. Si quería imprimir, debió hacerlo antes?
    // Usualmente se imprime el ticket DESPUÉS.
    // IMPROVEMENT: Agregar botón imprimir en el modal de éxito o no resetear hasta que el usuario decida "Nuevo Proceso".

    // PERO el usuario pidió "poder usar los dos molinos restantes".
    // Voy a mantener el reset en "Aceptar" del modal de éxito.

    // Si validamos procesoIniciado, y reseteamos, ya no estará iniciado.
    // Asumiremos que el comprobante se genera desde historial o se añade logica post-registro.
    // Por ahora, mostraré alerta si intenta imprimir sin datos.
    if (molienda.totalSacos === 0) {
      showAlert('Sin Datos', 'No hay datos de molienda para generar comprobante.', 'warning');
      return;
    }

    setShowImprimirModal(true);
  };

  // Confirmar impresión con firmas
  const confirmarImpresion = () => {
    const contenido = `
============================================
     PLANTA DE PROCESAMIENTO DE MINERALES
============================================
         COMPROBANTE DE MOLIENDA
              EN PROCESO
============================================

           N°: ${molienda.procesoId || 'PENDIENTE'}
           Fecha: ${molienda.fechaInicio || new Date().toLocaleDateString()}
           Estado: ${molienda.estado}

============================================
           INFORMACIÓN DEL CLIENTE
============================================
Cliente: ${molienda.clienteNombre}
Tipo: ${TIPO_CLIENTE.find(t => t.value === molienda.tipoCliente)?.label || '-'}
Mineral: ${MINERAL_TYPES_STOCK.find(m => m.value === molienda.mineral)?.label || '-'}

============================================
            TIEMPO DE PROCESO
============================================
${molienda.mineral === 'OXIDO' ?
        `Óxido: ${molienda.tiempos.oxido.hora40 ? '☑ 1:40' : '☐ 1:40'} | ${molienda.tiempos.oxido.hora00 ? '☑ 1:00' : '☐ 1:00'}` :
        `Sulfuro: ${molienda.tiempos.sulfuro.hora00 ? '☑ 2:00' : '☐ 2:00'} | ${molienda.tiempos.sulfuro.hora30 ? '☑ 2:30' : '☐ 2:30'}`}

Tiempo por molino: ${formatTiempo(molienda.tiempoPorMolino)}

============================================
             HORARIO ESTIMADO
============================================
Hora inicio: ${molienda.horaInicio || '--:--'}
Hora fin: ${molienda.horaFin || '--:--'}
(Todos los molinos terminan a la misma hora)

============================================
              DETALLE POR MOLINO
============================================
${molienda.molinos.filter(m => m.activo).map((molino, index) =>
          `${index + 1}. ${molino.nombre}:\n` +
          `   - Total: ${molino.total} sacos (C:${molino.cuarzo} L:${molino.llampo})\n` +
          `   - Tiempo: ${formatTiempo(molino.tiempoEstimado)}\n` +
          `   - Hora fin: ${molino.horaFin || '--:--'}\n`
        ).join('\n')}

============================================
              RESUMEN GENERAL
============================================
Total sacos a procesar: ${molienda.totalSacos}
- Cuarzo: ${molienda.totalCuarzo} sacos
- Llampo: ${molienda.totalLlampo} sacos

Molinos activos: ${molienda.molinos.filter(m => m.activo).length}
Tiempo por molino: ${formatTiempo(molienda.tiempoPorMolino)}

============================================
              CONTROL DE STOCK
============================================
STOCK INICIAL: ${molienda.stockTotal} sacos
A PROCESAR: ${molienda.totalSacos} sacos
STOCK RESTANTE: ${molienda.stockRestanteTotal} sacos

============================================
             OBSERVACIONES
============================================
${molienda.observaciones || 'Ninguna observación registrada.'}

============================================
                  FIRMAS
============================================

OPERADOR:                          CLIENTE:
_______________________           _______________________
${firmaOperador || '___________________'}           ${firmaCliente || '___________________'}

Nombre: ${user?.email}            Nombre: ${molienda.clienteNombre}

============================================
     Fecha de emisión: ${new Date().toLocaleDateString()}
     Hora de emisión: ${new Date().toLocaleTimeString()}
============================================
NOTA: Este documento certifica el inicio del
proceso de molienda. Todos los molinos activos
terminan a la misma hora.
============================================
    `;

    // Crear ventana para imprimir
    const ventanaImpresion = window.open('', '_blank');
    if (ventanaImpresion) {
      ventanaImpresion.document.write(`
        <html>
          <head>
            <title>Comprobante de Molienda ${molienda.procesoId}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Courier+New&display=swap');
              body { 
                font-family: 'Courier New', monospace; 
                margin: 0; 
                padding: 20px;
                font-size: 12px;
                line-height: 1.4;
                text-align: center;
              }
              .comprobante { 
                max-width: 800px; 
                margin: 0 auto;
                border: 1px solid #000;
                padding: 20px;
              }
              .header { 
                text-align: center; 
                margin-bottom: 20px;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
              }
              .section { 
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #ccc;
                text-align: left;
              }
              .section-title {
                font-weight: bold;
                text-align: center;
                padding: 5px;
                margin-bottom: 8px;
                background: #f0f0f0;
              }
              .center-title {
                text-align: center;
                font-weight: bold;
                margin: 10px 0;
              }
              .firmas {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #000;
              }
              .firma {
                width: 45%;
                text-align: center;
              }
              .firma-line {
                border-top: 1px solid #000;
                margin-top: 60px;
                padding-top: 5px;
              }
              .nota {
                font-size: 10px;
                text-align: center;
                margin-top: 20px;
                color: #666;
              }
              .molino-detalle {
                font-size: 11px;
                margin-left: 20px;
              }
              @media print {
                body { margin: 0; padding: 0; }
                button { display: none; }
                .comprobante { border: none; }
              }
            </style>
          </head>
          <body>
            <div class="comprobante">
              <div class="header">
                <h2>PLANTA DE PROCESAMIENTO DE MINERALES</h2>
                <h3>COMPROBANTE DE MOLIENDA</h3>
                <h4>EN PROCESO</h4>
              </div>
              
              <div class="center-title">
                <p>N°: ${molienda.procesoId}</p>
                <p>Fecha: ${molienda.fechaInicio}</p>
                <p>Estado: ${molienda.estado}</p>
              </div>
              
              <div class="section">
                <div class="section-title">INFORMACIÓN DEL CLIENTE</div>
                <p style="text-align: center;"><strong>Cliente:</strong> ${molienda.clienteNombre}</p>
                <p style="text-align: center;"><strong>Tipo:</strong> ${TIPO_CLIENTE.find(t => t.value === molienda.tipoCliente)?.label}</p>
                <p style="text-align: center;"><strong>Mineral:</strong> ${MINERAL_TYPES_STOCK.find(m => m.value === molienda.mineral)?.label}</p>
              </div>
              
              <div class="section">
                <div class="section-title">TIEMPO DE PROCESO</div>
                <p style="text-align: center;">
                  ${molienda.mineral === 'OXIDO' ?
          `Óxido: ${molienda.tiempos.oxido.hora40 ? '☑ 1:40' : '☐ 1:40'} | ${molienda.tiempos.oxido.hora00 ? '☑ 1:00' : '☐ 1:00'}` :
          `Sulfuro: ${molienda.tiempos.sulfuro.hora00 ? '☑ 2:00' : '☐ 2:00'} | ${molienda.tiempos.sulfuro.hora30 ? '☑ 2:30' : '☐ 2:30'}`}
                </p>
                <p style="text-align: center;"><strong>Tiempo por molino:</strong> ${formatTiempo(molienda.tiempoPorMolino)}</p>
              </div>
              
              <div class="section">
                <div class="section-title">HORARIO ESTIMADO</div>
                <p style="text-align: center;"><strong>Hora inicio:</strong> ${molienda.horaInicio}</p>
                <p style="text-align: center;"><strong>Hora fin:</strong> ${molienda.horaFin}</p>
                <p style="text-align: center; font-size: 10px; color: #666;">
                  (Todos los molinos terminan a la misma hora)
                </p>
              </div>
              
              <div class="section">
                <div class="section-title">DETALLE POR MOLINO</div>
                <div class="molino-detalle">
                  ${molienda.molinos.filter(m => m.activo).map((molino, index) =>
            `<p>${index + 1}. ${molino.nombre}:</p>
                     <p style="margin-left: 20px;">- Total: ${molino.total} sacos (C:${molino.cuarzo} L:${molino.llampo})</p>
                     <p style="margin-left: 20px;">- Tiempo: ${formatTiempo(molino.tiempoEstimado)}</p>
                     <p style="margin-left: 20px;">- Hora fin: ${molino.horaFin || '--:--'}</p>`
          ).join('')}
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">RESUMEN GENERAL</div>
                <p style="text-align: center;"><strong>Total sacos:</strong> ${molienda.totalSacos}</p>
                <p style="text-align: center;">- Cuarzo: ${molienda.totalCuarzo} sacos</p>
                <p style="text-align: center;">- Llampo: ${molienda.totalLlampo} sacos</p>
                <p style="text-align: center;"><strong>Molinos activos:</strong> ${molienda.molinos.filter(m => m.activo).length}</p>
                <p style="text-align: center;"><strong>Tiempo por molino:</strong> ${formatTiempo(molienda.tiempoPorMolino)}</p>
              </div>
              
              <div class="section">
                <div class="section-title">CONTROL DE STOCK</div>
                <p style="text-align: center;"><strong>Stock inicial:</strong> ${molienda.stockTotal} sacos</p>
                <p style="text-align: center;"><strong>A procesar:</strong> ${molienda.totalSacos} sacos</p>
                <p style="text-align: center;"><strong>Stock restante:</strong> ${molienda.stockRestanteTotal} sacos</p>
              </div>
              
              <div class="section">
                <div class="section-title">OBSERVACIONES</div>
                <p style="text-align: center;">${molienda.observaciones || 'Ninguna observación registrada.'}</p>
              </div>
              
              <div class="firmas">
                <div class="firma">
                  <p><strong>OPERADOR</strong></p>
                  <div class="firma-line"></div>
                  <p>${firmaOperador || ''}</p>
                  <p><small>Nombre: ${user?.email}</small></p>
                </div>
                
                <div class="firma">
                  <p><strong>CLIENTE</strong></p>
                  <div class="firma-line"></div>
                  <p>${firmaCliente || ''}</p>
                  <p><small>Nombre: ${molienda.clienteNombre}</small></p>
                </div>
              </div>
              
              <div class="nota">
                <p>Fecha de emisión: ${new Date().toLocaleDateString()}</p>
                <p>Hora de emisión: ${new Date().toLocaleTimeString()}</p>
                <p><em>Este documento certifica el inicio del proceso de molienda. Todos los molinos activos terminan a la misma hora.</em></p>
              </div>
            </div>
          </body>
        </html>
      `);
      ventanaImpresion.document.close();
      ventanaImpresion.print();
    }

    setShowImprimirModal(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva Molienda</h1>
          <p className="text-slate-500 mt-1">Registro de proceso de molienda</p>
        </div>

        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={generarComprobante}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer size={18} strokeWidth={1.5} className="mr-2" />
            Imprimir Comprobante
          </button>
          <button
            onClick={generarReporteWhatsApp}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm"
          >
            <MessageSquare size={18} strokeWidth={1.5} className="mr-2" />
            Enviar WhatsApp
          </button>
        </div>
      </div>

      {/* Sección 1: Selección de Cliente */}
      {/* Sección 1: Información del Cliente (Refactored) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
          <User size={20} strokeWidth={1.5} className="mr-2 text-indigo-600" />
          Información del Cliente
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {/* Col 1: Cliente (5 cols) */}
          <div className="lg:col-span-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">Cliente</label>
            <select
              value={molienda.clienteId}
              onChange={(e) => handleClienteChange(e.target.value)}
              className="input-field"
              disabled={molienda.procesoIniciado}
            >
              <option value="">Seleccione Cliente ({clients.length} disponibles)</option>
              {clients.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.name}
                </option>
              ))}
            </select>
          </div>

          {/* Col 2: Fecha (3 cols) */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">Fecha</label>
            <input
              type="date"
              value={molienda.fechaInicio || new Date().toISOString().slice(0, 10)}
              onChange={(e) => setMolienda({ ...molienda, fechaInicio: e.target.value })}
              className="input-field"
              disabled={molienda.procesoIniciado}
            />
          </div>

          {/* Col 3: Stock (4 cols) */}
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Stock Disponible</label>
            {molienda.clienteId ? (
              <div className="flex space-x-3">
                <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold text-indigo-700 uppercase">Cuarzo</span>
                  <span className="text-lg font-bold text-indigo-900">{molienda.stockCuarzo}</span>
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold text-slate-600 uppercase">Llampo</span>
                  <span className="text-lg font-bold text-slate-800">{molienda.stockLlampo}</span>
                </div>
              </div>
            ) : (
              <div className="h-[52px] border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-sm">
                Seleccione un cliente
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección 2: Tiempos */}
      {/* Sección 2: Configuración (Mineral y Tiempos) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
          <Clock size={20} strokeWidth={1.5} className="mr-2 text-indigo-600" />
          Configuración de Proceso
        </h2>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Mineral</label>
            <div className="grid grid-cols-2 gap-3">
              {MINERAL_TYPES_STOCK.map(type => (
                <button
                  key={type.value}
                  onClick={() => setMolienda({ ...molienda, mineral: type.value as any })}
                  disabled={molienda.procesoIniciado}
                  className={`
                      py-2 px-3 rounded-lg border text-sm font-bold transition-all
                      ${molienda.mineral === type.value
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }
                    `}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {molienda.mineral && (
            <div className="w-full md:w-2/3 animate-fadeIn">
              <label className="block text-sm font-medium text-slate-700 mb-2">Tiempo de Molienda</label>
              <div className="flex flex-wrap gap-4">
                {molienda.mineral === 'OXIDO' ? (
                  <>
                    <label className="flex items-center space-x-3 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                      <input type="checkbox" checked={molienda.tiempos.oxido.hora40} onChange={(e) => handleTiempoChange('OXIDO', 'hora40', e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm font-medium text-slate-700">1h 40m <span className="text-xs text-slate-400 ml-1">(Estándar)</span></span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                      <input type="checkbox" checked={molienda.tiempos.oxido.hora00} onChange={(e) => handleTiempoChange('OXIDO', 'hora00', e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm font-medium text-slate-700">1h 00m <span className="text-xs text-slate-400 ml-1">(Reducido)</span></span>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="flex items-center space-x-3 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                      <input type="checkbox" checked={molienda.tiempos.sulfuro.hora00} onChange={(e) => handleTiempoChange('SULFURO', 'hora00', e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm font-medium text-slate-700">2h 00m <span className="text-xs text-slate-400 ml-1">(Reducido)</span></span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                      <input type="checkbox" checked={molienda.tiempos.sulfuro.hora30} onChange={(e) => handleTiempoChange('SULFURO', 'hora30', e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm font-medium text-slate-700">2h 30m <span className="text-xs text-slate-400 ml-1">(Estándar)</span></span>
                    </label>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sección 3: Distribución en Molinos */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center">
            <Factory size={20} strokeWidth={1.5} className="mr-2 text-indigo-600" />
            Distribución en Molinos
          </h2>
          <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-medium">
            Total: <span className="text-indigo-700 font-bold">{molienda.totalSacos}</span> sacos
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {molienda.molinos.map((molino) => (
            <div
              key={molino.id}
              className={`
                border rounded-xl p-4 transition-all duration-200 relative
                ${!molino.disponible
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : molino.activo
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-indigo-300'
                }
              `}
            >
              {/* Header Molino */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={molino.activo}
                    onChange={(e) => handleMolinoChange(molino.id, 'activo', e.target.checked)}
                    disabled={!molino.disponible || molienda.procesoIniciado}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 mr-2 cursor-pointer"
                  />
                  <span className={`font-bold ${molino.activo ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {molino.nombre}
                  </span>
                </div>
                {/* Status Badges */}
                {!molino.disponible ? (
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Ocupado</span>
                ) : (
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Libre</span>
                )}
              </div>

              {/* Inputs */}
              <div className={`space-y-3 ${molino.activo ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500 w-14">Cuarzo</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={molino.cuarzo || ''}
                    onChange={(e) => handleMolinoChange(molino.id, 'cuarzo', parseInt(e.target.value) || 0)}
                    className="flex-1 text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500 w-14">Llampo</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={molino.llampo || ''}
                    onChange={(e) => handleMolinoChange(molino.id, 'llampo', parseInt(e.target.value) || 0)}
                    className="flex-1 text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total:</span>
                  <span className="font-bold text-slate-900">{molino.total} sacos</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen de Selección */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-100 flex items-center">
            <span className="text-sm text-indigo-700 font-medium">Total a procesar: </span>
            <span className="text-lg font-bold text-indigo-900 ml-2">{molienda.totalSacos} sacos</span>
          </div>
          <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex items-center">
            <span className="text-sm text-slate-600 font-medium">Stock restante: </span>
            <span className={`text-lg font-bold ml-2 ${molienda.stockRestanteTotal < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {molienda.stockRestanteTotal} sacos
            </span>
          </div>
        </div>
      </div>

      {/* Sección 4: Resumen de Procesamiento */}
      {molienda.tiempoPorMolino > 0 && molienda.molinos.some(m => m.activo) && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
            <TrendingUp size={20} strokeWidth={1.5} className="mr-2 text-indigo-600" />
            Estimación de Proceso
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
              <Clock size={24} strokeWidth={1.5} className="text-slate-400 mr-3" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tiempo p/ Molino</p>
                <p className="text-xl font-bold text-slate-900">{formatTiempo(molienda.tiempoPorMolino)}</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
              <Clock size={24} strokeWidth={1.5} className="text-indigo-500 mr-3" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hora Inicio</p>
                <p className="text-xl font-bold text-indigo-600">
                  {molienda.horaInicio || new Date().toLocaleTimeString().slice(0, 5)}
                </p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
              <CheckCircle size={24} strokeWidth={1.5} className="text-emerald-500 mr-3" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hora Fin Estimada</p>
                <p className="text-xl font-bold text-emerald-600">
                  {molienda.horaFin ||
                    (molienda.tiempoPorMolino > 0
                      ? calcularHoraFin(new Date().toLocaleTimeString().slice(0, 5), molienda.tiempoPorMolino)
                      : '--:--')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 text-blue-800 text-sm rounded-lg flex items-center">
            <AlertCircle size={16} strokeWidth={1.5} className="mr-2 flex-shrink-0" />
            <span>
              Nota: Todos los molinos activos iniciarán y terminarán simultáneamente.
            </span>
          </div>
        </div>
      )}

      {/* Sección 5: Observaciones */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
          <FileText size={20} strokeWidth={1.5} className="mr-2 text-indigo-600" />
          Observaciones
        </h2>

        <div>
          <textarea
            value={molienda.observaciones}
            onChange={(e) => setMolienda({ ...molienda, observaciones: e.target.value })}
            className="input-field min-h-[100px]"
            placeholder="Observaciones adicionales sobre la molienda..."
            disabled={molienda.procesoIniciado}
          />
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
        <button
          onClick={registrarMolienda}
          disabled={!molienda.clienteId || molienda.totalSacos === 0 || molienda.procesoIniciado}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold shadow-md hover:shadow-lg transition-all transform active:scale-[0.98]"
        >
          <Save size={20} strokeWidth={1.5} className="mr-2" />
          {molienda.procesoIniciado ? 'Proceso Iniciado' : 'Registrar Molienda'}
        </button>
      </div>

      {/* Modal para imprimir con firmas */}
      {showImprimirModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white border border-slate-200 w-full max-w-2xl shadow-xl rounded-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                Completar Firmas para Imprimir
              </h2>
              <button
                onClick={() => setShowImprimirModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start">
                <AlertCircle size={20} className="text-indigo-600 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-indigo-700">
                  Complete las firmas para generar el comprobante impreso.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Firma del Operador *
                  </label>
                  <div className="border border-slate-300 rounded-xl p-4 min-h-[100px] bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                    <input
                      type="text"
                      value={firmaOperador}
                      onChange={(e) => setFirmaOperador(e.target.value)}
                      className="w-full h-full border-none bg-transparent focus:outline-none text-lg text-slate-900 placeholder:text-slate-400 font-handwriting"
                      placeholder="Nombre del operador"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Operador: {user?.email}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Firma del Cliente *
                  </label>
                  <div className="border border-slate-300 rounded-xl p-4 min-h-[100px] bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                    <input
                      type="text"
                      value={firmaCliente}
                      onChange={(e) => setFirmaCliente(e.target.value)}
                      className="w-full h-full border-none bg-transparent focus:outline-none text-lg text-slate-900 placeholder:text-slate-400"
                      placeholder="Nombre del cliente"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Cliente: {molienda.clienteNombre}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowImprimirModal(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarImpresion}
                  disabled={!firmaOperador || !firmaCliente}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center disabled:opacity-50 font-medium shadow-sm transition-colors"
                >
                  <Printer size={18} strokeWidth={1.5} className="mr-2" />
                  Generar e Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL PARA MENSAJES */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        showCancel={modalConfig.showCancel}
        type={modalConfig.type}
        icon={modalConfig.icon as any}
      />

      {/* Sección Resumen de Procesos Activos (NUEVA) */}
      <div className="mt-8 bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-lg font-bold mb-4 flex items-center">
          <Factory size={20} strokeWidth={1.5} className="mr-2 text-indigo-400" />
          Procesos en Curso
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {molienda.molinos.filter(m => !m.disponible).length === 0 ? (
            <p className="text-slate-400 italic">No hay molinos ocupados.</p>
          ) : (
            molienda.molinos.filter(m => !m.disponible).map(m => (
              <div key={m.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <p className="font-bold text-lg mb-1">{m.nombre}</p>
                <div className="text-sm text-slate-300">
                  <p className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="text-white font-medium">{m.current_client || 'Desconocido'}</span>
                  </p>
                  <p className="flex justify-between mt-1">
                    <span>Carga:</span>
                    <span className="text-white font-medium">{m.current_sacks ? `${m.current_sacks} sacos` : '-'}</span>
                  </p>
                  <p className="flex justify-between mt-1">
                    <span>Estado:</span>
                    <span className="text-amber-300 font-bold text-xs uppercase bg-amber-900/40 border border-amber-900/50 px-2 py-0.5 rounded-full">EN PROCESO</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistroMolienda;