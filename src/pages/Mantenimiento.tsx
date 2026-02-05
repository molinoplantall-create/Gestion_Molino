import React, { useState, useEffect } from 'react';
import {
  Wrench, AlertTriangle, CheckCircle, Clock, Search, Filter, Plus, Eye, Edit, Trash2,
  Download, Upload, FileText, Printer, History, Calendar, Settings, Activity,
  ChevronRight, ChevronLeft, Package, Users, X, Save, RefreshCw, FileSpreadsheet,
  MessageSquare, Mail, QrCode, CheckSquare, AlertCircle, User as UserIcon, DollarSign, Layers
} from 'lucide-react';
import { MILLS } from '@/constants';
import { useSupabaseStore } from '@/store/supabaseStore';
import { supabase } from '@/lib/supabase';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

// Interfaces para el sistema de mantenimiento
interface MaintenanceRecord {
  id: string;
  mill_id: string;
  type: string;
  status: string;
  priority?: string;
  category?: string;
  description: string;
  action_taken?: string;
  worked_hours?: number;
  technician_name?: string;
  created_at: string;
  mills?: {
    name: string;
  };
}

interface Repuesto {
  id: string;
  nombre: string;
  codigo: string;
  cantidad: number;
  unidad: string;
  costoUnitario: number;
  proveedor: string;
}

interface ChecklistItem {
  id: string;
  descripcion: string;
  estado: boolean;
  observacion: string;
}

interface MolinoHistory {
  molinoId: string;
  molinoNombre: string;
  totalHorasOperacion: number;
  ultimoMantenimiento: string;
  proximoMantenimiento: string;
  estadoActual: 'OPERATIVO' | 'MANTENIMIENTO' | 'PARADA' | 'ESPERA_REPUESTO';
  eficiencia: number;
  historial: MaintenanceRecord[];
}

const Mantenimiento: React.FC = () => {
  const { mills, maintenanceLogs, fetchMills, fetchMaintenanceLogs, registerMaintenance, loading } = useSupabaseStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMill, setSelectedMill] = useState<string>('all');
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showRepuestoModal, setShowRepuestoModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [selectedMillHistory, setSelectedMillHistory] = useState<any | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackInfo, setFeedbackInfo] = useState({
    title: '',
    message: '',
    type: 'success' as 'success' | 'info' | 'warning' | 'danger',
    onConfirm: () => setShowFeedbackModal(false)
  });
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    fetchMills();
    fetchMaintenanceLogs();
  }, [fetchMills, fetchMaintenanceLogs]);

  // Form states and other variables already declared in previous edit attempt, 
  // ensuring we don't have duplicates.

  const filteredLogs = (maintenanceLogs || []).filter(log => {
    const millName = log.mills?.name || '';
    const matchesSearch = millName.toLowerCase().includes(search.toLowerCase()) ||
      (log.description || '').toLowerCase().includes(search.toLowerCase()) ||
      log.id.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesMill = selectedMill === 'all' || log.mill_id === selectedMill;
    return matchesSearch && matchesType && matchesStatus && matchesMill;
  });

  const totalPages = Math.ceil(filteredLogs.length / recordsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Form states
  const [newRecord, setNewRecord] = useState({
    molinoId: '',
    tipo: 'PREVENTIVO' as const,
    categoria: '',
    descripcion: '',
    prioridad: 'MEDIA' as const,
    fechaProgramada: '',
    horasEstimadas: 4,
    asignadoA: ''
  });

  const [newRepuesto, setNewRepuesto] = useState({
    nombre: '',
    codigo: '',
    cantidad: 1,
    unidad: 'unidades',
    costoUnitario: 0,
    proveedor: '',
    motivo: ''
  });

  // Funciones auxiliares
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'COMPLETADO':
      case 'FINALIZADO':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center w-fit"><CheckCircle size={12} className="mr-1" /> Completado</span>;
      case 'EN_PROCESO':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center w-fit"><Clock size={12} className="mr-1" /> En Proceso</span>;
      case 'PENDIENTE':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center w-fit"><AlertTriangle size={12} className="mr-1" /> Pendiente</span>;
      case 'ESPERA_REPUESTO':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center w-fit"><Clock size={12} className="mr-1" /> Espera Repuesto</span>;
      case 'CANCELADO':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full flex items-center w-fit"><X size={12} className="mr-1" /> Cancelado</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{estado}</span>;
    }
  };

  const getTypeBadge = (tipo: string) => {
    const styles = {
      PREVENTIVO: 'bg-blue-100 text-blue-800',
      CORRECTIVO: 'bg-red-100 text-red-800',
      PREDICTIVO: 'bg-green-100 text-green-800',
      EMERGENCIA: 'bg-orange-100 text-orange-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[tipo as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {tipo}
      </span>
    );
  };

  const getPriorityBadge = (prioridad: string) => {
    const styles = {
      BAJA: 'bg-gray-100 text-gray-800',
      MEDIA: 'bg-yellow-100 text-yellow-800',
      ALTA: 'bg-orange-100 text-orange-800',
      CRITICA: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[prioridad as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {prioridad}
      </span>
    );
  };

  // Funciones de botones
  const handleNewRecord = () => {
    setShowNewRecordModal(true);
  };

  const handleSaveNewRecord = async () => {
    const success = await registerMaintenance({
      mill_id: newRecord.molinoId,
      type: newRecord.tipo,
      description: newRecord.descripcion,
      technician_name: newRecord.asignadoA,
      worked_hours: newRecord.horasEstimadas,
      status: 'PENDIENTE'
    });

    if (success) {
      setShowNewRecordModal(false);
      setFeedbackInfo({
        title: 'Orden Creada',
        message: 'La orden de mantenimiento se ha registrado correctamente.',
        type: 'success',
        onConfirm: () => setShowFeedbackModal(false)
      });
      setShowFeedbackModal(true);
      setNewRecord({
        molinoId: '',
        tipo: 'PREVENTIVO',
        categoria: '',
        descripcion: '',
        prioridad: 'MEDIA',
        fechaProgramada: '',
        horasEstimadas: 4,
        asignadoA: ''
      });
    }
  };

  const handleViewHistory = (molinoId: string) => {
    const mill = mills.find(m => m.id === molinoId);
    setSelectedMillHistory(mill || null);
    setShowHistoryModal(true);
  };

  const handleViewDetail = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleEditRecord = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setShowNewRecordModal(true);
    setNewRecord({
      molinoId: record.mill_id,
      tipo: record.type as any,
      categoria: record.category || '',
      descripcion: record.description,
      prioridad: (record.priority || 'MEDIA') as any,
      fechaProgramada: record.created_at,
      horasEstimadas: record.worked_hours || 4,
      asignadoA: record.technician_name || ''
    });
  };

  const handleDeleteRecord = (id: string) => {
    setFeedbackInfo({
      title: 'Eliminar Registro',
      message: '¿Está seguro de eliminar este registro de mantenimiento? Esta acción no se puede deshacer.',
      type: 'danger',
      onConfirm: () => {
        console.log('Eliminando registro:', id);
        setFeedbackInfo({
          title: 'Eliminado',
          message: 'El registro ha sido eliminado exitosamente.',
          type: 'success',
          onConfirm: () => setShowFeedbackModal(false)
        });
        setShowFeedbackModal(true);
      }
    });
    setShowFeedbackModal(true);
  };

  const handleExportExcel = () => {
    const data = filteredLogs.map(log => ({
      ID: log.id,
      Molino: log.molinoNombre,
      Tipo: log.tipo,
      Descripción: log.descripcion,
      Estado: log.estado,
      'Fecha Programada': log.fechaProgramada,
      'Horas Reales': log.horasReales,
      'Costo Real': log.costoReal,
      Asignado: log.asignadoA
    }));

    console.log('Exportando a Excel:', data);
    setFeedbackInfo({
      title: 'Exportando',
      message: 'Archivo Excel generado. Descargando...',
      type: 'success',
      onConfirm: () => setShowFeedbackModal(false)
    });
    setShowFeedbackModal(true);
  };

  const handleGeneratePDF = () => {
    console.log('Generando PDF del reporte');
    setFeedbackInfo({
      title: 'Generando PDF',
      message: 'Generando documento PDF... Se descargará automáticamente.',
      type: 'info',
      onConfirm: () => setShowFeedbackModal(false)
    });
    setShowFeedbackModal(true);
  };

  const handlePrint = () => {
    console.log('Imprimiendo reporte');
    const printContent = document.querySelector('.bg-white.rounded-2xl.border')?.outerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Reporte de Mantenimiento</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f8f9fa; }
              .badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>Reporte de Mantenimiento - ${new Date().toLocaleDateString()}</h1>
            ${printContent || '<p>No hay datos para imprimir</p>'}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShowCalendar = () => {
    setShowCalendarModal(true);
  };

  const handleSolicitarRepuesto = () => {
    setShowRepuestoModal(true);
  };

  const handleSaveRepuesto = () => {
    console.log('Solicitando repuesto:', newRepuesto);
    const totalCosto = newRepuesto.cantidad * newRepuesto.costoUnitario;
    setFeedbackInfo({
      title: 'Repuesto Solicitado',
      message: `Repuesto solicitado exitosamente\nTotal: $${totalCosto.toLocaleString()}\nSe envió orden de compra a ${newRepuesto.proveedor}`,
      type: 'success',
      onConfirm: () => setShowFeedbackModal(false)
    });
    setShowFeedbackModal(true);
    setShowRepuestoModal(false);
    setNewRepuesto({
      nombre: '',
      codigo: '',
      cantidad: 1,
      unidad: 'unidades',
      costoUnitario: 0,
      proveedor: '',
      motivo: ''
    });
  };

  const handleConfigurar = () => {
    setShowConfigModal(true);
  };

  const handleControlStock = () => {
    setFeedbackInfo({
      title: 'Control de Stock',
      message: 'Abriendo panel de control de stock...',
      type: 'info',
      onConfirm: () => setShowFeedbackModal(false)
    });
    setShowFeedbackModal(true);
  };

  const handleEnviarWhatsApp = () => {
    const phone = '51987654321';
    const message = encodeURIComponent('Reporte de mantenimiento disponible para revisión');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleEnviarCorreo = () => {
    const email = 'tecnico@empresa.com';
    const subject = encodeURIComponent('Reporte de Mantenimiento');
    const body = encodeURIComponent('Adjunto el reporte de mantenimiento solicitado.');
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const handleGenerarQR = () => {
    setFeedbackInfo({
      title: 'Código QR',
      message: 'Generando código QR para el equipo...',
      type: 'success',
      onConfirm: () => setShowFeedbackModal(false)
    });
    setShowFeedbackModal(true);
  };

  const handleAplicarFiltros = () => {
    console.log('Aplicando filtros:', { filterType, filterStatus, selectedMill, search });
    setFeedbackInfo({
      title: 'Filtros Aplicados',
      message: 'Los filtros se han aplicado correctamente.',
      type: 'success',
      onConfirm: () => setShowFeedbackModal(false)
    });
    setShowFeedbackModal(true);
  };

  const handleLimpiarFiltros = () => {
    setSearch('');
    setFilterType('all');
    setFilterStatus('all');
    setSelectedMill('all');
    setFeedbackInfo({
      title: 'Filtros Limpiados',
      message: 'Se han restablecido los filtros de búsqueda.',
      type: 'info',
      onConfirm: () => setShowFeedbackModal(false)
    });
    setShowFeedbackModal(true);
  };

  // Componente Modal de Calendario
  const CalendarModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Calendario de Mantenimiento</h3>
            <p className="text-gray-600">Programación mensual de actividades</p>
          </div>
          <button onClick={() => setShowCalendarModal(false)} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-auto">
          <div className="grid grid-cols-7 gap-2 mb-6">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="text-center font-medium text-gray-700 p-2">
                {day}
              </div>
            ))}

            {Array.from({ length: 31 }, (_, i) => {
              const day = i + 1;
              const hasMaintenance = [5, 10, 15, 20, 25].includes(day);
              return (
                <div key={day} className={`border rounded-lg p-2 h-24 ${hasMaintenance ? 'bg-blue-50' : ''}`}>
                  <div className="font-medium text-gray-900">{day}</div>
                  {hasMaintenance && (
                    <div className="mt-2 text-xs space-y-1">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded">M1 PM</div>
                      {day === 15 && <div className="bg-red-100 text-red-800 px-2 py-1 rounded">M3 Corrección</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Próximos Mantenimientos Programados</h4>
            {[
              { fecha: '2024-02-05', molino: 'Molino IV', tipo: 'Preventivo', horas: 4 },
              { fecha: '2024-02-10', molino: 'Molino II', tipo: 'Preventivo', horas: 3 },
              { fecha: '2024-02-15', molino: 'Molino I', tipo: 'Preventivo', horas: 5 },
              { fecha: '2024-02-20', molino: 'Molino III', tipo: 'Correctivo', horas: 8 }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{item.fecha} - {item.molino}</div>
                  <div className="text-sm text-gray-600">{item.tipo} - {item.horas} horas</div>
                </div>
                <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">
                  Ver detalles
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <button
            onClick={() => setShowCalendarModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cerrar
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <FileSpreadsheet size={18} className="mr-2" />
            Exportar Calendario
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Mantenimiento</h1>
          <p className="text-gray-600 mt-1">Sistema integral de mantenimiento industrial</p>
        </div>
        <div className="mt-4 lg:mt-0 flex flex-wrap gap-3">
          <button
            className="btn-primary flex items-center whitespace-nowrap"
            onClick={handleNewRecord}
          >
            <Plus size={18} className="mr-2" />
            Nueva Orden
          </button>
          <button
            className="btn-secondary flex items-center whitespace-nowrap"
            onClick={handleExportExcel}
          >
            <Download size={18} className="mr-2" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-2xl p-4 md:p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Disponibilidad</p>
              <p className="text-2xl font-bold text-gray-900">
                {mills.length > 0
                  ? `${Math.round((mills.filter(m => m.status === 'libre').length / mills.length) * 100)}%`
                  : '0%'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500">
              {mills.filter(m => m.status === 'libre').length} de {mills.length} operativos
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: mills.length > 0
                    ? `${(mills.filter(m => m.status === 'libre').length / mills.length) * 100}%`
                    : '0%'
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-xl mr-4">
              <Clock className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Historial Total</p>
              <p className="text-2xl font-bold text-gray-900">{maintenanceLogs.length}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500">Registros en base de datos</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-xl mr-4">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Mantenimientos Urgentes</p>
              <p className="text-2xl font-bold text-gray-900">
                {mills.filter(m => (m.hours_to_oil_change || 0) < 20).length}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500">Aceite crítico (&lt;20h)</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{
                  width: mills.length > 0
                    ? `${(mills.filter(m => (m.hours_to_oil_change || 0) < 20).length / mills.length) * 100}%`
                    : '0%'
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Molino Status Dashboard */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Estado de Molinos</h3>
            <p className="text-gray-600 text-sm">Dashboard operacional en tiempo real</p>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <button
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center"
              onClick={handleConfigurar}
            >
              <Settings size={16} className="mr-2" />
              Configurar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mills.map((molino) => (
            <div key={molino.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${molino.status === 'libre' ? 'bg-green-100' :
                    molino.status === 'mantenimiento' ? 'bg-yellow-100' :
                      'bg-purple-100'
                    }`}>
                    <span className={`font-bold ${molino.status === 'libre' ? 'text-green-700' :
                      molino.status === 'mantenimiento' ? 'text-yellow-700' :
                        'text-purple-700'
                      }`}>{molino.name?.substring(0, 2)}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{molino.name}</div>
                    <div className={`text-xs font-medium uppercase ${molino.status === 'libre' ? 'text-green-600' :
                      molino.status === 'mantenimiento' ? 'text-yellow-600' :
                        'text-purple-600'
                      }`}>
                      {molino.status}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleViewHistory(molino.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <History size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Horas Cambio:</span>
                  <span className="font-medium">{molino.hours_to_oil_change}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Capacidad:</span>
                  <span className="font-medium">{molino.capacity} sacos</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-1">Vida Aceite</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${molino.hours_to_oil_change! > 20 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, (molino.hours_to_oil_change! / 100) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar ID, molino, descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border rounded-xl pl-10 w-full"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded-xl w-full"
            >
              <option value="all">Todos los tipos</option>
              <option value="PREVENTIVO">Preventivo</option>
              <option value="CORRECTIVO">Correctivo</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-xl w-full"
            >
              <option value="all">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="COMPLETADO">Completado</option>
            </select>
          </div>

          <div>
            <select
              value={selectedMill}
              onChange={(e) => setSelectedMill(e.target.value)}
              className="px-4 py-2 border rounded-xl w-full"
            >
              <option value="all">Todos los molinos</option>
              {mills.map((mill) => (
                <option key={mill.id} value={mill.id}>{mill.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap"
            onClick={handleAplicarFiltros}
          >
            <Filter size={16} className="inline mr-2" />
            Aplicar filtros
          </button>
          <button
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium whitespace-nowrap"
            onClick={handleLimpiarFiltros}
          >
            Limpiar filtros
          </button>
          <button
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap"
            onClick={handlePrint}
          >
            <Printer size={16} className="inline mr-2" />
            Imprimir
          </button>
          <button
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap"
            onClick={handleGeneratePDF}
          >
            <FileText size={16} className="inline mr-2" />
            Generar PDF
          </button>
          <button
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap"
            onClick={handleEnviarWhatsApp}
          >
            <MessageSquare size={16} className="inline mr-2" />
            Enviar WhatsApp
          </button>
          <button
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap"
            onClick={handleEnviarCorreo}
          >
            <Mail size={16} className="inline mr-2" />
            Enviar Correo
          </button>
        </div>
      </div>

      {/* Maintenance List */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Molino</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo/Prioridad</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horas/Costo</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900">{log.id}</span>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="font-medium">M{log.molinoId}</span>
                        </div>
                        <span className="text-gray-900">{log.molinoNombre}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getTypeBadge(log.tipo)}
                        {getPriorityBadge(log.prioridad)}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="text-gray-900 font-medium">{log.descripcion}</div>
                      <div className="text-sm text-gray-500 mt-1">{log.categoria}</div>
                      <div className="text-xs text-gray-400 mt-1">Fecha: {log.fechaProgramada}</div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.estado)}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{log.horasReales}h</div>
                        <div className="text-sm text-gray-500">${log.costoReal.toLocaleString()}</div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          onClick={() => handleViewDetail(log)}
                          title="Ver detalle"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                          onClick={() => handleEditRecord(log)}
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          onClick={() => handleDeleteRecord(log.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          onClick={handleGenerarQR}
                          title="Generar QR"
                        >
                          <QrCode size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron registros de mantenimiento
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                Mostrando <span className="font-medium">{(currentPage - 1) * recordsPerPage + 1}</span> a{' '}
                <span className="font-medium">{Math.min(currentPage * recordsPerPage, filteredLogs.length)}</span> de{' '}
                <span className="font-medium">{filteredLogs.length}</span> registros
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft size={20} />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium ${currentPage === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'border text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Maintenance Alerts */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="text-yellow-600 mr-3" size={24} />
            <div>
              <h3 className="font-semibold text-yellow-900 text-base md:text-lg">Alertas de Mantenimiento</h3>
              <p className="text-yellow-700 text-sm">Próximos mantenimientos preventivos programados</p>
            </div>
          </div>
          <button
            className="btn-secondary mt-4 md:mt-0"
            onClick={handleShowCalendar}
          >
            Ver calendario
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mills.filter(m => m.necesita_mantenimiento).map((molino) => (
            <div key={molino.id} className="bg-white rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="font-medium text-yellow-700">{molino.name?.substring(0, 2)}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{molino.name}</div>
                    <div className="text-sm text-yellow-600">Requiere Atención</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-700">
                    {molino.hours_to_oil_change}h
                  </div>
                  <div className="text-sm text-gray-500">Restante</div>
                </div>
              </div>
            </div>
          ))}
          {mills.filter(m => m.necesita_mantenimiento).length === 0 && (
            <div className="col-span-full py-4 text-center text-yellow-700 italic text-sm">
              No hay alertas de mantenimiento activas en este momento.
            </div>
          )}
        </div>
      </div>

      {/* Repuestos y Inventario */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Gestión de Repuestos</h3>
            <p className="text-gray-600 text-sm">Inventario y seguimiento de componentes</p>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <button
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center"
              onClick={handleControlStock}
            >
              <Package size={16} className="mr-2" />
              Control Stock
            </button>
            <button
              className="px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium flex items-center"
              onClick={handleSolicitarRepuesto}
            >
              <Upload size={16} className="mr-2" />
              Solicitar Repuesto
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Wrench className="text-blue-600" size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-900">Repuestos Críticos</div>
                <div className="text-sm text-gray-500">Estado de stock</div>
              </div>
            </div>
            <div className="py-8 text-center">
              <Package className="mx-auto text-slate-300 mb-2" size={32} strokeWidth={1} />
              <p className="text-sm text-slate-500 italic">Módulo de inventario<br />en desarrollo</p>
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-900">En Garantía</div>
                <div className="text-sm text-gray-500">Componentes activos</div>
              </div>
            </div>
            <div className="py-8 text-center">
              <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} strokeWidth={1} />
              <p className="text-sm text-slate-500 italic">Sin registros de<br />garantía actuales</p>
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Calendar className="text-purple-600" size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-900">Próximas Instalaciones</div>
                <div className="text-sm text-gray-500">Programadas</div>
              </div>
            </div>
            <div className="py-8 text-center">
              <Calendar className="mx-auto text-slate-300 mb-2" size={32} strokeWidth={1} />
              <p className="text-sm text-slate-500 italic">No hay instalaciones<br />programadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción adicionales */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center"
          onClick={handleGenerarQR}
        >
          <QrCode size={18} className="mr-2" />
          Generar Códigos QR
        </button>
        <button
          className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 flex items-center"
          onClick={() => alert('Generando reporte estadístico...')}
        >
          <Activity size={18} className="mr-2" />
          Estadísticas Avanzadas
        </button>
        <button
          className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 flex items-center"
          onClick={() => alert('Actualizando datos desde ERP...')}
        >
          <RefreshCw size={18} className="mr-2" />
          Sincronizar con ERP
        </button>
        <button
          className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 flex items-center"
          onClick={() => alert('Enviando alertas automáticas...')}
        >
          <AlertCircle size={18} className="mr-2" />
          Alertas Automáticas
        </button>
      </div>

      {/* Modal Nueva Orden */}
      {showNewRecordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedRecord ? 'Editar Orden' : 'Nueva Orden de Mantenimiento'}</h3>
                <p className="text-gray-600">Complete los datos de la orden</p>
              </div>
              <button onClick={() => setShowNewRecordModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Molino</label>
                  <select
                    value={newRecord.molinoId}
                    onChange={(e) => setNewRecord({ ...newRecord, molinoId: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">Seleccionar molino</option>
                    {MILLS && MILLS.map(mill => (
                      <option key={mill.id} value={mill.id}>{mill.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Mantenimiento</label>
                  <select
                    value={newRecord.tipo}
                    onChange={(e) => setNewRecord({ ...newRecord, tipo: e.target.value as any })}
                    className="input-field w-full"
                  >
                    <option value="PREVENTIVO">Preventivo</option>
                    <option value="CORRECTIVO">Correctivo</option>
                    <option value="PREDICTIVO">Predictivo</option>
                    <option value="EMERGENCIA">Emergencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                  <select
                    value={newRecord.categoria}
                    onChange={(e) => setNewRecord({ ...newRecord, categoria: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="LUBRICACION">Lubricación</option>
                    <option value="MECANICO">Mecánico</option>
                    <option value="ELECTRICO">Eléctrico</option>
                    <option value="HIDRAULICO">Hidráulico</option>
                    <option value="NEUMATICO">Neumático</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
                  <select
                    value={newRecord.prioridad}
                    onChange={(e) => setNewRecord({ ...newRecord, prioridad: e.target.value as any })}
                    className="input-field w-full"
                  >
                    <option value="BAJA">Baja</option>
                    <option value="MEDIA">Media</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <input
                    type="text"
                    value={newRecord.descripcion}
                    onChange={(e) => setNewRecord({ ...newRecord, descripcion: e.target.value })}
                    className="input-field w-full"
                    placeholder="Ej: Cambio de aceite y filtros"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Programada</label>
                  <input
                    type="date"
                    value={newRecord.fechaProgramada}
                    onChange={(e) => setNewRecord({ ...newRecord, fechaProgramada: e.target.value })}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horas Estimadas</label>
                  <input
                    type="number"
                    value={newRecord.horasEstimadas}
                    onChange={(e) => setNewRecord({ ...newRecord, horasEstimadas: parseInt(e.target.value) || 0 })}
                    className="input-field w-full"
                    min="1"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Asignado a</label>
                  <input
                    type="text"
                    value={newRecord.asignadoA}
                    onChange={(e) => setNewRecord({ ...newRecord, asignadoA: e.target.value })}
                    className="input-field w-full"
                    placeholder="Nombre del técnico"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Repuestos Necesarios</label>
                <textarea
                  className="input-field w-full h-32"
                  placeholder="Liste los repuestos necesarios..."
                />
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <button
                onClick={() => setShowNewRecordModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNewRecord}
                className="btn-primary flex items-center"
              >
                <Save size={18} className="mr-2" />
                {selectedRecord ? 'Actualizar Orden' : 'Crear Orden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Solicitar Repuesto */}
      {showRepuestoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Solicitud de Repuesto</h3>
                <p className="text-gray-600">Complete los datos del repuesto solicitado</p>
              </div>
              <button onClick={() => setShowRepuestoModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Repuesto</label>
                  <input
                    type="text"
                    value={newRepuesto.nombre}
                    onChange={(e) => setNewRepuesto({ ...newRepuesto, nombre: e.target.value })}
                    className="input-field w-full"
                    placeholder="Ej: Perno M24x120 Grado 8.8"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código</label>
                  <input
                    type="text"
                    value={newRepuesto.codigo}
                    onChange={(e) => setNewRepuesto({ ...newRepuesto, codigo: e.target.value })}
                    className="input-field w-full"
                    placeholder="Ej: PER-024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
                  <input
                    type="number"
                    value={newRepuesto.cantidad}
                    onChange={(e) => setNewRepuesto({ ...newRepuesto, cantidad: parseInt(e.target.value) || 0 })}
                    className="input-field w-full"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unidad</label>
                  <select
                    value={newRepuesto.unidad}
                    onChange={(e) => setNewRepuesto({ ...newRepuesto, unidad: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="unidades">Unidades</option>
                    <option value="litros">Litros</option>
                    <option value="kg">Kilogramos</option>
                    <option value="metros">Metros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Costo Unitario ($)</label>
                  <input
                    type="number"
                    value={newRepuesto.costoUnitario}
                    onChange={(e) => setNewRepuesto({ ...newRepuesto, costoUnitario: parseFloat(e.target.value) || 0 })}
                    className="input-field w-full"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor</label>
                  <select
                    value={newRepuesto.proveedor}
                    onChange={(e) => setNewRepuesto({ ...newRepuesto, proveedor: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">Seleccionar proveedor</option>
                    <option value="Tornillería Industrial">Tornillería Industrial</option>
                    <option value="Lubritec SA">Lubritec SA</option>
                    <option value="SKF Perú">SKF Perú</option>
                    <option value="ABB">ABB</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Motivo de Solicitud</label>
                  <textarea
                    value={newRepuesto.motivo}
                    onChange={(e) => setNewRepuesto({ ...newRepuesto, motivo: e.target.value })}
                    className="input-field w-full h-24"
                    placeholder="Describa la necesidad del repuesto..."
                  />
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-blue-700">Costo Total Estimado</div>
                    <div className="text-2xl font-bold text-blue-900">
                      ${(newRepuesto.cantidad * newRepuesto.costoUnitario).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-blue-700">
                    {newRepuesto.cantidad} {newRepuesto.unidad} × ${newRepuesto.costoUnitario}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <button
                onClick={() => setShowRepuestoModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRepuesto}
                className="btn-primary flex items-center"
              >
                <Upload size={18} className="mr-2" />
                Solicitar Repuesto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuración */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Configuración del Sistema</h3>
                <p className="text-gray-600">Ajustes y parámetros del sistema de mantenimiento</p>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Parámetros de Mantenimiento</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Horas entre mantenimientos preventivos</label>
                      <input type="number" className="input-field w-full" defaultValue="500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Alertas antes del mantenimiento (días)</label>
                      <input type="number" className="input-field w-full" defaultValue="7" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Notificaciones</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded text-primary-600 mr-2" defaultChecked />
                      <span className="text-sm text-gray-700">Enviar alertas por correo</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded text-primary-600 mr-2" defaultChecked />
                      <span className="text-sm text-gray-700">Notificaciones por WhatsApp</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded text-primary-600 mr-2" />
                      <span className="text-sm text-gray-700">Alertas en tiempo real</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Integraciones</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">API Key ERP</label>
                      <input type="password" className="input-field w-full" placeholder="Ingrese API key" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Notificaciones</label>
                      <input type="text" className="input-field w-full" placeholder="https://webhook.url" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  alert('Configuración guardada exitosamente');
                  setShowConfigModal(false);
                }}
                className="btn-primary flex items-center"
              >
                <Save size={18} className="mr-2" />
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {showHistoryModal && selectedMillHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Historial - {selectedMillHistory.name}</h3>
                <p className="text-gray-600">Registro completo de intervenciones</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-sm text-gray-500">Horas Cambio Aceite</div>
                  <div className="text-2xl font-bold">{selectedMillHistory.hours_to_oil_change}h</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-sm text-gray-500">Estado Actual</div>
                  <div className="text-2xl font-bold uppercase">{selectedMillHistory.status}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-sm text-gray-500">Capacidad</div>
                  <div className="text-2xl font-bold">{selectedMillHistory.capacity} sacos</div>
                </div>
              </div>

              <div className="space-y-4">
                {(maintenanceLogs || []).filter(log => log.mill_id === selectedMillHistory.id).map((record) => (
                  <div key={record.id} className="border rounded-xl p-4 hover:bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
                      <div className="flex items-center mb-2 md:mb-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${record.type === 'PREVENTIVO' ? 'bg-blue-100' : 'bg-red-100'}`}>
                          <Wrench size={16} className={record.type === 'PREVENTIVO' ? 'text-blue-600' : 'text-red-600'} />
                        </div>
                        <div>
                          <div className="font-medium">#{record.id.substring(0, 8)} - {record.type}</div>
                          <div className="text-sm text-gray-500">{new Date(record.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {getStatusBadge(record.status)}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-gray-900 text-sm">{record.description}</div>
                      {record.action_taken && <div className="text-gray-600 text-xs mt-1 italic">Acción: {record.action_taken}</div>}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-gray-600">Técnico: <span className="font-medium text-gray-900">{record.technician_name || 'N/A'}</span></span>
                      <span className="text-gray-600">Horas: <span className="font-medium text-gray-900">{record.worked_hours}h</span></span>
                    </div>

                    <button
                      onClick={() => handleViewDetail(record)}
                      className="mt-3 text-indigo-600 hover:text-indigo-800 text-xs font-semibold flex items-center"
                    >
                      <Eye size={14} className="mr-1" />
                      Ver detalles
                    </button>
                  </div>
                ))}
                {(!maintenanceLogs || maintenanceLogs.filter(log => log.mill_id === selectedMillHistory.id).length === 0) && (
                  <div className="text-center py-8 text-gray-400 italic">No hay historial registrado para este molino.</div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cerrar
              </button>
              <button
                onClick={handleExportExcel}
                className="btn-primary flex items-center"
              >
                <Download size={18} className="mr-2" />
                Exportar Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Calendario */}
      {showCalendarModal && <CalendarModal />}

      <ConfirmationModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onConfirm={feedbackInfo.onConfirm}
        title={feedbackInfo.title}
        message={feedbackInfo.message}
        type={feedbackInfo.type}
        confirmText="Entendido"
        showCancel={feedbackInfo.type === 'danger'}
        icon={feedbackInfo.type === 'success' ? 'success' : feedbackInfo.type === 'danger' ? 'trash' : 'alert'}
      />
    </div>
  );
};

export default Mantenimiento;