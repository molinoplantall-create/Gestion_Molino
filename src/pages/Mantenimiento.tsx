import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wrench, CheckCircle, Clock, AlertTriangle, Plus, Download, History, Settings, Activity, FileText, MessageSquare, AlertOctagon
} from 'lucide-react';
import { useSupabaseStore } from '@/store/supabaseStore';
import { useModal } from '@/hooks/useModal';
import { useToast } from '@/hooks/useToast';
import { MaintenanceForm, MaintenanceFormData } from '@/components/mantenimiento/MaintenanceForm';
import { MaintenanceTable } from '@/components/mantenimiento/MaintenanceTable';
import { MaintenanceFilters } from '@/components/mantenimiento/MaintenanceFilters';
import { KpiIndicators } from '@/components/mantenimiento/KpiIndicators';
import { FinalizeMaintenanceModal } from '@/components/mantenimiento/FinalizeMaintenanceModal';
import { MaintenanceDetailModal } from '@/components/mantenimiento/MaintenanceDetailModal';
import { MillHistoryTimeline } from '@/components/mantenimiento/MillHistoryTimeline';
import { FailureRanking } from '@/components/mantenimiento/FailureRanking';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { InputModal } from '@/components/ui/InputModal';
import { useFormValidation } from '@/hooks/useFormValidation';
import { maintenanceSchema } from '@/schemas/maintenanceSchema';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  completed_at?: string;
  failure_start_time?: string;
  name?: string;
  mills?: {
    name: string;
  };
}

// Helper: format date as DD-MM-YY from ISO string
const fmtDate = (iso: string) => {
  if (!iso) return '-';
  const d = iso.split('T')[0].split('-');
  return `${d[2]}-${d[1]}-${d[0].slice(2)}`;
};

const Mantenimiento: React.FC = () => {
  const { mills, maintenanceLogs, maintenanceLogsCount, fetchMills, fetchMaintenanceLogs, registerMaintenance, resetMillOil, loading } = useSupabaseStore();
  const toast = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMill, setSelectedMill] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Debounce search — wait 400ms after last keystroke
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Modals
  const createModal = useModal();
  const editModal = useModal<MaintenanceRecord>();
  const deleteModal = useModal<MaintenanceRecord>();
  const detailModal = useModal<MaintenanceRecord>();
  const finalizeModal = useModal<any>();
  const [resetOilModal, setResetOilModal] = useState<{ isOpen: boolean, millId: string, millName: string }>({ isOpen: false, millId: '', millName: '' });
  const [historyTimeline, setHistoryTimeline] = useState<{ isOpen: boolean, millId: string, millName: string }>({ isOpen: false, millId: '', millName: '' });

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  // All maintenance logs for KPI calculation (unfiltered) — cached with ref
  const [allMaintenanceLogs, setAllMaintenanceLogs] = useState<any[]>([]);
  const lastKpiFetchCount = useRef<number>(-1);
  const [formData, setFormData] = useState<MaintenanceFormData>({
    molinoId: '',
    tipo: 'PREVENTIVO',
    categoria: '',
    descripcion: '',
    prioridad: 'MEDIA',
    estado: 'PENDIENTE',
    fechaProgramada: new Date().toISOString().split('T')[0],
    horasEstimadas: 4,
    asignadoA: '',
    cost_pen: 0,
    cost_usd: 0,
    tasks_checklist: []
  });

  const { errors, validate, clearErrors, validateField } = useFormValidation({
    schema: maintenanceSchema
  });

  useEffect(() => {
    fetchMills();
  }, [fetchMills]);

  useEffect(() => {
    fetchMaintenanceLogs({
      page: currentPage,
      pageSize: recordsPerPage,
      search: debouncedSearch,
      type: filterType,
      status: filterStatus,
      millId: selectedMill,
      startDate,
      endDate
    });
  }, [fetchMaintenanceLogs, currentPage, debouncedSearch, filterType, filterStatus, selectedMill, startDate, endDate]);

  // Realtime subscription — auto-refresh when maintenance_logs change
  useEffect(() => {
    let channel: any;
    const setupRealtime = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        channel = supabase
          .channel('maintenance-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_logs' }, () => {
            console.log('🔄 Realtime: maintenance_logs changed, refreshing...');
            fetchMaintenanceLogs({
              page: currentPage,
              pageSize: recordsPerPage,
              search: debouncedSearch,
              type: filterType,
              status: filterStatus,
              millId: selectedMill,
              startDate,
              endDate
            });
            fetchMills();
          })
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription not available:', e);
      }
    };
    setupRealtime();
    return () => { if (channel) channel.unsubscribe(); };
  }, []);

  // Fetch ALL logs for KPI calculation — cached to avoid redundant requests
  useEffect(() => {
    if (lastKpiFetchCount.current === maintenanceLogs.length) return;
    lastKpiFetchCount.current = maintenanceLogs.length;
    
    const fetchAllLogs = async () => {
      try {
        const { data, error } = await (await import('@/lib/supabase')).supabase
          .from('maintenance_logs')
          .select('*, mills(*)')
          .order('created_at', { ascending: false });
        if (!error && data) {
          const normalized = data.map((log: any) => ({
            ...log,
            mill_id: log.mill_id || log.molino_id,
            type: log.type || log.tipo || 'PREVENTIVO',
            status: (log.status || log.estado || 'PENDIENTE').toUpperCase(),
            failure_start_time: log.failure_start_time || null,
            completed_at: log.completed_at || null,
            worked_hours: log.worked_hours || log.horas_trabajadas || 0,
          }));
          setAllMaintenanceLogs(normalized);
        }
      } catch (e) {
        console.error('Error fetching all maintenance logs for KPIs:', e);
      }
    };
    fetchAllLogs();
  }, [maintenanceLogs.length]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterType, filterStatus, selectedMill, startDate, endDate]);

  // Pagination using count from store (fix #2)
  const totalPages = Math.ceil(maintenanceLogsCount / recordsPerPage) || 1;
  const paginatedLogs = maintenanceLogs; // Store already paginates

  // Oil change alerts
  const oilAlertMills = mills.filter(m => (m.hours_to_oil_change || 0) <= 50 && (m.hours_to_oil_change || 0) > 0);

  // Handlers
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const resetForm = () => {
    setFormData({
      molinoId: '',
      tipo: 'PREVENTIVO',
      categoria: '',
      descripcion: '',
      prioridad: 'MEDIA',
      estado: 'PENDIENTE',
      fechaProgramada: new Date().toISOString().split('T')[0],
      horasEstimadas: 4,
      asignadoA: '',
      cost_pen: 0,
      cost_usd: 0,
      tasks_checklist: []
    });
    clearErrors();
  };

  const handleCreateRecord = async () => {
    const isValid = await validate(formData);
    if (!isValid) {
      toast.warning('Validación fallida', 'Por favor revise los errores en el formulario');
      return;
    }

    setIsSubmitting(true);
    const success = await registerMaintenance({
      mill_id: formData.molinoId,
      type: formData.tipo,
      description: formData.descripcion,
      technician_name: formData.asignadoA,
      worked_hours: formData.horasEstimadas,
      fechaProgramada: formData.fechaProgramada,
      status: formData.estado,
      cost_pen: formData.cost_pen,
      cost_usd: formData.cost_usd,
      tasks_checklist: formData.tasks_checklist
    });

    setIsSubmitting(false);

    if (success) {
      toast.success('Orden Creada', 'La orden de mantenimiento se ha registrado correctamente.');
      createModal.close();
      resetForm();
    } else {
      toast.error('Error', 'No se pudo crear la orden de mantenimiento.');
    }
  };

  const handleEditClick = (record: MaintenanceRecord) => {
    setFormData({
      molinoId: record.mill_id,
      tipo: record.type as any,
      categoria: record.category || '',
      descripcion: record.description,
      prioridad: (record.priority || 'MEDIA') as any,
      estado: (record.status || 'PENDIENTE') as any,
      fechaProgramada: record.created_at ? record.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      horasEstimadas: record.worked_hours || 4,
      asignadoA: record.technician_name || '',
      cost_pen: (record as any).cost_pen || 0,
      cost_usd: (record as any).cost_usd || 0,
      tasks_checklist: (record as any).tasks_checklist || []
    });
    editModal.open(record);
  };

  const handleUpdateRecord = async () => {
    const isValid = await validate(formData);
    if (!isValid) {
      toast.warning('Validación fallida', 'Por favor revise los errores en el formulario');
      return;
    }

    if (!editModal.data) return;

    setIsSubmitting(true);

    const { error } = await useSupabaseStore.getState().updateMaintenanceLog(editModal.data.id, {
      mill_id: formData.molinoId,
      type: formData.tipo,
      category: formData.categoria,
      description: formData.descripcion,
      priority: formData.prioridad,
      status: formData.estado,
      worked_hours: formData.horasEstimadas,
      technician_name: formData.asignadoA,
      cost_pen: formData.cost_pen,
      cost_usd: formData.cost_usd,
      tasks_checklist: formData.tasks_checklist,
      created_at: formData.fechaProgramada ? `${formData.fechaProgramada.split('T')[0]}T12:00:00` : new Date().toISOString()
    });

    setIsSubmitting(false);

    if (!error) {
      toast.success('Registro Actualizado', 'El mantenimiento se ha modificado correctamente.');
      editModal.close();
      useSupabaseStore.getState().fetchMaintenanceLogs({});
    } else {
      toast.error('Error', 'No se pudo actualizar el registro de mantenimiento.');
    }
  };

  const handleDeleteClick = (record: MaintenanceRecord) => {
    deleteModal.open(record);
  };

  // Real delete logic (fix #1)
  const handleConfirmDelete = async () => {
    if (!deleteModal.data) return;

    setIsSubmitting(true);
    const success = await useSupabaseStore.getState().deleteMaintenanceLog(deleteModal.data.id);
    setIsSubmitting(false);

    if (success) {
      toast.success('Eliminado', 'El registro de mantenimiento ha sido eliminado correctamente.');
    } else {
      toast.error('Error', 'No se pudo eliminar el registro de mantenimiento.');
    }
    deleteModal.close();
  };

  const handleViewHistory = (molinoId: string) => {
    const mill = mills.find(m => m.id === molinoId);
    setHistoryTimeline({ isOpen: true, millId: molinoId, millName: mill?.name || 'Molino' });
  };

  // Duplicate order handler
  const handleDuplicateOrder = (record: MaintenanceRecord) => {
    setFormData({
      molinoId: record.mill_id,
      tipo: record.type as any,
      categoria: record.category || '',
      descripcion: record.description,
      prioridad: (record.priority || 'MEDIA') as any,
      estado: 'PENDIENTE',
      fechaProgramada: new Date().toISOString().split('T')[0],
      horasEstimadas: record.worked_hours || 4,
      asignadoA: record.technician_name || '',
      cost_pen: (record as any).cost_pen || 0,
      cost_usd: (record as any).cost_usd || 0,
      tasks_checklist: (record as any).tasks_checklist || []
    });
    createModal.open();
    toast.info('Orden Duplicada', 'Se ha pre-cargado el formulario con los datos. Modifique lo necesario y guarde.');
  };

  // Export ALL filtered data (not just current page) (fix #9)
  const fetchAllFilteredLogs = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      let query = supabase
        .from('maintenance_logs')
        .select('*, mills(*)')
        .order('created_at', { ascending: false });

      if (selectedMill && selectedMill !== 'all') {
        query = query.or(`mill_id.eq.${selectedMill},molino_id.eq.${selectedMill}`);
      }
      if (filterType && filterType !== 'all') {
        query = query.or(`type.eq.${filterType},tipo.eq.${filterType}`);
      }
      if (filterStatus && filterStatus !== 'all') {
        query = query.or(`status.eq.${filterStatus.toUpperCase()},estado.eq.${filterStatus.toUpperCase()}`);
      }
      if (debouncedSearch) {
        query = query.or(`description.ilike.%${debouncedSearch}%,descripcion_falla.ilike.%${debouncedSearch}%`);
      }
      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((log: any) => ({
        ...log,
        mill_id: log.mill_id || log.molino_id,
        name: log.mills?.name || log.mills?.nombre || `Molino ${log.mill_id || log.molino_id}`,
        type: log.type || log.tipo || 'PREVENTIVO',
        description: log.description || log.descripcion_falla || '',
        technician_name: log.technician_name || log.asignado_a || '',
        worked_hours: log.worked_hours || log.horas_trabajadas || 0,
        status: (log.status || log.estado || 'PENDIENTE').toUpperCase(),
        created_at: log.created_at || log.fecha_registro || new Date().toISOString()
      }));
    } catch (e) {
      console.error('Error fetching all filtered logs:', e);
      return maintenanceLogs;
    }
  };

  const handleExportExcel = async () => {
    toast.info('Exportando', 'Obteniendo todos los datos filtrados...');
    const allLogs = await fetchAllFilteredLogs();
    if (allLogs.length === 0) {
      toast.error('Error', 'No hay datos para exportar');
      return;
    }

    const dataToExport = allLogs.map((log: any) => ({
      Fecha: fmtDate(log.created_at),
      ID: log.id.substring(0, 8),
      Molino: log.name,
      Tipo: log.type,
      Prioridad: log.priority || 'N/A',
      Descripción: log.description,
      Técnico: log.technician_name,
      Horas: log.worked_hours,
      Estado: log.status
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mantenimientos");
    XLSX.writeFile(wb, `Reporte_Mantenimiento_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success('Éxito', `Excel generado con ${allLogs.length} registros`);
  };

  const handleGeneratePDF = async () => {
    toast.info('Generando', 'Obteniendo todos los datos filtrados...');
    const allLogs = await fetchAllFilteredLogs();
    if (allLogs.length === 0) {
      toast.error('Error', 'No hay datos para imprimir');
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('REPORTE DE MANTENIMIENTO INDUSTRIAL', 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de generación: ${fmtDate(new Date().toISOString())} | Total: ${allLogs.length} registros`, 105, 22, { align: 'center' });

    const tableColumn = ["Fecha", "Molino", "Tipo", "Descripción", "Técnico", "Horas", "Estado"];
    const tableRows = allLogs.map((log: any) => [
      fmtDate(log.created_at),
      log.name,
      log.type,
      log.description,
      log.technician_name || 'N/A',
      `${log.worked_hours || 0}h`,
      log.status
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255] },
      styles: { fontSize: 7 },
      columnStyles: {
        3: { cellWidth: 45 },
      }
    });

    doc.save(`Reporte_Mantenimiento_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Éxito', `PDF generado con ${allLogs.length} registros`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (maintenanceLogs.length === 0) {
      toast.error('Error', 'No hay registros para enviar');
      return;
    }

    const lastLog = maintenanceLogs[0];
    const message = `*REPORTE DE MANTENIMIENTO*
----------------------------
*Molino:* ${lastLog.name}
*Fecha:* ${fmtDate(lastLog.created_at)}
*Tipo:* ${lastLog.type}
*Descripción:* ${lastLog.description}
*Técnico:* ${lastLog.technician_name}
*Estado:* ${lastLog.status}
----------------------------
_Enviado desde el sistema de Gestión de Molinos_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSendEmail = () => {
    const email = 'tecnico@empresa.com';
    const subject = encodeURIComponent('Reporte de Mantenimiento');
    const body = encodeURIComponent('Adjunto el reporte de mantenimiento solicitado.');
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const handleApplyFilters = () => {
    toast.success('Filtros Aplicados', 'Los filtros se han aplicado correctamente.');
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilterType('all');
    setFilterStatus('all');
    setSelectedMill('all');
    setStartDate('');
    setEndDate('');
    toast.info('Filtros Limpiados', 'Se han restablecido los filtros de búsqueda.');
  };

  // Quick date filters (fix #8)
  const handleQuickDateFilter = (range: 'week' | 'month' | 'quarter') => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: Date;

    switch (range) {
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end);
  };

  const handleFinalizeMaintenance = (id: string, millId: string) => {
    const record = maintenanceLogs.find(l => l.id === id);
    if (record) {
      finalizeModal.open(record);
    }
  };

  const handleConfirmFinalize = async (details: { action_taken: string, worked_hours: number, completed_at: string }) => {
    if (!finalizeModal.data) return;

    setIsSubmitting(true);
    const success = await useSupabaseStore.getState().finalizeMaintenance(
      finalizeModal.data.id,
      finalizeModal.data.mill_id,
      details
    );
    setIsSubmitting(false);

    if (success) {
      toast.success('Mantenimiento Finalizado', 'El molino ha vuelto a estado LIBRE y se guardaron los detalles.');
      finalizeModal.close();
    } else {
      toast.error('Error', 'No se pudo finalizar el mantenimiento.');
    }
  };

  const handleResetOil = (millId: string, millName: string) => {
    setResetOilModal({ isOpen: true, millId, millName });
  };

  const handleConfirmResetOil = async (rawInput: string) => {
    setResetOilModal(prev => ({ ...prev, isOpen: false }));
    const targetHours = parseInt(rawInput, 10);
    if (isNaN(targetHours) || targetHours < 1) {
      toast.error('Inválido', 'Debes ingresar un número válido de horas.');
      return;
    }

    const { millId, millName } = resetOilModal;
    const success = await resetMillOil(millId, targetHours);
    if (success) {
      toast.success('Horas Reiniciadas', `Se estableció la vida útil del ${millName} en ${targetHours}h.`);
    } else {
      toast.error('Error', 'No se pudo registrar el cambio.');
    }
  };

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
            onClick={() => {
              resetForm();
              createModal.open();
            }}
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

      {/* Oil Change Alerts (fix #6) */}
      {oilAlertMills.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-red-50 rounded-2xl p-4 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon size={20} className="text-amber-600" />
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">
              ⚠️ Alertas de Mantenimiento Preventivo
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {oilAlertMills.map(mill => (
              <div 
                key={mill.id} 
                className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                  (mill.hours_to_oil_change || 0) <= 20 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    (mill.hours_to_oil_change || 0) <= 20 ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <span className="text-xs font-bold text-slate-700">{mill.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black ${
                    (mill.hours_to_oil_change || 0) <= 20 ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {Math.round(mill.hours_to_oil_change || 0)}h
                  </span>
                  <button
                    onClick={() => handleResetOil(mill.id, mill.name)}
                    className="text-[9px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded transition-colors uppercase"
                  >
                    Renovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Section: MTBF, MTTR, Disponibilidad */}
      <KpiIndicators maintenanceLogs={allMaintenanceLogs} mills={mills} />

      {/* Molino Status Dashboard */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Estado de Molinos</h3>
            <p className="text-gray-600 text-sm">Dashboard operacional en tiempo real</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mills.map((molino) => (
            <div key={molino.id} className={`border rounded-xl p-4 hover:shadow-md transition-shadow ${
              (molino.hours_to_oil_change || 0) <= 20 ? 'border-red-200 bg-red-50/30' :
              (molino.hours_to_oil_change || 0) <= 50 ? 'border-amber-200 bg-amber-50/30' : ''
            }`}>
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
                  <span className={`font-medium ${
                    (molino.hours_to_oil_change || 0) <= 20 ? 'text-red-600 font-bold' :
                    (molino.hours_to_oil_change || 0) <= 50 ? 'text-amber-600 font-bold' : ''
                  }`}>{Math.round(molino.hours_to_oil_change || 0)}h</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs text-gray-500 font-bold">Vida Util Aceite</span>
                  <button
                    onClick={() => handleResetOil(molino.id, molino.name)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors uppercase tracking-widest"
                  >
                    Renovar
                  </button>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${molino.hours_to_oil_change! > 50 ? 'bg-emerald-500' : molino.hours_to_oil_change! > 20 ? 'bg-amber-400' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, (molino.hours_to_oil_change! / 500) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <MaintenanceFilters
        search={search}
        setSearch={setSearch}
        filterType={filterType}
        setFilterType={setFilterType}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        selectedMill={selectedMill}
        setSelectedMill={setSelectedMill}
        mills={mills}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        onPrint={handlePrint}
        onGeneratePDF={handleGeneratePDF}
        onSendWhatsApp={handleSendWhatsApp}
        onSendEmail={handleSendEmail}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onQuickDateFilter={handleQuickDateFilter}
      />

      {/* Maintenance Table */}
      <MaintenanceTable
        logs={paginatedLogs}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onView={(record) => detailModal.open(record)}
        onEdit={(record) => handleEditClick(record)}
        onDelete={(id) => {
          const record = maintenanceLogs.find(l => l.id === id);
          if (record) handleDeleteClick(record);
        }}
        onViewHistory={handleViewHistory}
        onFinalize={handleFinalizeMaintenance}
        onDuplicate={handleDuplicateOrder}
      />

      {/* Failure Ranking Analytics */}
      <FailureRanking maintenanceLogs={allMaintenanceLogs} mills={mills} />

      {/* Create Maintenance Modal */}
      <MaintenanceForm
        isOpen={createModal.isOpen}
        onClose={() => {
          createModal.close();
          resetForm();
        }}
        onSubmit={handleCreateRecord}
        formData={formData}
        onChange={handleFormChange}
        mills={mills}
        isLoading={isSubmitting}
        isEditing={false}
        errors={errors}
      />

      {/* Edit Maintenance Modal */}
      <MaintenanceForm
        isOpen={editModal.isOpen}
        onClose={() => {
          editModal.close();
          resetForm();
        }}
        onSubmit={handleUpdateRecord}
        formData={formData}
        onChange={handleFormChange}
        mills={mills}
        isLoading={isSubmitting}
        isEditing={true}
        errors={errors}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleConfirmDelete}
        title="Eliminar Registro de Mantenimiento"
        message={`¿Estás seguro de que deseas eliminar el registro ${deleteModal.data?.id.substring(0, 8)}...? Si el molino está en mantenimiento por esta orden, se liberará automáticamente. Esta acción no se puede deshacer.`}
        variant="danger"
      />

      {/* Detail View Modal (fix #4) */}
      <MaintenanceDetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        record={detailModal.data}
      />

      {/* Finalize Maintenance Modal */}
      <FinalizeMaintenanceModal
        isOpen={finalizeModal.isOpen}
        onClose={finalizeModal.close}
        onConfirm={handleConfirmFinalize}
        record={finalizeModal.data}
        isLoading={isSubmitting}
      />

      {/* Reset Oil Modal */}
      <InputModal
        isOpen={resetOilModal.isOpen}
        onClose={() => setResetOilModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmResetOil}
        title="Reiniciar Vida Útil"
        message={`¿A cuántas horas deseas reiniciar la vida útil del aceite para el ${resetOilModal.millName}? (Por defecto 500)`}
        defaultValue="500"
        type="number"
        min={1}
        icon={Settings}
      />

      {/* Mill History Timeline Modal */}
      <MillHistoryTimeline
        isOpen={historyTimeline.isOpen}
        onClose={() => setHistoryTimeline(prev => ({ ...prev, isOpen: false }))}
        millId={historyTimeline.millId}
        millName={historyTimeline.millName}
      />
    </div>
  );
};

export default Mantenimiento;