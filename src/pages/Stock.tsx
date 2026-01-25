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
  SUBMINERAL_TYPES_STOCK,
  MOCK_CLIENTES 
} from '../constants';
import { useAuthStore } from '../store/authStore';

// Tipo para items de stock
interface StockItem {
  id: string;
  fechaRecepcion: Date;
  tipoCliente: 'MINERO' | 'PALLAQUERO';
  clienteId: string;
  clienteNombre: string;
  zona?: string; // NUEVO CAMPO: Zona de procedencia
  mineral: 'OXIDO' | 'SULFURO';
  cuarzo: number;
  llampo: number;
  total: number;
  transportista?: string;
  placaCamion?: string;
  observaciones?: string;
  fechaRegistro: Date;
}

const Stock: React.FC = () => {
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterMineral, setFilterMineral] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Estado para nuevo ingreso - ACTUALIZADO con zona
  const [nuevoIngreso, setNuevoIngreso] = useState({
    fechaRecepcion: new Date().toISOString().slice(0, 10),
    tipoCliente: '',
    clienteId: '',
    zona: '', // NUEVO CAMPO
    mineral: '',
    cuarzo: 0,
    llampo: 0,
    transportista: '',
    placaCamion: '',
    observaciones: ''
  });

  // Mock data inicial
  const [stockData, setStockData] = useState<StockItem[]>([
    {
      id: '1',
      fechaRecepcion: new Date('2024-01-15'),
      tipoCliente: 'MINERO',
      clienteId: '1',
      clienteNombre: 'Minera Andina SA',
      zona: 'Norte', // Ejemplo de zona
      mineral: 'OXIDO',
      cuarzo: 300,
      llampo: 200,
      total: 500,
      transportista: 'Transportes Perú',
      placaCamion: 'ABC-123',
      observaciones: 'Entrega completa',
      fechaRegistro: new Date('2024-01-15')
    },
    {
      id: '2',
      fechaRecepcion: new Date('2024-01-16'),
      tipoCliente: 'MINERO',
      clienteId: '2',
      clienteNombre: 'Compañía Minerales del Sur',
      zona: 'Sur', // Ejemplo de zona
      mineral: 'SULFURO',
      cuarzo: 200,
      llampo: 120,
      total: 320,
      transportista: 'Logística Minera',
      placaCamion: 'DEF-456',
      observaciones: 'Falta verificar',
      fechaRegistro: new Date('2024-01-16')
    },
    {
      id: '3',
      fechaRecepcion: new Date('2024-01-14'),
      tipoCliente: 'PALLAQUERO',
      clienteId: '3',
      clienteNombre: 'Juan Pérez (Pallaquero)',
      zona: 'Centro', // Ejemplo de zona
      mineral: 'OXIDO',
      cuarzo: 80,
      llampo: 70,
      total: 150,
      transportista: 'Envíos Rápidos',
      placaCamion: 'GHI-789',
      observaciones: '',
      fechaRegistro: new Date('2024-01-14')
    },
  ]);

  // Datos mock para zonas de clientes
  const mockZonasCliente = [
    { clienteId: '1', zonas: ['Norte', 'Sur', 'Centro'] },
    { clienteId: '2', zonas: ['Sur', 'Este'] },
    { clienteId: '3', zonas: ['Centro', 'Oeste'] },
  ];

  // Obtener zonas del cliente seleccionado
  const getZonasCliente = (clienteId: string) => {
    const clienteZonas = mockZonasCliente.find(z => z.clienteId === clienteId);
    return clienteZonas ? clienteZonas.zonas : [];
  };

  // Calcular total automáticamente
  useEffect(() => {
    const total = (nuevoIngreso.cuarzo || 0) + (nuevoIngreso.llampo || 0);
    setNuevoIngreso(prev => ({ ...prev, total }));
  }, [nuevoIngreso.cuarzo, nuevoIngreso.llampo]);

  // Filtrar datos
  const filteredData = stockData.filter(item => {
    const matchesSearch = item.clienteNombre.toLowerCase().includes(search.toLowerCase()) ||
                         (item.transportista?.toLowerCase() || '').includes(search.toLowerCase()) ||
                         (item.placaCamion?.toLowerCase() || '').includes(search.toLowerCase()) ||
                         (item.zona?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesTipo = filterTipo === 'all' || item.tipoCliente === filterTipo;
    const matchesMineral = filterMineral === 'all' || item.mineral === filterMineral;
    return matchesSearch && matchesTipo && matchesMineral;
  });

  // Totales
  const totalStock = stockData.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalCuarzo = stockData.reduce((sum, item) => sum + (item.cuarzo || 0), 0);
  const totalLlampo = stockData.reduce((sum, item) => sum + (item.llampo || 0), 0);

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
      transportista: '',
      placaCamion: '',
      observaciones: ''
    });
    setIsEditing(false);
    setEditId(null);
    setShowModal(true);
  };

  // Abrir modal para editar
  const abrirModalEditar = (item: StockItem) => {
    setNuevoIngreso({
      fechaRecepcion: new Date(item.fechaRecepcion).toISOString().slice(0, 10),
      tipoCliente: item.tipoCliente,
      clienteId: item.clienteId,
      zona: item.zona || '',
      mineral: item.mineral,
      cuarzo: item.cuarzo || 0,
      llampo: item.llampo || 0,
      transportista: item.transportista || '',
      placaCamion: item.placaCamion || '',
      observaciones: item.observaciones || ''
    });
    setIsEditing(true);
    setEditId(item.id);
    setShowModal(true);
  };

  // Guardar ingreso (nuevo o editar)
  const guardarIngreso = () => {
    // Validaciones
    if (!nuevoIngreso.fechaRecepcion) {
      alert('La fecha de recepción es requerida');
      return;
    }
    if (!nuevoIngreso.tipoCliente) {
      alert('El tipo de cliente es requerido');
      return;
    }
    if (!nuevoIngreso.clienteId) {
      alert('Debe seleccionar un cliente');
      return;
    }
    if (!nuevoIngreso.mineral) {
      alert('El tipo de mineral es requerido');
      return;
    }
    if (nuevoIngreso.cuarzo < 0 || nuevoIngreso.llampo < 0) {
      alert('Las cantidades deben ser positivas');
      return;
    }
    if (nuevoIngreso.total <= 0) {
      alert('Debe ingresar al menos una cantidad de Cuarzo o Llampo');
      return;
    }

    const clienteSeleccionado = MOCK_CLIENTES.find(c => c.id === nuevoIngreso.clienteId);
    
    if (isEditing && editId) {
      // Editar existente
      setStockData(prev => prev.map(item => 
        item.id === editId ? {
          ...item,
          fechaRecepcion: new Date(nuevoIngreso.fechaRecepcion),
          tipoCliente: nuevoIngreso.tipoCliente as 'MINERO' | 'PALLAQUERO',
          clienteId: nuevoIngreso.clienteId,
          clienteNombre: clienteSeleccionado?.nombre || nuevoIngreso.clienteNombre,
          zona: nuevoIngreso.zona || undefined,
          mineral: nuevoIngreso.mineral as 'OXIDO' | 'SULFURO',
          cuarzo: nuevoIngreso.cuarzo,
          llampo: nuevoIngreso.llampo,
          total: nuevoIngreso.total,
          transportista: nuevoIngreso.transportista,
          placaCamion: nuevoIngreso.placaCamion,
          observaciones: nuevoIngreso.observaciones
        } : item
      ));
    } else {
      // Nuevo ingreso
      const nuevoItem: StockItem = {
        id: Date.now().toString(),
        fechaRecepcion: new Date(nuevoIngreso.fechaRecepcion),
        tipoCliente: nuevoIngreso.tipoCliente as 'MINERO' | 'PALLAQUERO',
        clienteId: nuevoIngreso.clienteId,
        clienteNombre: clienteSeleccionado?.nombre || '',
        zona: nuevoIngreso.zona || undefined,
        mineral: nuevoIngreso.mineral as 'OXIDO' | 'SULFURO',
        cuarzo: nuevoIngreso.cuarzo || 0,
        llampo: nuevoIngreso.llampo || 0,
        total: nuevoIngreso.total || 0,
        transportista: nuevoIngreso.transportista,
        placaCamion: nuevoIngreso.placaCamion,
        observaciones: nuevoIngreso.observaciones,
        fechaRegistro: new Date()
      };
      
      setStockData(prev => [nuevoItem, ...prev]);
    }

    setShowModal(false);
    alert(isEditing ? 'Stock actualizado correctamente' : 'Nuevo ingreso registrado');
  };

  // Eliminar item (solo admin)
  const eliminarItem = (id: string) => {
    if (user?.role !== 'admin') {
      alert('Solo el administrador puede eliminar registros');
      return;
    }
    
    if (window.confirm('¿Está seguro de eliminar este registro?')) {
      setStockData(prev => prev.filter(item => item.id !== id));
    }
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const headers = ['Fecha Recepción', 'Cliente', 'Tipo', 'Zona', 'Mineral', 'Cuarzo', 'Llampo', 'Total', 'Transportista', 'Placa', 'Observaciones'];
    const csvData = [
      headers.join(','),
      ...filteredData.map(item => [
        new Date(item.fechaRecepcion).toLocaleDateString(),
        item.clienteNombre,
        item.tipoCliente,
        item.zona || '',
        item.mineral,
        item.cuarzo || 0,
        item.llampo || 0,
        item.total || 0,
        item.transportista || '',
        item.placaCamion || '',
        item.observaciones || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Stock</h1>
          <p className="text-gray-600 mt-1">Control de ingresos y existencias</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={exportarExcel}
            className="btn-secondary flex items-center"
          >
            <Download size={18} className="mr-2" />
            Exportar Excel
          </button>
          <button 
            onClick={abrirModalNuevo}
            className="btn-primary flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Nuevo Ingreso
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <Package className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Stock Total</p>
              <p className="text-2xl font-bold text-gray-900">{totalStock.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <Package className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cuarzo</p>
              <p className="text-2xl font-bold text-gray-900">{totalCuarzo.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-amber-100 rounded-xl mr-4">
              <Package className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Llampo</p>
              <p className="text-2xl font-bold text-gray-900">{totalLlampo.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl mr-4">
              <User className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Clientes Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {[...new Set(stockData.map(item => item.clienteId))].length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-6 border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por cliente, transportista, placa, zona..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="input-field"
            >
              <option value="all">Todos los tipos</option>
              {TIPO_CLIENTE.map(tipo => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterMineral}
              onChange={(e) => setFilterMineral(e.target.value)}
              className="input-field"
            >
              <option value="all">Todos los minerales</option>
              {MINERAL_TYPES_STOCK.map(mineral => (
                <option key={mineral.value} value={mineral.value}>{mineral.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                setSearch('');
                setFilterTipo('all');
                setFilterMineral('all');
              }}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw size={16} className="mr-2" />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Stock */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input 
                    type="checkbox"
                    className="rounded border-gray-300"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(filteredData.map(item => item.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Recepción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zona
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mineral
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cuarzo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Llampo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transportista
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(item.fechaRecepcion).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.clienteNombre}</div>
                      <div className="text-xs text-gray-500">
                        {TIPO_CLIENTE.find(t => t.value === item.tipoCliente)?.label}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${item.zona ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {item.zona || 'Sin zona'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.mineral === 'OXIDO' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {MINERAL_TYPES_STOCK.find(m => m.value === item.mineral)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(item.cuarzo || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(item.llampo || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{(item.total || 0).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.transportista || '-'}</div>
                    {item.placaCamion && (
                      <div className="text-xs text-gray-500">{item.placaCamion}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => abrirModalEditar(item)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => eliminarItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                        title={user?.role === 'admin' ? "Eliminar" : "Solo admin puede eliminar"}
                        disabled={user?.role !== 'admin'}
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
        
        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay registros</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || filterTipo !== 'all' || filterMineral !== 'all' 
                ? 'Intenta con otros filtros' 
                : 'Comienza agregando un nuevo ingreso'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Nuevo Ingreso */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-2xl bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Editar Registro de Stock' : 'Nuevo Ingreso de Stock'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Fila 1: Fecha Recepción | Tipo Cliente | Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Recepción *
                  </label>
                  <input
                    type="date"
                    value={nuevoIngreso.fechaRecepcion}
                    onChange={(e) => setNuevoIngreso({...nuevoIngreso, fechaRecepcion: e.target.value})}
                    max={new Date().toISOString().slice(0, 10)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo Cliente *
                  </label>
                  <select
                    value={nuevoIngreso.tipoCliente}
                    onChange={(e) => {
                      setNuevoIngreso({...nuevoIngreso, tipoCliente: e.target.value});
                      // Si cambia el tipo, limpiar cliente seleccionado
                      if (nuevoIngreso.clienteId) {
                        const cliente = MOCK_CLIENTES.find(c => c.id === nuevoIngreso.clienteId);
                        if (cliente?.tipo !== e.target.value) {
                          setNuevoIngreso({...nuevoIngreso, tipoCliente: e.target.value, clienteId: ''});
                        }
                      }
                    }}
                    className="input-field"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {TIPO_CLIENTE.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente *
                  </label>
                  <select
                    value={nuevoIngreso.clienteId}
                    onChange={(e) => {
                      setNuevoIngreso({...nuevoIngreso, clienteId: e.target.value});
                      // Cuando se selecciona cliente, limpiar zona seleccionada
                      if (nuevoIngreso.zona) {
                        setNuevoIngreso(prev => ({...prev, zona: ''}));
                      }
                    }}
                    className="input-field"
                    required
                    disabled={!nuevoIngreso.tipoCliente}
                  >
                    <option value="">Seleccionar cliente</option>
                    {MOCK_CLIENTES
                      .filter(cliente => !nuevoIngreso.tipoCliente || cliente.tipo === nuevoIngreso.tipoCliente)
                      .map(cliente => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre} ({cliente.stock} sacos)
                        </option>
                      ))
                    }
                    {nuevoIngreso.tipoCliente && (
                      <option value="new">+ Crear nuevo cliente</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Fila 2: Zona | Mineral | Cuarzo | Llampo - NUEVA ESTRUCTURA */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* ZONA (opcional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zona (opcional)
                  </label>
                  <select
                    value={nuevoIngreso.zona || ''}
                    onChange={(e) => setNuevoIngreso({...nuevoIngreso, zona: e.target.value})}
                    className="input-field"
                    disabled={!nuevoIngreso.clienteId || nuevoIngreso.clienteId === 'new'}
                  >
                    <option value="">Seleccionar zona</option>
                    {/* Mostrar zonas del cliente seleccionado */}
                    {nuevoIngreso.clienteId && nuevoIngreso.clienteId !== 'new' && (
                      <>
                        {getZonasCliente(nuevoIngreso.clienteId).map((zona, index) => (
                          <option key={index} value={zona}>
                            {zona}
                          </option>
                        ))}
                        <option value="new_zone">+ Agregar nueva zona</option>
                      </>
                    )}
                  </select>
                </div>

                {/* MINERAL (obligatorio) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mineral *
                  </label>
                  <select
                    value={nuevoIngreso.mineral}
                    onChange={(e) => setNuevoIngreso({...nuevoIngreso, mineral: e.target.value})}
                    className="input-field"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {MINERAL_TYPES_STOCK.map(mineral => (
                      <option key={mineral.value} value={mineral.value}>{mineral.label}</option>
                    ))}
                  </select>
                </div>

                {/* CUARZO (obligatorio) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuarzo (sacos) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={nuevoIngreso.cuarzo || ''}
                    onChange={(e) => setNuevoIngreso({...nuevoIngreso, cuarzo: parseInt(e.target.value) || 0})}
                    className="input-field text-center"
                    placeholder="0"
                    required
                  />
                </div>

                {/* LLAMPO (obligatorio) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Llampo (sacos) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={nuevoIngreso.llampo || ''}
                    onChange={(e) => setNuevoIngreso({...nuevoIngreso, llampo: parseInt(e.target.value) || 0})}
                    className="input-field text-center"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Fila 3: Total (auto) | Transportista | Placa Camión */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total (automático)
                  </label>
                  <div className="input-field bg-gray-50 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      {(nuevoIngreso.total || 0).toLocaleString()}
                    </span>
                    <Package className="text-gray-400" size={20} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Cuarzo: {nuevoIngreso.cuarzo || 0} + Llampo: {nuevoIngreso.llampo || 0}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transportista
                  </label>
                  <input
                    type="text"
                    value={nuevoIngreso.transportista}
                    onChange={(e) => setNuevoIngreso({...nuevoIngreso, transportista: e.target.value})}
                    className="input-field"
                    placeholder="Nombre del transportista"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Placa Camión (opcional)
                  </label>
                  <input
                    type="text"
                    value={nuevoIngreso.placaCamion}
                    onChange={(e) => setNuevoIngreso({...nuevoIngreso, placaCamion: e.target.value})}
                    className="input-field"
                    placeholder="ABC-123"
                  />
                </div>
              </div>

              {/* Fila 4: Observaciones (textarea full width) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={nuevoIngreso.observaciones}
                  onChange={(e) => setNuevoIngreso({...nuevoIngreso, observaciones: e.target.value})}
                  className="input-field min-h-[100px]"
                  placeholder="Observaciones adicionales..."
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarIngreso}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  {isEditing ? (
                    <>
                      <Edit size={18} className="mr-2" />
                      Actualizar
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} className="mr-2" />
                      Guardar Ingreso
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;