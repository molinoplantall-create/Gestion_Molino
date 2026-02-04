import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Package,
  Download,
  Truck,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import {
  TIPO_CLIENTE,
  MINERAL_TYPES_STOCK,
  SUBMINERAL_TYPES_STOCK
} from '../constants';
import { useAuthStore } from '../store/authStore';
import { useSupabaseStore } from '../store/supabaseStore';

const Stock: React.FC = () => {
  const { user } = useAuthStore();
  const { clients, loading, fetchClients, addClientStock } = useSupabaseStore();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Estado para nuevo ingreso
  const [nuevoIngreso, setNuevoIngreso] = useState({
    fechaRecepcion: new Date().toISOString().slice(0, 10),
    tipoCliente: '',
    clienteId: '',
    zona: '',
    mineral: '',
    cuarzo: 0,
    llampo: 0,
    total: 0,
    clienteNombre: '',
    transportista: '',
    placaCamion: '',
    observaciones: ''
  });

  // Calcular total automáticamente
  useEffect(() => {
    const total = (nuevoIngreso.cuarzo || 0) + (nuevoIngreso.llampo || 0);
    setNuevoIngreso(prev => ({ ...prev, total }));
  }, [nuevoIngreso.cuarzo, nuevoIngreso.llampo]);

  // Filtrar clientes para mostrar en la lista
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.zone?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesTipo = filterTipo === 'all' || c.client_type === filterTipo;
    return matchesSearch && matchesTipo;
  });

  // Totales globales basados en la DB
  const totalStock = clients.reduce((sum, c) => sum + (c.stock_cuarzo || 0) + (c.stock_llampo || 0), 0);
  const totalCuarzo = clients.reduce((sum, c) => sum + (c.stock_cuarzo || 0), 0);
  const totalLlampo = clients.reduce((sum, c) => sum + (c.stock_llampo || 0), 0);

  // Abrir modal para nuevo ingreso
  const abrirModalNuevo = () => {
    setNuevoIngreso({
      fechaRecepcion: new Date().toISOString().slice(0, 10),
      tipoCliente: '',
      clienteId: '',
      zona: '',
      mineral: '',
      cuarzo: 0,
      llampo: 0,
      total: 0,
      clienteNombre: '',
      transportista: '',
      placaCamion: '',
      observaciones: ''
    });
    setShowModal(true);
  };

  // Guardar ingreso
  const guardarIngreso = async () => {
    if (!nuevoIngreso.clienteId) {
      alert('Debe seleccionar un cliente');
      return;
    }
    if (nuevoIngreso.total <= 0) {
      alert('Debe ingresar al menos una cantidad de Cuarzo o Llampo');
      return;
    }

    const success = await addClientStock(
      nuevoIngreso.clienteId,
      nuevoIngreso.cuarzo,
      nuevoIngreso.llampo
    );

    if (success) {
      setShowModal(false);
      alert('Ingreso de mineral registrado exitosamente');
    } else {
      alert('Error al registrar el ingreso');
    }
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const headers = ['Cliente', 'Tipo', 'Zona', 'Stock Cuarzo', 'Stock Llampo', 'Total'];
    const csvData = [
      headers.join(','),
      ...clients.map(c => [
        c.name,
        c.client_type || 'N/A',
        c.zone || 'N/A',
        c.stock_cuarzo || 0,
        c.stock_llampo || 0,
        (c.stock_cuarzo || 0) + (c.stock_llampo || 0)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Stock</h1>
          <p className="text-slate-500 mt-1">Control de ingresos y existencias</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={exportarExcel}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-medium"
          >
            <Download size={18} strokeWidth={1.5} className="mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={abrirModalNuevo}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
          >
            <Plus size={18} strokeWidth={1.5} className="mr-2" />
            Nuevo Ingreso
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-50 rounded-xl mr-4 border border-indigo-100">
              <Package className="text-indigo-600" size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Stock Total</p>
              <p className="text-2xl font-bold text-slate-900">{totalStock.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-amber-50 rounded-xl mr-4 border border-amber-100">
              <Package className="text-amber-600" size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Cuarzo</p>
              <p className="text-2xl font-bold text-slate-900">{totalCuarzo.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-slate-50 rounded-xl mr-4 border border-slate-100">
              <Package className="text-slate-600" size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Llampo</p>
              <p className="text-2xl font-bold text-slate-900">{totalLlampo.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-violet-50 rounded-xl mr-4 border border-violet-100">
              <User className="text-violet-600" size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Clientes con Stock</p>
              <p className="text-2xl font-bold text-slate-900">
                {clients.filter(c => (c.stock_cuarzo || 0) + (c.stock_llampo || 0) > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Buscar por cliente o zona..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} strokeWidth={1.5} />
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 appearance-none outline-none transition-all"
            >
              <option value="all">Todos los tipos</option>
              <option value="MINERO">Minero</option>
              <option value="PALLAQUERO">Pallaquero</option>
            </select>
          </div>

          <button
            onClick={() => fetchClients()}
            className="flex items-center justify-center px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all font-medium"
          >
            <RefreshCw size={18} strokeWidth={1.5} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabla de Inventario */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Zona</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-amber-600">Stock Cuarzo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-slate-700">Stock Llampo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sacos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-indigo-50 rounded-lg mr-3 group-hover:bg-white border border-transparent group-hover:border-indigo-100 transition-all">
                        <User size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{client.client_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {client.zone ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {client.zone}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-sm">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-amber-600">
                    {(client.stock_cuarzo || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">
                    {(client.stock_llampo || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {((client.stock_cuarzo || 0) + (client.stock_llampo || 0)).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Registrar Ingreso"
                      onClick={() => {
                        setNuevoIngreso(prev => ({
                          ...prev,
                          clienteId: client.id,
                          tipoCliente: client.client_type || '',
                          clienteNombre: client.name
                        }));
                        setShowModal(true);
                      }}
                    >
                      <Plus size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Package className="text-slate-300 mb-2" size={48} strokeWidth={1} />
                      <p className="text-slate-500 font-medium">No se encontraron clientes</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Nuevo Ingreso */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
              <div className="flex items-center">
                <div className="p-2.5 bg-indigo-50 rounded-xl mr-4">
                  <Truck className="text-indigo-600" size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Registrar Ingreso de Mineral</h3>
                  <p className="text-slate-500 text-sm">Aumentar stock disponible para cliente</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Cliente *</label>
                  <select
                    value={nuevoIngreso.clienteId}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === e.target.value);
                      setNuevoIngreso({
                        ...nuevoIngreso,
                        clienteId: e.target.value,
                        clienteNombre: client?.name || '',
                        tipoCliente: client?.client_type || ''
                      });
                    }}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    required
                  >
                    <option value="">Seleccionar Cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Fecha Recepción *</label>
                  <input
                    type="date"
                    value={nuevoIngreso.fechaRecepcion}
                    onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, fechaRecepcion: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Sacos Cuarzo</label>
                  <input
                    type="number"
                    min="0"
                    value={nuevoIngreso.cuarzo || ''}
                    onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, cuarzo: parseInt(e.target.value) || 0 })}
                    className="w-full bg-transparent text-2xl font-bold text-amber-900 border-b-2 border-amber-200 focus:border-amber-500 outline-none transition-all"
                    placeholder="0"
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Sacos Llampo</label>
                  <input
                    type="number"
                    min="0"
                    value={nuevoIngreso.llampo || ''}
                    onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, llampo: parseInt(e.target.value) || 0 })}
                    className="w-full bg-transparent text-2xl font-bold text-slate-900 border-b-2 border-slate-300 focus:border-slate-800 outline-none transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-between border border-indigo-100">
                <div className="flex items-center">
                  <Package className="text-indigo-600 mr-3" size={24} />
                  <span className="font-bold text-indigo-900">Total a Ingresar:</span>
                </div>
                <span className="text-2xl font-black text-indigo-700">{nuevoIngreso.total.toLocaleString()} sacos</span>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardarIngreso}
                disabled={loading}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Confirmar Ingreso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;