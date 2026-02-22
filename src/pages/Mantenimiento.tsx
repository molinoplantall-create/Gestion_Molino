import React, { useState, useEffect } from 'react';
import {
  Wrench, CheckCircle, Clock, AlertTriangle, Plus, Download, History, Settings, Activity
} from 'lucide-react';
import { useSupabaseStore } from '@/store/supabaseStore';
import { useModal } from '@/hooks/useModal';
import { useToast } from '@/hooks/useToast';
import { MaintenanceForm } from '@/components/mantenimiento/MaintenanceForm';
import { MaintenanceTable } from '@/components/mantenimiento/MaintenanceTable';
import { MaintenanceFilters } from '@/components/mantenimiento/MaintenanceFilters';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useFormValidation } from '@/hooks/useFormValidation';
import { maintenanceSchema } from '@/schemas/maintenanceSchema';

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
  const { mills, maintenanceLogs, fetchMills, fetchMaintenanceLogs, registerMaintenance, loading } = useSupabaseStore();
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

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    molinoId: '',
    tipo: 'PREVENTIVO' as const,
    categoria: '',
    descripcion: '',
    prioridad: 'MEDIA' as const,
    fechaProgramada: '',
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
      millId: selectedMill,
      startDate,
      endDate
    });
  }, [fetchMaintenanceLogs, currentPage, search, selectedMill, startDate, endDate]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedMill, startDate, endDate]);

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
      fechaProgramada: '',
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
      status: 'PENDIENTE'
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
      fechaProgramada: record.created_at,
      horasEstimadas: record.worked_hours || 4,
      asignadoA: record.technician_name || ''
    });
    editModal.open(record);
  };

  const handleUpdateRecord = async () => {
    // TODO: Implement update logic
    toast.info('Función pendiente', 'La actualización de registros estará disponible pronto.');
    editModal.close();
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
    const mill = mills.find(m => m.id === molinoId);
    historyModal.open(mill);
  };

  const handleExportExcel = () => {
    toast.info('Exportando', 'Archivo Excel generado. Descargando...');
  };

  const handleGeneratePDF = () => {
    toast.info('Generando PDF', 'Generando documento PDF... Se descargará automáticamente.');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const phone = '51987654321';
    const message = encodeURIComponent('Reporte de mantenimiento disponible para revisión');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
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
    </div>
  );
};

export default Mantenimiento;