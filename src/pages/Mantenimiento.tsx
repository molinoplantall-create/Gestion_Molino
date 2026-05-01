import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Wrench, CheckCircle, Clock, AlertTriangle, Plus, Download, History, Settings, Activity, FileText, MessageSquare, AlertOctagon, Calendar, PenTool, Droplets
} from 'lucide-react';
import { useSupabaseStore } from '@/store/supabaseStore';
import { useAuthStore } from '@/store/authStore';
import { formatNumber } from '@/utils/formatters';
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
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { usePageFocus } from '@/hooks/usePageFocus';
import { InputModal } from '@/components/ui/InputModal';
import { useFormValidation } from '@/hooks/useFormValidation';
import { maintenanceSchema } from '@/schemas/maintenanceSchema';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { MaintenanceSkeleton } from '@/components/mantenimiento/MaintenanceSkeleton';

interface MaintenanceRecord {
  id: string;
  mill_id: string;
  molino_id?: string;
  type: string;
  tipo?: string;
  status: string;
  estado?: string;
  priority?: string;
  prioridad?: string;
  category?: string;
  categoria?: string;
  description: string;
  descripcion?: string;
  action_taken?: string;
  worked_hours?: number;
  technician_name?: string;
  tecnico?: string;
  cost_pen?: number;
  cost_usd?: number;
  tasks_checklist?: any[];
  created_at: string;
  fecha_registro?: string;
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
    tipo: 'PREVENTIVO' as any,
    categoria: '',
    descripcion: '',
    prioridad: 'MEDIA' as any,
    estado: 'PENDIENTE' as any,
    fechaProgramada: new Date().toISOString().split('T')[0],
    horasEstimadas: 4,
    asignadoA: '',
    cost_pen: 0,
    cost_usd: 0,
    tasks_checklist: [],
    action_taken: ''
  });

  // Calculate maintenance counts per mill for Clinical History
  const millMaintenanceStats = useMemo(() => {
    const stats: Record<string, { corrective: number, preventive: number, predictive: number, emergency: number, lastDate: string | null }> = {};

    mills.forEach(m => {
      stats[m.id] = { corrective: 0, preventive: 0, predictive: 0, emergency: 0, lastDate: m.last_maintenance || null };
    });

    allMaintenanceLogs.forEach(log => {
      const mid = log.mill_id || log.molino_id;
      if (stats[mid]) {
        const type = (log.type || log.tipo || '').toUpperCase();
        const desc = (log.description || log.descripcion_falla || '').toLowerCase();
        const action = (log.action_taken || log.accion_tomada || '').toLowerCase();
        
        // Exclude 'ACEITE' (automatic oil change) and legacy oil logs from counts
        const isOilLog = type === 'ACEITE' || 
                         desc.includes('cambio de aceite') || 
                         desc.includes('vida útil') || 
                         desc.includes('aceite') ||
                         action.includes('cambio de aceite');

        if (!isOilLog) {
          if (type === 'CORRECTIVO') stats[mid].corrective++;
          else if (type === 'PREVENTIVO') stats[mid].preventive++;
          else if (type === 'PREDICTIVO') stats[mid].predictive++;
          else if (type === 'EMERGENCIA') stats[mid].emergency++;

          const logDate = log.created_at || log.fecha_registro;
          if (!stats[mid].lastDate || new Date(logDate) > new Date(stats[mid].lastDate)) {
            stats[mid].lastDate = logDate;
          }
        }
      }
    });

    return stats;
  }, [allMaintenanceLogs, mills]);

  const { errors, validate, clearErrors, validateField } = useFormValidation({
    schema: maintenanceSchema
  });

  usePageFocus(() => {
    fetchMills();
    handleApplyFilters(); // This already calls fetchMaintenanceLogs with current state
  });

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
    // Use maintenanceLogsCount as dependency to ensure refresh when new logs are added
    if (lastKpiFetchCount.current === maintenanceLogsCount) return;
    lastKpiFetchCount.current = maintenanceLogsCount;
    
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
            created_at: log.created_at || log.fecha_registro || new Date().toISOString()
          }));
          setAllMaintenanceLogs(normalized);
        }
      } catch (e) {
        console.error('Error fetching all maintenance logs for KPIs:', e);
      }
    };
    fetchAllLogs();
  }, [maintenanceLogsCount]);

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
      tasks_checklist: [],
      action_taken: ''
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
    const success = await useSupabaseStore.getState().registerMaintenance({
      mill_id: formData.molinoId,
      type: formData.tipo as any,
      description: formData.descripcion,
      priority: formData.prioridad as any,
      technician_name: formData.asignadoA,
      worked_hours: formData.horasEstimadas,
      fechaProgramada: formData.fechaProgramada,
      status: formData.estado as any,
      cost_pen: formData.cost_pen || 0,
      cost_usd: formData.cost_usd || 0,
      tasks_checklist: formData.tasks_checklist,
      action_taken: formData.action_taken
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
      tipo: record.type as 'PREVENTIVO' | 'CORRECTIVO' | 'PREDICTIVO' | 'EMERGENCIA',
      categoria: record.category || '',
      descripcion: record.description,
      prioridad: (record.priority as any) || 'MEDIA',
      estado: (record.status as any) || 'PENDIENTE',
      fechaProgramada: record.created_at ? record.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      horasEstimadas: record.worked_hours || 4,
      asignadoA: record.technician_name || '',
      cost_pen: record.cost_pen || 0,
      cost_usd: record.cost_usd || 0,
      tasks_checklist: record.tasks_checklist || [],
      action_taken: record.action_taken || ''
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
      type: formData.tipo as any,
      category: formData.categoria,
      description: formData.descripcion,
      priority: formData.prioridad as any,
      status: formData.estado,
      worked_hours: formData.horasEstimadas,
      technician_name: formData.asignadoA,
      cost_pen: formData.cost_pen,
      cost_usd: formData.cost_usd,
      tasks_checklist: formData.tasks_checklist,
      action_taken: formData.action_taken,
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
      tasks_checklist: (record as any).tasks_checklist || [],
      action_taken: record.action_taken || ''
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
*Molino:* ${(lastLog as any).name || 'Molino'}
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

  if (loading && !maintenanceLogs.length) return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      <MaintenanceSkeleton />
    </div>
  );

  return (
    <div className="p-4 md:px-8 pb-12 space-y-8 bg-slate-50 min-h-screen animate-in fade-in duration-700">
      {/* Page Header — Industrial Strategy Look */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
              <Wrench size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de Mantenimiento</h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-14">
            Industrial Assets Management System v2.1
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetForm();
              createModal.open();
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 active:scale-95 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            NUEVA ORDEN
          </button>
          
          <button 
            onClick={handleExportExcel}
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 group"
            title="Exportar Reporte"
          >
            <Download size={20} className="group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Oil Change Alerts — Glassmorphism Premium */}
      {oilAlertMills.length > 0 && (
        <div className="bg-amber-500/5 backdrop-blur-md rounded-2xl p-6 border border-amber-500/20 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
            <AlertOctagon size={120} className="text-amber-500" />
          </div>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-200 animate-pulse">
              <AlertOctagon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest leading-none">
                Alertas Activas de Mantenimiento
              </h3>
              <p className="text-[10px] font-bold text-amber-700/60 mt-1 uppercase">Renovación de Aceite Requerida</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {oilAlertMills.map(mill => {
              const isCritical = (mill.hours_to_oil_change || 0) <= 20;
              return (
                <div 
                  key={mill.id} 
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.02] ${
                    isCritical 
                      ? 'bg-red-500/10 border-red-500/30 shadow-red-100' 
                      : 'bg-amber-500/10 border-amber-500/30'
                  } shadow-sm`}
                >
                  <div className="flex flex-col gap-1">
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${isCritical ? 'text-red-600' : 'text-amber-700'}`}>
                      Uso Aceite {mill.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${isCritical ? 'bg-red-500 animate-ping' : 'bg-amber-500'}`} />
                      <span className={`text-lg font-black tracking-tight ${isCritical ? 'text-red-700' : 'text-amber-800'}`}>
                        {Math.round(mill.hours_to_oil_change || 0)}h restantes
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResetOil(mill.id, mill.name)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${
                      isCritical 
                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200' 
                        : 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200'
                    }`}
                  >
                    Renovar
                  </button>
                </div>
              );
            })}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {mills.map((molino) => {
            const stat = millMaintenanceStats[molino.id] || { corrective: 0, preventive: 0, predictive: 0, emergency: 0, lastDate: null };
            const isCritical = (molino.hours_to_oil_change || 0) <= 20;
            const isWarning = (molino.hours_to_oil_change || 0) <= 50;

            const statusLabel = molino.status === 'libre' ? 'Disponible' :
              molino.status === 'mantenimiento' ? 'Mantenimiento' :
                'Operando';

            const statusColor = molino.status === 'libre' ? 'text-emerald-600' :
              molino.status === 'mantenimiento' ? 'text-amber-600' :
                'text-indigo-600';

            const statusBg = molino.status === 'libre' ? 'bg-emerald-50' :
              molino.status === 'mantenimiento' ? 'bg-amber-50' :
                'bg-indigo-50';

            return (
              <div key={molino.id} className={`relative bg-white border rounded-2xl p-5 hover:shadow-lg transition-all duration-300 group flex flex-col h-full ${isCritical ? 'border-red-500 bg-red-50/20' : isWarning ? 'border-amber-500 bg-amber-50/20' : 'border-slate-100 shadow-sm'
                }`}>
                {isCritical && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 animate-bounce z-10">
                    ⚠️ ACEITE VENCIDO
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border font-black text-lg transition-transform group-hover:scale-110 ${statusBg} ${statusColor} border-current/10`}>
                      {molino.name?.split(' ')[1] || '01'}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 leading-none">{molino.name}</h4>
                      <div className={`mt-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${statusColor} px-2 py-0.5 rounded-full ${statusBg} w-fit border border-current/10`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${molino.status === 'libre' ? 'bg-emerald-500' : molino.status === 'mantenimiento' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                        {statusLabel}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewHistory(molino.id)}
                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Ver Historial Clínico completo"
                  >
                    <History size={20} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Health Section */}
                <div className="space-y-4 flex-1">
                  {/* Hours Management (Dual Meter) */}
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-4">
                    {/* Meter 1: Oil Cycle (Usage Progress) */}
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Droplets size={12} className={isCritical ? 'text-red-500' : 'text-indigo-500'} />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vida Útil Aceite</span>
                        </div>
                        <span className={`text-[10px] font-black ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-700'}`}>
                          {Math.round(molino.hours_to_oil_change || 0)}h restantes
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full transition-all duration-1000 ${molino.hours_to_oil_change! > 50 ? 'bg-emerald-500' : molino.hours_to_oil_change! > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, ((molino.hours_to_oil_change || 0) / 150) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Meter 2: Master Horometer (Total Hours) */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Activity size={12} className="text-slate-400" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horómetro Maestro</span>
                        </div>
                        <span className="text-xs font-black text-slate-600">
                          {molino.horasTrabajadas || 0}h totales
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                         <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden opacity-50">
                            {/* Visual representation of total wear (e.g., toward a 2000h major service) */}
                            <div className="h-full bg-indigo-400" style={{ width: `${Math.min(100, (molino.horasTrabajadas || 0) % 1000 / 10)}%` }}></div>
                         </div>
                         <button
                           onClick={() => handleResetOil(molino.id, molino.name)}
                           className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all shadow-sm active:scale-95 ${
                                isCritical ? 'bg-red-600 text-white border-red-600 shadow-red-100' : 'bg-white text-indigo-600 border-indigo-100 hover:border-indigo-600 hover:bg-indigo-50'
                           }`}
                         >
                           Renovar Aceite
                         </button>
                      </div>
                    </div>
                  </div>


                  {/* Clinical History Summary */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 flex flex-col items-center">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Preventivos</span>
                        <span className="text-lg font-black text-indigo-700">{stat.preventive}</span>
                    </div>
                    <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 flex flex-col items-center">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-tighter">Correctivos</span>
                        <span className="text-lg font-black text-amber-700">{stat.corrective}</span>
                    </div>
                    <div className="bg-violet-50/50 p-2.5 rounded-xl border border-violet-100 flex flex-col items-center">
                        <span className="text-[10px] font-black text-violet-400 uppercase tracking-tighter">Predictivos</span>
                        <span className="text-lg font-black text-violet-700">{stat.predictive}</span>
                    </div>
                    <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100 flex flex-col items-center">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Emergencias</span>
                        <span className="text-lg font-black text-red-700">{stat.emergency}</span>
                    </div>
                  </div>

                  {/* Last Maintenance Date */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Último Manto:</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-600">
                        {stat.lastDate ? fmtDate(stat.lastDate) : 'S/R'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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
        message={`¿A cuántas horas deseas reiniciar la vida útil del aceite para el ${resetOilModal.millName}? (Estándar 150h)`}
        defaultValue="150"
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