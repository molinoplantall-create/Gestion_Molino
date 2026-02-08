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

import { useToast } from '../hooks/useToast';
import { FormModal } from '../components/ui/FormModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const Stock: React.FC = () => {
  const { user } = useAuthStore();
  const { clients, zones, loading, clientsLoading, fetchClients, fetchZones, addClientStock } = useSupabaseStore();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');

  useEffect(() => {
    fetchClients();
    fetchZones();
  }, [fetchClients, fetchZones]);

  // Estado para nuevo ingreso
  const [nuevoIngreso, setNuevoIngreso] = useState({
    fechaRecepcion: new Date().toISOString().slice(0, 10),
    tipoCliente: '',
    clienteId: '',
    zona: '',
    mineral: '',
    mineralType: 'OXIDO' as 'OXIDO' | 'SULFURO',
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
      mineralType: 'OXIDO',
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
    console.log('🚀 Stock: Iniciando guardarIngreso', nuevoIngreso);
    if (!nuevoIngreso.clienteId) {
      toast.error('Error', 'Debe seleccionar un cliente');
      return;
    }
    if (nuevoIngreso.total <= 0) {
      toast.error('Error', 'Debe ingresar al menos una cantidad de Cuarzo o Llampo');
      return;
    }

    try {
      console.log('📡 Stock: Llamando a addClientStock...');
      const success = await addClientStock(
        nuevoIngreso.clienteId,
        nuevoIngreso.cuarzo,
        nuevoIngreso.llampo,
        nuevoIngreso.zona,
        nuevoIngreso.mineralType
      );

      console.log('📊 Stock: Resultado de addClientStock:', success);
      if (success) {
        setShowModal(false);
        toast.success('Ingreso Exitoso', `Se ha registrado el ingreso de ${nuevoIngreso.total} sacos para ${nuevoIngreso.clienteNombre}`);
      } else {
        toast.error('Error', 'No se pudo registrar el ingreso de mineral. Intente de nuevo.');
      }
    } catch (err) {
      console.error('❌ Stock: Error en guardarIngreso catch:', err);
      toast.error('Error Crítico', 'Ocurrió un error inesperado al procesar el ingreso.');
    }
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const headers = ['Cliente', 'Tipo', 'Zona', 'Stock Cuarzo', 'Stock Llampo', 'Total'];
    const csvData = [
      headers.join(','),
      ...clients.map(c => [
        `"${c.name}"`,
        c.client_type || 'N/A',
        c.zone || 'N/A',
        c.stock_cuarzo || 0,
        c.stock_llampo || 0,
        (c.stock_cuarzo || 0) + (c.stock_llampo || 0)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Gestión de Stock</h1>
          <p className="text-slate-500 mt-1 font-medium">Control de ingresos y existencias</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={exportarExcel}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-bold text-sm"
          >
            <Download size={18} strokeWidth={2} className="mr-2" />
            Exportar
          </button>
          <button
            onClick={abrirModalNuevo}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold text-sm"
          >
            <Plus size={18} strokeWidth={2} className="mr-2" />
            Ingreso
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-4 md:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2.5 md:p-3 bg-indigo-50 rounded-xl mr-3 md:mr-4 border border-indigo-100 shrink-0">
              <Package className="text-indigo-600 w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total</p>
              <p className="text-lg md:text-2xl font-black text-slate-900 leading-none">{totalStock.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2.5 md:p-3 bg-amber-50 rounded-xl mr-3 md:mr-4 border border-amber-100 shrink-0">
              <Package className="text-amber-600 w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-bold text-amber-600 uppercase tracking-wider mb-0.5">Cuarzo</p>
              <p className="text-lg md:text-2xl font-black text-slate-900 leading-none">{totalCuarzo.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2.5 md:p-3 bg-slate-50 rounded-xl mr-3 md:mr-4 border border-slate-100 shrink-0">
              <Package className="text-slate-600 w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Llampo</p>
              <p className="text-lg md:text-2xl font-black text-slate-900 leading-none">{totalLlampo.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2.5 md:p-3 bg-violet-50 rounded-xl mr-3 md:mr-4 border border-violet-100 shrink-0">
              <User className="text-violet-600 w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-bold text-violet-600 uppercase tracking-wider mb-0.5">Clientes</p>
              <p className="text-lg md:text-2xl font-black text-slate-900 leading-none">
                {clients.filter(c => (c.stock_cuarzo || 0) + (c.stock_llampo || 0) > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 md:p-5 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Buscar por cliente o zona..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 md:w-48">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} strokeWidth={1.5} />
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 appearance-none outline-none transition-all text-sm font-bold text-slate-700"
              >
                <option value="all">Todos los tipos</option>
                <option value="MINERO">Minero</option>
                <option value="PALLAQUERO">Pallaquero</option>
              </select>
            </div>

            <button
              onClick={() => fetchClients()}
              disabled={clientsLoading}
              className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all font-bold text-sm flex items-center shrink-0 disabled:opacity-50"
            >
              <RefreshCw size={16} strokeWidth={2} className={`mr-2 ${clientsLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Inventario */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Zona</th>
                <th className="px-6 py-4 text-[10px] font-black text-amber-600 uppercase tracking-widest text-center">Cuarzo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Llampo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Último Ingreso</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientsLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12">
                    <LoadingSpinner text="Cargando inventario..." />
                  </td>
                </tr>
              ) : filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 rounded-xl mr-3 flex items-center justify-center border border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <User size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{client.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{client.client_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {client.zone ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                        {client.zone}
                      </span>
                    ) : (
                      <span className="text-slate-300 italic text-xs">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-black text-amber-600">{(client.stock_cuarzo || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-black text-slate-600">{(client.stock_llampo || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-black text-slate-900">{((client.stock_cuarzo || 0) + (client.stock_llampo || 0)).toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold text-slate-700">
                        {client.last_intake_date ? new Date(client.last_intake_date).toLocaleDateString() : '---'}
                      </span>
                      {client.last_intake_zone && (
                        <span className="text-[9px] text-slate-400 font-black uppercase mt-0.5">
                          {client.last_intake_zone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm group/btn"
                      onClick={() => {
                        setNuevoIngreso(prev => ({
                          ...prev,
                          clienteId: client.id,
                          tipoCliente: client.client_type || '',
                          clienteNombre: client.name,
                          zona: client.zone || ''
                        }));
                        setShowModal(true);
                      }}
                    >
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </td>
                </tr>
              ))}
              {!clientsLoading && filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Package className="text-slate-300" size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">No se encontraron clientes</h3>
                      <p className="text-sm text-slate-500">Intente cambiar los filtros de búsqueda</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Nuevo Ingreso - Usando FormModal para responsividad */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={guardarIngreso}
        title="Registar Ingreso de Mineral"
        icon={Truck}
        submitLabel="Confirmar Ingreso"
        isLoading={loading}
        isValid={!!nuevoIngreso.clienteId && nuevoIngreso.total > 0}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Cliente *</label>
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
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-800"
                required
              >
                <option value="">Seleccionar Cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Fecha Recepción *</label>
              <input
                type="date"
                value={nuevoIngreso.fechaRecepcion}
                onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, fechaRecepcion: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Zona Procedencia *</label>
              <select
                value={nuevoIngreso.zona}
                onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, zona: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                required
              >
                <option value="">Seleccionar Zona</option>
                {zones.map(z => (
                  <option key={z.id} value={z.name}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tipo de Mineral *</label>
            <div className="grid grid-cols-2 gap-2">
              {MINERAL_TYPES_STOCK.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setNuevoIngreso({ ...nuevoIngreso, mineralType: type.value as 'OXIDO' | 'SULFURO' })}
                  className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${nuevoIngreso.mineralType === type.value
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-inner">
              <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">CANT. CUARZO</label>
              <input
                type="number"
                min="0"
                value={nuevoIngreso.cuarzo || ''}
                onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, cuarzo: parseInt(e.target.value) || 0 })}
                className="w-full bg-transparent text-3xl font-black text-amber-900 border-none focus:ring-0 outline-none transition-all placeholder:text-amber-200"
                placeholder="0"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CANT. LLAMPO</label>
              <input
                type="number"
                min="0"
                value={nuevoIngreso.llampo || ''}
                onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, llampo: parseInt(e.target.value) || 0 })}
                className="w-full bg-transparent text-3xl font-black text-slate-900 border-none focus:ring-0 outline-none transition-all placeholder:text-slate-200"
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-indigo-900 p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-800 rounded-lg mr-3">
                <Package className="text-white" size={20} />
              </div>
              <span className="font-bold text-white uppercase text-xs tracking-widest">Total a Ingresar</span>
            </div>
            <span className="text-3xl font-black text-white">{nuevoIngreso.total.toLocaleString()} <span className="text-xs">SACOS</span></span>
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default Stock;
