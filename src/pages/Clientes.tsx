import React, { useState, useEffect } from 'react';
import {
  Users, Phone, Mail, Package, TrendingUp, Search, Filter,
  UserPlus, MessageSquare, X, Save, MapPin, Building,
  Calendar, User as UserIcon, FileText, DollarSign,
  CheckCircle, AlertTriangle, Layers, RefreshCw,
  Edit, Trash2, Eye, MoreVertical
} from 'lucide-react';
import { useSupabaseStore } from '@/store/supabaseStore';
import { supabase } from '@/lib/supabase';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { Loader2 } from 'lucide-react';

const Clientes: React.FC = () => {
  const { clients, zones, loading, fetchClients, fetchZones, addZone, updateClient, deleteClient } = useSupabaseStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackInfo, setFeedbackInfo] = useState({ title: '', message: '', type: 'success' as any });
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    ruc: '',
    direccion: '',
    zona: '',
    tipoCliente: '',
    stockCuarzo: 0,
    stockLlampo: 0,
    tipoMineral: '',
    observaciones: ''
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

  const filteredClients = clients.filter(client => {
    const lowerCaseSearch = search.toLowerCase();
    const matchesSearch = (client.name || '').toLowerCase().includes(lowerCaseSearch) ||
      (client.contact_name || '').toLowerCase().includes(lowerCaseSearch) ||
      (client.phone || '').toLowerCase().includes(lowerCaseSearch);
    const matchesStatus = filterStatus === 'all' || (client.is_active === true ? 'ACTIVO' : 'INACTIVO') === filterStatus;
    const matchesZone = filterZone === 'all' || client.zone === filterZone;
    return matchesSearch && matchesStatus && matchesZone;
  });

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold rounded-full flex items-center w-fit">Activo</span>
    ) : (
      <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 text-xs font-semibold rounded-full flex items-center w-fit">Inactivo</span>
    );
  };

  const getZoneBadge = (zona: string) => {
    const defaultColors = 'bg-gray-100 text-gray-800';
    const zoneColors: Record<string, string> = {
      'Norte': 'bg-blue-100 text-blue-800',
      'Sur': 'bg-green-100 text-green-800',
      'Centro': 'bg-purple-100 text-purple-800',
      'Este': 'bg-orange-100 text-orange-800',
      'Oeste': 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${zoneColors[zona] || defaultColors}`}>
        {zona || 'N/A'}
      </span>
    );
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim()) return;
    const success = await addZone(newZoneName.trim());
    if (success) {
      setNewZoneName('');
      setIsAddingZone(false);
    } else {
      alert('Error al agregar la zona. Podría ya existir.');
    }
  };

  // ... rest of helper functions ...

  const handleNuevoClienteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setNuevoCliente(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmitNuevoCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCliente.nombre || !nuevoCliente.zona || !nuevoCliente.tipoCliente) {
      setFeedbackInfo({
        title: 'Campos requeridos',
        message: 'Por favor complete todos los campos obligatorios (*)',
        type: 'warning'
      });
      setShowFeedbackModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('clients').insert({
        name: nuevoCliente.nombre,
        contact_name: nuevoCliente.contacto,
        phone: nuevoCliente.telefono,
        email: nuevoCliente.email,
        ruc_dni: nuevoCliente.ruc,
        address: nuevoCliente.direccion,
        zone: nuevoCliente.zona,
        client_type: nuevoCliente.tipoCliente,
        observations: nuevoCliente.observaciones,
        is_active: true
      });

      if (error) throw error;

      setFeedbackInfo({
        title: 'Cliente Registrado',
        message: `El cliente ${nuevoCliente.nombre} ha sido registrado exitosamente.`,
        type: 'success'
      });
      setShowFeedbackModal(true);
      fetchClients();
      setShowNuevoClienteModal(false);

      setNuevoCliente({
        nombre: '', contacto: '', telefono: '', email: '', ruc: '',
        direccion: '', zona: '', tipoCliente: '', stockCuarzo: 0, stockLlampo: 0,
        tipoMineral: '', observaciones: ''
      });
    } catch (error: any) {
      setFeedbackInfo({
        title: 'Error',
        message: 'No se pudo registrar el cliente: ' + error.message,
        type: 'danger'
      });
      setShowFeedbackModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (client: any) => {
    setEditingClientId(client.id);
    setNuevoCliente({
      nombre: client.name || '',
      contacto: client.contact_name || '',
      telefono: client.phone || '',
      email: client.email || '',
      ruc: client.ruc_dni || '',
      direccion: client.address || '',
      zona: client.zone || '',
      tipoCliente: client.client_type || '',
      stockCuarzo: client.stock_cuarzo || 0,
      stockLlampo: client.stock_llampo || 0,
      tipoMineral: '',
      observaciones: client.observations || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCliente.nombre || !nuevoCliente.zona || !nuevoCliente.tipoCliente) {
      setFeedbackInfo({
        title: 'Campos requeridos',
        message: 'Por favor complete todos los campos obligatorios (*)',
        type: 'warning'
      });
      setShowFeedbackModal(true);
      return;
    }

    if (!editingClientId) return;

    setIsSubmitting(true);
    try {
      const success = await updateClient(editingClientId, {
        name: nuevoCliente.nombre,
        contact_name: nuevoCliente.contacto,
        phone: nuevoCliente.telefono,
        email: nuevoCliente.email,
        ruc_dni: nuevoCliente.ruc,
        address: nuevoCliente.direccion,
        zone: nuevoCliente.zona,
        client_type: nuevoCliente.tipoCliente,
        observations: nuevoCliente.observaciones
      });

      if (!success) throw new Error('Error al actualizar');

      setFeedbackInfo({
        title: 'Cliente Actualizado',
        message: `El cliente ${nuevoCliente.nombre} ha sido actualizado exitosamente.`,
        type: 'success'
      });
      setShowFeedbackModal(true);
      setShowEditModal(false);
      setEditingClientId(null);
    } catch (error: any) {
      setFeedbackInfo({
        title: 'Error',
        message: 'No se pudo actualizar el cliente.',
        type: 'danger'
      });
      setShowFeedbackModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (client: any) => {
    setFeedbackInfo({
      title: 'Confirmar eliminación',
      message: `¿Está seguro que desea eliminar al cliente ${client.name}? Esta acción marcará al cliente como inactivo.`,
      type: 'warning'
    });
    setEditingClientId(client.id);
    setShowFeedbackModal(true);
    // Overriding feedback modal to be a confirmation
    setFeedbackInfo(prev => ({
      ...prev,
      confirmAction: async () => {
        const success = await deleteClient(client.id);
        if (success) {
          setFeedbackInfo({
            title: 'Cliente Eliminado',
            message: 'El cliente ha sido eliminado exitosamente.',
            type: 'success'
          });
        }
      }
    }));
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
            onClick={() => setShowNuevoClienteModal(true)}
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
      <div className="bg-white rounded-2xl p-6 border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por cliente o contacto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
          </div>

          <div>
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="input-field"
            >
              <option value="all">Todas las zonas</option>
              {zones.map(z => (
                <option key={z.id} value={z.name}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSearch('');
                setFilterStatus('all');
                setFilterZone('all');
              }}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw size={18} className="mr-2" />
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Zona</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 mr-3 group-hover:bg-white transition-colors">
                        <Users className="text-indigo-600" size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{client.name}</p>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-tighter mt-0.5">{client.client_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">{client.contact_name || 'N/A'}</span>
                      <div className="flex items-center text-xs text-gray-400 mt-1">
                        <Phone size={12} className="mr-1" />
                        {client.phone || 'S/T'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getZoneBadge(client.zone || '')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      {getStatusBadge(client.is_active)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditClick(client)}
                        className="p-2 text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(client)}
                        className="p-2 text-rose-600 hover:bg-white border border-transparent hover:border-rose-100 rounded-lg transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <div className="py-20 text-center bg-gray-50">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay clientes</h3>
            <p className="mt-1 text-sm text-gray-500">
              No se encontraron clientes que coincidan con los filtros.
            </p>
          </div>
        )}
      </div>

      {/* Add Client CTA */}
      <div className="flex justify-center mt-8">
        <button
          className="border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-2xl p-8 w-full max-w-md flex flex-col items-center justify-center transition-all group"
          onClick={() => setShowNuevoClienteModal(true)}
        >
          <div className="w-16 h-16 bg-slate-50 group-hover:bg-indigo-100 rounded-full flex items-center justify-center mb-4 transition-colors">
            <UserPlus className="text-slate-400 group-hover:text-indigo-600" size={32} />
          </div>
          <span className="text-lg font-bold text-slate-700 group-hover:text-indigo-900">Agregar nuevo cliente</span>
          <span className="text-sm text-slate-500 mt-1">Registre un nuevo cliente en el sistema</span>
        </button>
      </div>

      {/* Nuevo Cliente Modal */}
      {showNuevoClienteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-slate-50">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <UserPlus className="mr-3 text-indigo-600" size={28} />
                Registro de Nuevo Cliente
              </h2>
              <button
                onClick={() => setShowNuevoClienteModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitNuevoCliente}>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre/Razón Social *</label>
                    <input
                      type="text"
                      name="nombre"
                      value={nuevoCliente.nombre}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      placeholder="Ej: Minera Andina SA"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">RUC</label>
                    <input
                      type="text"
                      name="ruc"
                      value={nuevoCliente.ruc}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      placeholder="Ej: 20123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contacto Principal</label>
                    <input
                      type="text"
                      name="contacto"
                      value={nuevoCliente.contacto}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      placeholder="Ej: Juan Rodríguez"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={nuevoCliente.telefono}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      placeholder="Ej: 987654321"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={nuevoCliente.email}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                    <input
                      type="text"
                      name="direccion"
                      value={nuevoCliente.direccion}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      placeholder="Dirección del cliente..."
                    />
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex justify-between">
                      <span>Zona *</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingZone(!isAddingZone)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {isAddingZone ? 'Cancelar' : '+ Nueva Zona'}
                      </button>
                    </label>
                    {!isAddingZone ? (
                      <select
                        name="zona"
                        value={nuevoCliente.zona}
                        onChange={handleNuevoClienteChange}
                        className="input-field"
                        required
                      >
                        <option value="">Seleccionar zona</option>
                        {zones.map(z => (
                          <option key={z.id} value={z.name}>{z.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newZoneName}
                          onChange={(e) => setNewZoneName(e.target.value)}
                          placeholder="Nombre de zona"
                          className="input-field flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleAddZone}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold"
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Cliente *</label>
                    <select
                      name="tipoCliente"
                      value={nuevoCliente.tipoCliente}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      required
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="MINERO">Minero</option>
                      <option value="PALLAQUERO">Pallaquero</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
                  <textarea
                    name="observaciones"
                    value={nuevoCliente.observaciones}
                    onChange={handleNuevoClienteChange}
                    className="input-field min-h-[80px]"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-gray-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNuevoClienteModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex items-center"
                >
                  {isSubmitting && <Loader2 size={18} className="mr-2 animate-spin" />}
                  {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Cliente Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-slate-50">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Edit className="mr-3 text-indigo-600" size={28} />
                Editar Cliente
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingClientId(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateCliente}>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre/Razón Social *</label>
                    <input
                      type="text"
                      name="nombre"
                      value={nuevoCliente.nombre}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      placeholder="Ej: Minera Andina SA"
                      required
                    />
                  </div>
                  {/* ... other fields identical to registration ... */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">RUC</label>
                    <input
                      type="text"
                      name="ruc"
                      value={nuevoCliente.ruc}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contacto Principal</label>
                    <input
                      type="text"
                      name="contacto"
                      value={nuevoCliente.contacto}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={nuevoCliente.telefono}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={nuevoCliente.email}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                    <input
                      type="text"
                      name="direccion"
                      value={nuevoCliente.direccion}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Zona *</label>
                    <select
                      name="zona"
                      value={nuevoCliente.zona}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      required
                    >
                      <option value="">Seleccionar zona</option>
                      {zones.map(z => (
                        <option key={z.id} value={z.name}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Cliente *</label>
                    <select
                      name="tipoCliente"
                      value={nuevoCliente.tipoCliente}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      required
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="MINERO">Minero</option>
                      <option value="PALLAQUERO">Pallaquero</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
                  <textarea
                    name="observaciones"
                    value={nuevoCliente.observaciones}
                    onChange={handleNuevoClienteChange}
                    className="input-field min-h-[80px]"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-gray-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex items-center"
                >
                  {isSubmitting && <Loader2 size={18} className="mr-2 animate-spin" />}
                  {isSubmitting ? 'Actualizando...' : 'Actualizar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <ConfirmationModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onConfirm={() => setShowFeedbackModal(false)}
        title={feedbackInfo.title}
        message={feedbackInfo.message}
        type={feedbackInfo.type}
        confirmText="Entendido"
        showCancel={false}
        icon={feedbackInfo.type === 'success' ? 'success' : 'alert'}
      />
    </div>
  );
};

export default Clientes;
