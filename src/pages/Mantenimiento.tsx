import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench, CheckCircle, Clock, AlertTriangle, Plus, Download, History, Settings, Activity, FileText, MessageSquare
} from 'lucide-react';
import { useSupabaseStore } from '@/store/supabaseStore';
import { useModal } from '@/hooks/useModal';
import { useToast } from '@/hooks/useToast';
import { MaintenanceForm } from '@/components/mantenimiento/MaintenanceForm';
import { MaintenanceTable } from '@/components/mantenimiento/MaintenanceTable';
import { MaintenanceFilters } from '@/components/mantenimiento/MaintenanceFilters';
import { KpiIndicators } from '@/components/mantenimiento/KpiIndicators';
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
  mills?: {
    name: string;
  };
}

const Mantenimiento: React.FC = () => {
  const { mills, maintenanceLogs, fetchMills, fetchMaintenanceLogs, registerMaintenance, resetMillOil, loading } = useSupabaseStore();
  const toast = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMill, setSelectedMill] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Modals
  const createModal = useModal();
  const editModal = useModal<MaintenanceRecord>();
  const deleteModal = useModal<MaintenanceRecord>();
  const historyModal = useModal<any>();
  const [resetOilModal, setResetOilModal] = useState<{ isOpen: boolean, millId: string, millName: string }>({ isOpen: false, millId: '', millName: '' });

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  // All maintenance logs for KPI calculation (unfiltered)
  const [allMaintenanceLogs, setAllMaintenanceLogs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    molinoId: '',
    tipo: 'PREVENTIVO' as const,
    categoria: '',
    descripcion: '',
    prioridad: 'MEDIA' as const,
    estado: 'PENDIENTE' as const,
    fechaProgramada: new Date().toISOString().split('T')[0],
    horasEstimadas: 4,
    asignadoA: ''
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
      search,
      type: filterType,
      status: filterStatus,
      millId: selectedMill,
      startDate,
      endDate
    });
  }, [fetchMaintenanceLogs, currentPage, search, filterType, filterStatus, selectedMill, startDate, endDate]);

  // Fetch ALL logs (without filters/pagination) for KPI calculation
  useEffect(() => {
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
  }, [maintenanceLogs.length]); // re-fetch when filtered logs change (new records added)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, filterStatus, selectedMill, startDate, endDate]);

  const totalPages = Math.ceil(maintenanceLogs.length / recordsPerPage); // This should probably use a count from store if we had one
  const paginatedLogs = maintenanceLogs; // Store already paginates

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
      asignadoA: ''
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
      status: formData.estado
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
      fechaProgramada: record.created_at,
      horasEstimadas: record.worked_hours || 4,
      asignadoA: record.technician_name || ''
    });
    editModal.open(record);
  };

  const handleUpdateRecord = async () => {
    // Basic validation
    const isValid = await validate(formData);
    if (!isValid) {
      toast.warning('Validación fallida', 'Por favor revise los errores en el formulario');
      return;
    }

    if (!editModal.data) return;

    setIsSubmitting(true);

    // We update the record via supabaseStore directly
    const { error } = await useSupabaseStore.getState().updateMaintenanceLog(editModal.data.id, {
      mill_id: formData.molinoId,
      type: formData.tipo,
      category: formData.categoria,
      description: formData.descripcion,
      priority: formData.prioridad,
      status: formData.estado,
      worked_hours: formData.horasEstimadas,
      technician_name: formData.asignadoA,
      created_at: formData.fechaProgramada ? new Date(formData.fechaProgramada).toISOString() : new Date().toISOString()
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

  const handleConfirmDelete = async () => {
    if (!deleteModal.data) return;

    // TODO: Implement delete logic
    console.log('Eliminando registro:', deleteModal.data.id);
    toast.success('Eliminado', 'El registro ha sido eliminado exitosamente.');
    deleteModal.close();
  };

  const handleViewHistory = (molinoId: string) => {
    setSelectedMill(molinoId);
    toast.info('Filtrando Historial', `Mostrando mantenimientos para el molino seleccionado`);

    // Opcional: Desplazarse a la tabla para ver los resultados
    const tableElement = document.querySelector('.overflow-x-auto');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExportExcel = () => {
    if (maintenanceLogs.length === 0) {
      toast.error('Error', 'No hay datos para exportar');
      return;
    }

    const dataToExport = maintenanceLogs.map(log => ({
      Fecha: new Date(log.created_at).toLocaleDateString(),
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

    toast.success('Éxito', 'Archivo Excel generado correctamente');
  };

  const handleGeneratePDF = () => {
    if (maintenanceLogs.length === 0) {
      toast.error('Error', 'No hay datos para imprimir');
      return;
    }

    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('REPORTE DE MANTENIMIENTO INDUSTRIAL', 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });

    // Table
    const tableColumn = ["Fecha", "Molino", "Tipo", "Descripción", "Técnico", "Estado"];
    const tableRows = maintenanceLogs.map(log => [
      new Date(log.created_at).toLocaleDateString(),
      log.name,
      log.type,
      log.description,
      log.technician_name || 'N/A',
      log.status
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { cellWidth: 50 }, // Description column wider
      }
    });

    doc.save(`Reporte_Mantenimiento_${new Date().getTime()}.pdf`);
    toast.success('Éxito', 'Documento PDF generado correctamente');
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
*Fecha:* ${new Date(lastLog.created_at).toLocaleDateString()}
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

  const handleFinalizeMaintenance = async (id: string, millId: string) => {
    if (confirm('¿Está seguro de finalizar este mantenimiento y liberar el molino?')) {
      const success = await useSupabaseStore.getState().finalizeMaintenance(id, millId);
      if (success) {
        toast.success('¡Limpieza Finalizada!', 'El molino ha vuelto a estado LIBRE y el log se marcó como COMPLETADO.');
      }
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
      />

      {/* Maintenance Table */}
      <MaintenanceTable
        logs={paginatedLogs}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onView={(record) => toast.info('Ver Detalle', 'Función en desarrollo')}
        onEdit={(record) => handleEditClick(record)}
        onDelete={(id) => {
          const record = maintenanceLogs.find(l => l.id === id);
          if (record) handleDeleteClick(record);
        }}
        onViewHistory={handleViewHistory}
        onFinalize={handleFinalizeMaintenance}
      />

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
        title="Eliminar Registro"
        message={`¿Estás seguro de que deseas eliminar el registro ${deleteModal.data?.id.substring(0, 8)}...? Esta acción no se puede deshacer.`}
        variant="danger"
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
    </div>
  );
};

export default Mantenimiento;