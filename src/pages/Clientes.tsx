import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, MessageSquare, CheckCircle, AlertTriangle, Layers
} from 'lucide-react';
import { useSupabaseStore } from '@/store/supabaseStore';
import { supabase } from '@/lib/supabase';
import { useModal } from '@/hooks/useModal';
import { useToast } from '@/hooks/useToast';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { ClientForm } from '@/components/clientes/ClientForm';
import { ClientTable } from '@/components/clientes/ClientTable';
import { ClientFilters } from '@/components/clientes/ClientFilters';
import { useFormValidation } from '@/hooks/useFormValidation';
import { clientSchema } from '@/schemas/clientSchema';

const Clientes: React.FC = () => {
  const { clients, zones, loading, fetchClients, fetchZones, addZone, updateClient, deleteClient } = useSupabaseStore();
  const toast = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterZone, setFilterZone] = useState('all');

  // Modals
  const createModal = useModal();
  const editModal = useModal<any>();
  const deleteModal = useModal<any>();

  // Zone management
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    ruc: '',
    direccion: '',
    zona: '',
    tipoCliente: '',
    observaciones: ''
  });

  const { errors, validate, clearErrors, validateField } = useFormValidation({
    schema: clientSchema
  });

  useEffect(() => {
    fetchClients();
    fetchZones();
  }, [fetchClients, fetchZones]);

  // KPIs
  const totalClientes = clients.length;
  const clientesActivos = clients.filter(c => c.is_active).length;
  const stockBajo = clients.filter(c => (c.stock_cuarzo || 0) < 100).length;
  const totalZonas = new Set(clients.map(c => c.zone).filter(Boolean)).size;

  // Filtered clients
  const filteredClients = clients.filter(client => {
    const lowerCaseSearch = search.toLowerCase();
    const matchesSearch = (client.name || '').toLowerCase().includes(lowerCaseSearch) ||
      (client.contact_name || '').toLowerCase().includes(lowerCaseSearch) ||
      (client.phone || '').toLowerCase().includes(lowerCaseSearch);
    const matchesStatus = filterStatus === 'all' || (client.is_active === true ? 'ACTIVO' : 'INACTIVO') === filterStatus;
    const matchesZone = filterZone === 'all' || client.zone === filterZone;
    return matchesSearch && matchesStatus && matchesZone;
  });

  // Handlers
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
    // Real-time validation
    validateField(name, value);
  };

  const resetForm = () => {
    setFormData({
      nombre: '', contacto: '', telefono: '', email: '', ruc: '',
      direccion: '', zona: '', tipoCliente: '', observaciones: ''
    });
    clearErrors();
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim()) return;
    const success = await addZone(newZoneName.trim());
    if (success) {
      setNewZoneName('');
      setIsAddingZone(false);
      toast.success('Zona agregada', `La zona "${newZoneName}" fue creada exitosamente`);
    } else {
      toast.error('Error', 'No se pudo agregar la zona. Podría ya existir.');
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zod validation
    const isValid = await validate(formData);
    if (!isValid) {
      toast.warning('Validación fallida', 'Por favor revise los errores en el formulario');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('clients').insert({
        name: formData.nombre,
        contact_name: formData.contacto,
        phone: formData.telefono,
        email: formData.email,
        ruc_dni: formData.ruc,
        address: formData.direccion,
        zone: formData.zona,
        client_type: formData.tipoCliente,
        observations: formData.observaciones,
        is_active: true
      });

      if (error) throw error;

      toast.success('Cliente Registrado', `El cliente ${formData.nombre} ha sido registrado exitosamente.`);
      fetchClients();
      createModal.close();
      resetForm();
    } catch (error: any) {
      toast.error('Error', 'No se pudo registrar el cliente: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (client: any) => {
    setFormData({
      nombre: client.name || '',
      contacto: client.contact_name || '',
      telefono: client.phone || '',
      email: client.email || '',
      ruc: client.ruc_dni || '',
      direccion: client.address || '',
      zona: client.zone || '',
      tipoCliente: client.client_type || '',
      observaciones: client.observations || ''
    });
    editModal.open(client);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zod validation
    const isValid = await validate(formData);
    if (!isValid) {
      toast.warning('Validación fallida', 'Por favor revise los errores en el formulario');
      return;
    }

    if (!editModal.data?.id) return;

    setIsSubmitting(true);
    try {
      const success = await updateClient(editModal.data.id, {
        name: formData.nombre,
        contact_name: formData.contacto,
        phone: formData.telefono,
        email: formData.email,
        ruc_dni: formData.ruc,
        address: formData.direccion,
        zone: formData.zona,
        client_type: formData.tipoCliente,
        observations: formData.observaciones
      });

      if (!success) throw new Error('Error al actualizar');

      toast.success('Cliente Actualizado', `El cliente ${formData.nombre} ha sido actualizado exitosamente.`);
      editModal.close();
      resetForm();
    } catch (error: any) {
      toast.error('Error', 'No se pudo actualizar el cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (client: any) => {
    deleteModal.open(client);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.data?.id) return;

    const success = await deleteClient(deleteModal.data.id);
    if (success) {
      toast.success('Cliente Eliminado', 'El cliente ha sido marcado como inactivo.');
      deleteModal.close();
    } else {
      toast.error('Error', 'No se pudo eliminar el cliente.');
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterZone('all');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
          <p className="text-gray-600 mt-1">Administración de clientes y stock</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            className="btn-primary flex items-center"
            onClick={() => {
              resetForm();
              createModal.open();
            }}
          >
            <UserPlus size={18} className="mr-2" />
            Nuevo Cliente
          </button>
          <button className="btn-secondary flex items-center">
            <MessageSquare size={18} className="mr-2" />
            Contactar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-xl mr-4 border border-blue-100">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Clientes</p>
              <p className="text-2xl font-bold text-gray-900">{totalClientes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-emerald-50 rounded-xl mr-4 border border-emerald-100">
              <CheckCircle className="text-emerald-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Activos</p>
              <p className="text-2xl font-bold text-gray-900">{clientesActivos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-amber-50 rounded-xl mr-4 border border-amber-100">
              <AlertTriangle className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Stock Bajo</p>
              <p className="text-2xl font-bold text-gray-900">{stockBajo}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-xl mr-4 border border-purple-100">
              <Layers className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Zonas</p>
              <p className="text-2xl font-bold text-gray-900">{totalZonas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ClientFilters
        search={search}
        setSearch={setSearch}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterZone={filterZone}
        setFilterZone={setFilterZone}
        zones={zones}
        onClear={handleClearFilters}
      />

      {/* Clients Table */}
      <ClientTable
        clients={filteredClients}
        loading={loading}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {/* Add Client CTA */}
      <div className="flex justify-center mt-8">
        <button
          className="border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-2xl p-8 w-full max-w-md flex flex-col items-center justify-center transition-all group"
          onClick={() => {
            resetForm();
            createModal.open();
          }}
        >
          <div className="w-16 h-16 bg-slate-50 group-hover:bg-indigo-100 rounded-full flex items-center justify-center mb-4 transition-colors">
            <UserPlus className="text-slate-400 group-hover:text-indigo-600" size={32} />
          </div>
          <span className="text-lg font-bold text-slate-700 group-hover:text-indigo-900">Agregar nuevo cliente</span>
          <span className="text-sm text-slate-500 mt-1">Registre un nuevo cliente en el sistema</span>
        </button>
      </div>

      {/* Create Client Modal */}
      <ClientForm
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={() => handleCreateClient({ preventDefault: () => { } } as any)}
        formData={formData}
        onChange={handleFormChange}
        zones={zones}
        isLoading={isSubmitting}
        isEditing={false}
        onAddZone={handleAddZone}
        isAddingZone={isAddingZone}
        newZoneName={newZoneName}
        onNewZoneNameChange={setNewZoneName}
        onToggleAddZone={() => setIsAddingZone(!isAddingZone)}
        errors={errors}
      />

      {/* Edit Client Modal */}
      <ClientForm
        isOpen={editModal.isOpen}
        onClose={() => {
          editModal.close();
          resetForm();
        }}
        onSubmit={() => handleUpdateClient({ preventDefault: () => { } } as any)}
        formData={formData}
        onChange={handleFormChange}
        zones={zones}
        isLoading={isSubmitting}
        isEditing={true}
        errors={errors}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleConfirmDelete}
        itemName={deleteModal.data?.name || ''}
        message="Esta acción marcará al cliente como inactivo."
      />
    </div>
  );
};

export default Clientes;
