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
  MOCK_CLIENTES,
  MOLINOS_DISPONIBLES,
  MOLINO_STATUS
} from '../constants';
import { useAuthStore } from '../store/authStore';

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
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [firmaOperador, setFirmaOperador] = useState('');
  const [firmaCliente, setFirmaCliente] = useState('');

  // Estado principal de la molienda
  const [molienda, setMolienda] = useState<MoliendaData>({
    clienteId: '',
    clienteNombre: '',
    tipoCliente: '' as any,
    mineral: '' as any,
    tiempos: {
      oxido: { hora40: true, hora00: false }, // Default: 1:40 checked
      sulfuro: { hora00: false, hora30: true } // Default: 2:30 checked
    },
    fechaInicio: null,
    horaInicio: null,
    horaFin: null,
    stockTotal: 0,
    stockCuarzo: 0,
    stockLlampo: 0,
    molinos: MOLINOS_DISPONIBLES.map(molino => ({
      id: molino.id,
      nombre: molino.nombre,
      activo: false,
      cuarzo: 0,
      llampo: 0,
      total: 0,
      capacidadMaxima: molino.capacidadMaxima,
      disponible: molino.estado === 'LIBRE',
      estado: molino.estado,
      tiempoEstimado: 0,
      horaFin: null
    })),
    observaciones: '',
    totalSacos: 0,
    totalCuarzo: 0,
    totalLlampo: 0,
    stockRestanteTotal: 0,
    stockRestanteCuarzo: 0,
    stockRestanteLlampo: 0,
    tiempoPorMolino: 0, // Solo tiempo por molino individual
    procesoIniciado: false,
    procesoId: null,
    estado: 'PROCESANDO'
  });

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
    const cliente = MOCK_CLIENTES.find(c => c.id === clienteId);
    if (cliente) {
      const stockCuarzo = Math.floor(cliente.stock * 0.6);
      const stockLlampo = Math.floor(cliente.stock * 0.4);
      
      setMolienda(prev => ({
        ...prev,
        clienteId: cliente.id,
        clienteNombre: cliente.nombre,
        tipoCliente: cliente.tipo as 'MINERO' | 'PALLAQUERO',
        stockTotal: cliente.stock,
        stockCuarzo,
        stockLlampo,
        stockRestanteTotal: cliente.stock,
        stockRestanteCuarzo: stockCuarzo,
        stockRestanteLlampo: stockLlampo
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
      alert('Debe seleccionar un cliente');
      return false;
    }
    
    if (!molienda.mineral) {
      alert('Debe seleccionar el tipo de mineral');
      return false;
    }
    
    // Validar que al menos un tiempo esté seleccionado
    if (molienda.mineral === 'OXIDO') {
      if (!molienda.tiempos.oxido.hora40 && !molienda.tiempos.oxido.hora00) {
        alert('Debe seleccionar al menos un tiempo para Óxido');
        return false;
      }
    } else if (molienda.mineral === 'SULFURO') {
      if (!molienda.tiempos.sulfuro.hora00 && !molienda.tiempos.sulfuro.hora30) {
        alert('Debe seleccionar al menos un tiempo para Sulfuro');
        return false;
      }
    }
    
    const molinosActivos = molienda.molinos.filter(m => m.activo);
    if (molinosActivos.length === 0) {
      alert('Debe seleccionar al menos un molino');
      return false;
    }
    
    const molinosConSacos = molinosActivos.filter(m => m.total > 0);
    if (molinosConSacos.length === 0) {
      alert('Debe ingresar sacos en los molinos seleccionados');
      return false;
    }
    
    if (molienda.stockRestanteTotal < 0) {
      alert('No hay suficiente stock total para procesar esta molienda');
      return false;
    }
    
    if (molienda.stockRestanteCuarzo < 0) {
      alert('No hay suficiente stock de Cuarzo');
      return false;
    }
    
    if (molienda.stockRestanteLlampo < 0) {
      alert('No hay suficiente stock de Llampo');
      return false;
    }
    
    const molinosNoDisponibles = molinosActivos
      .filter(m => !m.disponible)
      .map(m => m.nombre);
    
    if (molinosNoDisponibles.length > 0) {
      alert(`Los siguientes molinos no están disponibles: ${molinosNoDisponibles.join(', ')}`);
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
  const registrarMolienda = () => {
    if (!validarRegistro()) return;
    
    const ahora = new Date();
    const procesoId = generarProcesoId();
    const horaInicio = ahora.toTimeString().slice(0, 5);
    const tiempoPorMolino = getTiempoSeleccionado();
    
    // Calcular hora fin para TODOS los molinos (misma hora)
    const horaFinGlobal = calcularHoraFin(horaInicio, tiempoPorMolino);
    
    // Actualizar molinos activos
    const nuevosMolinos = molienda.molinos.map(molino => {
      if (molino.activo) {
        return {
          ...molino,
          estado: 'OCUPADO' as keyof typeof MOLINO_STATUS,
          disponible: false,
          horaFin: horaFinGlobal,
          tiempoEstimado: tiempoPorMolino
        };
      }
      return molino;
    });
    
    // Iniciar proceso
    setMolienda(prev => ({
      ...prev,
      procesoIniciado: true,
      procesoId,
      fechaInicio: ahora.toISOString().slice(0, 10),
      horaInicio,
      horaFin: horaFinGlobal,
      molinos: nuevosMolinos,
      tiempoPorMolino,
      estado: 'PROCESANDO'
    }));
    
    console.log('Proceso iniciado - Opción A:', {
      id: procesoId,
      cliente: molienda.clienteNombre,
      horaInicio,
      horaFin: horaFinGlobal,
      tiempoPorMolino: formatTiempo(tiempoPorMolino),
      molinosActivos: nuevosMolinos.filter(m => m.activo).map(m => m.nombre),
      // DEMOSTRACIÓN DEL CÁLCULO:
      calculo: {
        horaInicio,
        minutosAgregados: tiempoPorMolino,
        horaFinCalculada: horaFinGlobal
      }
    });
    
    alert('¡Molienda iniciada exitosamente!\n\n' +
          `Hora inicio: ${horaInicio}\n` +
          `Hora fin: ${horaFinGlobal}\n` +
          `Tiempo por molino: ${formatTiempo(tiempoPorMolino)}\n` +
          `Molinos activos: ${nuevosMolinos.filter(m => m.activo).length}`);
  };

  // Generar reporte para WhatsApp
  const generarReporteWhatsApp = () => {
    if (!molienda.clienteId || molienda.totalSacos === 0) {
      alert('Complete los datos de la molienda primero');
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
    if (!molienda.procesoIniciado) {
      alert('Debe iniciar la molienda primero');
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

           N°: ${molienda.procesoId}
           Fecha: ${molienda.fechaInicio}
           Estado: ${molienda.estado}

============================================
           INFORMACIÓN DEL CLIENTE
============================================
Cliente: ${molienda.clienteNombre}
Tipo: ${TIPO_CLIENTE.find(t => t.value === molienda.tipoCliente)?.label}
Mineral: ${MINERAL_TYPES_STOCK.find(m => m.value === molienda.mineral)?.label}

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
Hora inicio: ${molienda.horaInicio}
Hora fin: ${molienda.horaFin}
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

Molinos activos: ${molienda.molinos.filter(m => m.activo).length} de 4
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
                <p style="text-align: center;"><strong>Molinos activos:</strong> ${molienda.molinos.filter(m => m.activo).length} de 4</p>
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
              
              <div style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                  🖨️ Imprimir
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                  ✕ Cerrar
                </button>
              </div>
            </div>
          </body>
        </html>
      `);
      ventanaImpresion.document.close();
    }
    
    setShowImprimirModal(false);
    setFirmaOperador('');
    setFirmaCliente('');
  };

  // Formatear minutos a horas:minutos
  const formatTiempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}min`;
  };

  // Obtener texto de tiempos seleccionados
  const getTiemposTexto = () => {
    if (molienda.mineral === 'OXIDO') {
      const tiempos = [];
      if (molienda.tiempos.oxido.hora40) tiempos.push('1:40');
      if (molienda.tiempos.oxido.hora00) tiempos.push('1:00');
      return tiempos.join(' | ');
    } else if (molienda.mineral === 'SULFURO') {
      const tiempos = [];
      if (molienda.tiempos.sulfuro.hora00) tiempos.push('2:00');
      if (molienda.tiempos.sulfuro.hora30) tiempos.push('2:30');
      return tiempos.join(' | ');
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header con icono */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-lg mr-4">
            <Factory className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nueva Molienda</h1>
            <p className="text-gray-600 mt-1">Registro de proceso de molienda</p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={generarReporteWhatsApp}
            disabled={!molienda.clienteId || molienda.totalSacos === 0}
            className="btn-secondary flex items-center disabled:opacity-50"
          >
            <MessageSquare size={18} className="mr-2" />
            Vista Previa WhatsApp
          </button>
          <button 
            onClick={generarComprobante}
            disabled={!molienda.procesoIniciado}
            className="btn-primary flex items-center disabled:opacity-50"
          >
            <Printer size={18} className="mr-2" />
            Imprimir Comprobante
          </button>
        </div>
      </div>

      {/* Alertas de stock */}
      {(molienda.stockRestanteTotal < 0 || molienda.stockRestanteCuarzo < 0 || molienda.stockRestanteLlampo < 0) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center">
            <AlertCircle className="text-red-500 mr-3" size={20} />
            <div>
              <p className="font-medium text-red-800">Stock insuficiente</p>
              {molienda.stockRestanteTotal < 0 && (
                <p className="text-red-700 text-sm">
                  Stock total disponible: {molienda.stockTotal} sacos | 
                  Requerido: {molienda.totalSacos} sacos
                </p>
              )}
              {molienda.stockRestanteCuarzo < 0 && (
                <p className="text-red-700 text-sm">
                  Stock Cuarzo disponible: {molienda.stockCuarzo} sacos | 
                  Requerido: {molienda.totalCuarzo} sacos
                </p>
              )}
              {molienda.stockRestanteLlampo < 0 && (
                <p className="text-red-700 text-sm">
                  Stock Llampo disponible: {molienda.stockLlampo} sacos | 
                  Requerido: {molienda.totalLlampo} sacos
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sección 1: Información del Cliente con icono */}
      <div className="bg-white rounded-2xl p-6 border">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <User size={20} className="mr-2 text-blue-600" />
          Información del Cliente
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente *
            </label>
            <select 
              value={molienda.clienteId}
              onChange={(e) => handleClienteChange(e.target.value)}
              className="input-field"
              required
              disabled={molienda.procesoIniciado}
            >
              <option value="">Seleccionar cliente</option>
              {MOCK_CLIENTES.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre} (Stock: {cliente.stock} sacos)
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mineral a Procesar *
            </label>
            <select 
              value={molienda.mineral}
              onChange={(e) => setMolienda({...molienda, mineral: e.target.value as 'OXIDO' | 'SULFURO'})}
              className="input-field"
              required
              disabled={!molienda.clienteId || molienda.procesoIniciado}
            >
              <option value="">Seleccionar mineral</option>
              {MINERAL_TYPES_STOCK.map(mineral => (
                <option key={mineral.value} value={mineral.value}>
                  {mineral.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y Hora Inicio *
            </label>
            <input
              type="datetime-local"
              value={molienda.fechaInicio ? `${molienda.fechaInicio}T${molienda.horaInicio || '10:00'}` : ''}
              onChange={(e) => {
                const [fecha, hora] = e.target.value.split('T');
                setMolienda({...molienda, fechaInicio: fecha, horaInicio: hora || '10:00'});
              }}
              className="input-field"
              required
              disabled={molienda.procesoIniciado}
            />
          </div>
        </div>
        
        {/* Información de stock del cliente */}
        {molienda.clienteId && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <div className="flex items-center mb-1">
                <Package size={16} className="text-blue-500 mr-2" />
                <p className="text-sm font-medium text-gray-700">Stock Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{molienda.stockTotal}</p>
              <p className="text-xs text-gray-500">sacos disponibles</p>
            </div>
            <div>
              <div className="flex items-center mb-1">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <p className="text-sm font-medium text-gray-700">Cuarzo</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{molienda.stockCuarzo}</p>
              <p className="text-xs text-gray-500">sacos disponibles</p>
            </div>
            <div>
              <div className="flex items-center mb-1">
                <div className="w-4 h-4 bg-amber-500 rounded mr-2"></div>
                <p className="text-sm font-medium text-gray-700">Llampo</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{molienda.stockLlampo}</p>
              <p className="text-xs text-gray-500">sacos disponibles</p>
            </div>
          </div>
        )}
      </div>

      {/* Sección 2: Tiempo de Proceso compacta */}
      <div className="bg-white rounded-2xl p-6 border">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Clock size={20} className="mr-2 text-blue-600" />
          Tiempo de Proceso
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiempos disponibles
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* Óxido */}
              <div className="border border-gray-200 rounded-lg p-3">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">Óxido</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={molienda.tiempos.oxido.hora40}
                      onChange={(e) => handleTiempoChange('OXIDO', 'hora40', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                      disabled={molienda.mineral !== 'OXIDO' || molienda.procesoIniciado}
                    />
                    <span className="ml-2 text-sm text-gray-700">1:40</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={molienda.tiempos.oxido.hora00}
                      onChange={(e) => handleTiempoChange('OXIDO', 'hora00', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                      disabled={molienda.mineral !== 'OXIDO' || molienda.procesoIniciado}
                    />
                    <span className="ml-2 text-sm text-gray-700">1:00</span>
                  </label>
                </div>
              </div>
              
              {/* Sulfuro */}
              <div className="border border-gray-200 rounded-lg p-3">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">Sulfuro</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={molienda.tiempos.sulfuro.hora00}
                      onChange={(e) => handleTiempoChange('SULFURO', 'hora00', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                      disabled={molienda.mineral !== 'SULFURO' || molienda.procesoIniciado}
                    />
                    <span className="ml-2 text-sm text-gray-700">2:00</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={molienda.tiempos.sulfuro.hora30}
                      onChange={(e) => handleTiempoChange('SULFURO', 'hora30', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                      disabled={molienda.mineral !== 'SULFURO' || molienda.procesoIniciado}
                    />
                    <span className="ml-2 text-sm text-gray-700">2:30</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                {molienda.mineral ? 
                  `Tiempo seleccionado para ${molienda.mineral === 'OXIDO' ? 'Óxido' : 'Sulfuro'}: ${getTiemposTexto()}` :
                  'Seleccione un mineral para ver los tiempos disponibles'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {molienda.mineral === 'OXIDO' && molienda.tiempos.oxido.hora40 && molienda.tiempos.oxido.hora00 ? 
                  '(Ambos seleccionados, se usará 1:40)' : ''}
                {molienda.mineral === 'SULFURO' && molienda.tiempos.sulfuro.hora00 && molienda.tiempos.sulfuro.hora30 ? 
                  '(Ambos seleccionados, se usará 2:30)' : ''}
              </p>
            </div>
          </div>
          
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Tiempo por molino</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatTiempo(molienda.tiempoPorMolino)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Horario estimado</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {molienda.horaInicio || '--:--'} - {molienda.horaFin || '--:--'}
                </p>
              </div>
            </div>
            
            {/* Ejemplo de cálculo */}
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Lógica de cálculo:</p>
              <p className="text-xs text-gray-600">
                {molienda.horaInicio && molienda.mineral ? 
                  `Todos los molinos comienzan a las ${molienda.horaInicio} y terminan a las ${molienda.horaFin || '--:--'}\n` +
                  `Tiempo por molino: ${formatTiempo(molienda.tiempoPorMolino)}`
                  :
                  'Complete hora inicio y mineral para ver cálculo'
                }
              </p>
              {molienda.horaInicio && molienda.mineral && molienda.horaFin && (
                <p className="text-xs text-green-600 font-medium mt-2">
                  {molienda.molinos.filter(m => m.activo).length} molino(s) activo(s) - todos terminan a la misma hora
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sección 3: Molinos a Procesar */}
      <div className="bg-white rounded-2xl p-6 border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Factory size={20} className="mr-2 text-blue-600" />
            Molinos a Procesar
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({molienda.molinos.filter(m => m.activo).length} seleccionados)
            </span>
          </h2>
          <div className="text-sm text-gray-500">
            Capacidad máxima por molino: 200 sacos
          </div>
        </div>
        
        {/* Grid de 2x2 para los molinos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {molienda.molinos.map((molino) => (
            <div 
              key={molino.id} 
              className={`border rounded-xl p-4 ${!molino.disponible ? 'bg-gray-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={molino.activo}
                    onChange={(e) => handleMolinoChange(molino.id, 'activo', e.target.checked)}
                    disabled={!molino.disponible || molienda.procesoIniciado}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                  <h3 className="ml-3 font-bold text-gray-900">{molino.nombre}</h3>
                </div>
                
                <div className={`px-3 py-1 text-xs rounded-full ${
                  MOLINO_STATUS[molino.estado].color
                }`}>
                  {MOLINO_STATUS[molino.estado].label}
                </div>
              </div>
              
              {!molino.disponible ? (
                <div className="text-center py-6 text-gray-500">
                  <X size={32} className="mx-auto mb-2" />
                  <p>Molino no disponible</p>
                  <p className="text-sm">Estado: {MOLINO_STATUS[molino.estado].label}</p>
                </div>
              ) : (
                <>
                  {/* Inputs para Cuarzo y Llampo */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cuarzo (sacos)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={molino.capacidadMaxima}
                        value={molino.cuarzo || ''}
                        onChange={(e) => handleMolinoChange(molino.id, 'cuarzo', parseInt(e.target.value) || 0)}
                        className="input-field"
                        placeholder="0"
                        disabled={!molino.activo || molienda.procesoIniciado}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Llampo (sacos)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={molino.capacidadMaxima}
                        value={molino.llampo || ''}
                        onChange={(e) => handleMolinoChange(molino.id, 'llampo', parseInt(e.target.value) || 0)}
                        className="input-field"
                        placeholder="0"
                        disabled={!molino.activo || molienda.procesoIniciado}
                      />
                    </div>
                  </div>
                  
                  {/* Resumen del molino */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="ml-2 font-bold text-gray-900">
                          {molino.total} sacos
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tiempo:</span>
                        <span className="ml-2 font-bold text-gray-900">
                          {formatTiempo(molino.tiempoEstimado)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Cuarzo: {molino.cuarzo} | Llampo: {molino.llampo}
                    </div>
                    {molino.horaFin && (
                      <div className="mt-2 text-xs text-green-600 font-medium">
                        Hora fin estimada: {molino.horaFin}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sección 4: Resumen */}
      <div className="bg-white rounded-2xl p-6 border">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Calculator size={20} className="mr-2 text-blue-600" />
          Resumen de la Molienda
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-50 p-4 rounded-xl">
            <div className="flex items-center mb-2">
              <Factory size={18} className="text-gray-500 mr-2" />
              <p className="text-sm font-medium text-gray-700">Molinos Activos</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {molienda.molinos.filter(m => m.activo).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">de 4 molinos</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-xl">
            <div className="flex items-center mb-2">
              <Package size={18} className="text-gray-500 mr-2" />
              <p className="text-sm font-medium text-gray-700">Total a Procesar</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{molienda.totalSacos}</p>
            <p className="text-xs text-gray-500 mt-1">
              C: {molienda.totalCuarzo} | L: {molienda.totalLlampo}
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-xl">
            <div className="flex items-center mb-2">
              <TrendingUp size={18} className="text-gray-500 mr-2" />
              <p className="text-sm font-medium text-gray-700">Stock Restante</p>
            </div>
            <p className={`text-3xl font-bold ${
              molienda.stockRestanteTotal < 0 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {molienda.stockRestanteTotal}
            </p>
            <p className={`text-xs mt-1 ${
              molienda.stockRestanteTotal < 0 ? 'text-red-500' : 'text-gray-500'
            }`}>
              C: {molienda.stockRestanteCuarzo} | L: {molienda.stockRestanteLlampo}
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-xl">
            <div className="flex items-center mb-2">
              <Clock size={18} className="text-gray-500 mr-2" />
              <p className="text-sm font-medium text-gray-700">Horario</p>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {molienda.horaInicio || '--:--'} - {molienda.horaFin || '--:--'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatTiempo(molienda.tiempoPorMolino)} por molino
            </p>
          </div>
        </div>
        
        {/* Demostración del cálculo */}
        {molienda.horaInicio && molienda.tiempoPorMolino > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm font-medium text-gray-700 mb-2">Demostración del cálculo:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Hora inicio: {molienda.horaInicio}</p>
              <p>• Tiempo por molino: {formatTiempo(molienda.tiempoPorMolino)}</p>
              <p>• Cálculo: {molienda.horaInicio} + {formatTiempo(molienda.tiempoPorMolino)}</p>
              <p className="font-medium text-green-600">• Hora fin: {molienda.horaFin || '--:--'}</p>
              <p className="text-blue-600">• Todos los {molienda.molinos.filter(m => m.activo).length} molino(s) activo(s) terminan a esta misma hora</p>
            </div>
          </div>
        )}
        
        {/* Información de proceso iniciado */}
        {molienda.procesoIniciado && (
          <div className="mt-6 p-4 bg-green-50 rounded-xl">
            <div className="flex items-center">
              <CheckCircle size={24} className="text-green-500 mr-3" />
              <div>
                <p className="font-medium text-green-800">¡Proceso iniciado!</p>
                <p className="text-sm text-green-700">
                  N°: {molienda.procesoId} | Hora inicio: {molienda.horaInicio} | Hora fin: {molienda.horaFin}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {molienda.molinos.filter(m => m.activo).length} molino(s) activo(s) procesando {molienda.mineral === 'OXIDO' ? 'Óxido' : 'Sulfuro'} - 
                  Todos terminan a las {molienda.horaFin}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sección 5: Observaciones */}
      <div className="bg-white rounded-2xl p-6 border">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <FileText size={20} className="mr-2 text-blue-600" />
          Observaciones
        </h2>
        
        <div>
          <textarea
            value={molienda.observaciones}
            onChange={(e) => setMolienda({...molienda, observaciones: e.target.value})}
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
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:opacity-50 text-lg font-medium"
        >
          <Save size={20} className="mr-2" />
          {molienda.procesoIniciado ? 'Proceso Iniciado' : 'Registrar Molienda'}
        </button>
      </div>

      {/* Modal para imprimir con firmas */}
      {showImprimirModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-2xl bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Completar Firmas para Imprimir
              </h2>
              <button
                onClick={() => setShowImprimirModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">
                  Complete las firmas para generar el comprobante impreso.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Firma del Operador *
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 min-h-[100px] bg-white">
                    <input
                      type="text"
                      value={firmaOperador}
                      onChange={(e) => setFirmaOperador(e.target.value)}
                      className="w-full h-full border-none focus:outline-none text-lg"
                      placeholder="Nombre del operador"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Operador: {user?.email}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Firma del Cliente *
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 min-h-[100px] bg-white">
                    <input
                      type="text"
                      value={firmaCliente}
                      onChange={(e) => setFirmaCliente(e.target.value)}
                      className="w-full h-full border-none focus:outline-none text-lg"
                      placeholder="Nombre del cliente"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Cliente: ${molienda.clienteNombre}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowImprimirModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarImpresion}
                  disabled={!firmaOperador || !firmaCliente}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
                >
                  <Printer size={18} className="mr-2" />
                  Generar e Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroMolienda;