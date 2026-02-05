import React, { useState, useEffect } from 'react';
import {
  Users, Phone, Mail, Package, TrendingUp, Search, Filter,
  UserPlus, MessageSquare, X, Save, MapPin, Building,
  Calendar, User as UserIcon, FileText, DollarSign,
  CheckCircle, AlertTriangle, Layers, RefreshCw
} from 'lucide-react';
import { useSupabaseStore } from '@/store/supabaseStore';
import { supabase } from '@/lib/supabase';

const Clientes: React.FC = () => {
  const { clients, zones, loading, fetchClients, fetchZones, addZone } = useSupabaseStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);
  const [isAddingZone, setIsAddingZone] = useState(false);
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
    stockInicial: 0,
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
    if (!nuevoCliente.nombre) {
      alert('Por favor complete el nombre del cliente');
      return;
    }

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
        stock_cuarzo: nuevoCliente.stockInicial, // Assuming initial stock is cuarzo for now or needs split
        observations: nuevoCliente.observaciones,
        is_active: true
      });

      if (error) throw error;

      alert(`Cliente ${nuevoCliente.nombre} registrado exitosamente!`);
      fetchClients();
      setShowNuevoClienteModal(false);

      setNuevoCliente({
        nombre: '', contacto: '', telefono: '', email: '', ruc: '',
        direccion: '', zona: '', tipoCliente: '', stockInicial: 0,
        tipoMineral: '', observaciones: ''
      });
    } catch (error: any) {
      alert('Error al registrar cliente: ' + error.message);
    }
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

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white rounded-2xl border overflow-hidden card-hover shadow-sm">
            {/* Client Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                    <Users className="text-indigo-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-bold text-gray-900 line-clamp-1">{client.name}</h3>
                    <div className="flex items-center mt-1">
                      {getStatusBadge(client.is_active)}
                      <span className="ml-2">{getZoneBadge(client.zone || '')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Details */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Contact Info */}
                <div>
                  <div className="flex items-center text-gray-400 mb-2">
                    <UserIcon size={18} className="mr-2" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Información del Cliente</span>
                  </div>
                  <p className="font-medium text-gray-900">{client.contact_name || 'N/A'}</p>
                </div>

                {/* Contact Methods */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Phone size={16} className="text-gray-400 mr-3" />
                    <span className="text-gray-700">{client.phone || 'S/T'}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail size={16} className="text-gray-400 mr-3" />
                    <span className="text-gray-700 font-medium text-sm truncate">{client.email || 'S/E'}</span>
                  </div>
                </div>

                {/* Stock Info */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Stock Cuarzo</div>
                      <div className="text-2xl font-bold text-gray-900">{(client.stock_cuarzo || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Stock Llampo</div>
                      <div className="text-2xl font-bold text-gray-900">{(client.stock_llampo || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Stock Progress */}
                  <div>
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Nivel de stock</span>
                      <span>{(client.stock_cuarzo || 0) > 100 ? 'Normal' : 'Bajo'}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${(client.stock_cuarzo || 0) > 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, ((client.stock_cuarzo || 0) / 1000) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Registered Date */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-600">Registrado el</div>
                  <div className="font-medium text-gray-900">
                    {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No hay clientes registrados aún
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
                  <div>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contacto Principal *</label>
                    <input
                      type="text"
                      name="contacto"
                      value={nuevoCliente.contacto}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      placeholder="Ej: Juan Rodríguez"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono *</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={nuevoCliente.telefono}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      placeholder="Ej: +51 987 654 321"
                      required
                    />
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex justify-between">
                      <span>Zona</span>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Cliente</label>
                    <select
                      name="tipoCliente"
                      value={nuevoCliente.tipoCliente}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="MINERO">Minero</option>
                      <option value="PALLAQUERO">Pallaquero</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Inicial (Sacos)</label>
                    <input
                      type="number"
                      name="stockInicial"
                      value={nuevoCliente.stockInicial}
                      onChange={handleNuevoClienteChange}
                      className="input-field"
                      placeholder="0"
                    />
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
                  className="btn-primary"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
