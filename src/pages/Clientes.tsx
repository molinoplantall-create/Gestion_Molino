import React, { useState } from 'react';
import { 
  Users, Phone, Mail, Package, TrendingUp, Search, Filter, 
  UserPlus, MessageSquare, X, Save, MapPin, Building, 
  Calendar, User, FileText, DollarSign
} from 'lucide-react';

const Clientes: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);
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

  // Mock clients data
  const mockClients = [
    {
      id: '1',
      nombre: 'Minera Andina SA',
      contacto: 'Juan Rodríguez',
      telefono: '+51 987 654 321',
      email: 'contacto@mineraandina.com',
      stockActual: 500,
      totalSacos: 1250,
      estado: 'ACTIVO',
      zona: 'Norte',
      ultimaCompra: '2024-01-15',
    },
    {
      id: '2',
      nombre: 'Compañía Minerales del Sur',
      contacto: 'María González',
      telefono: '+51 987 123 456',
      email: 'ventas@mineralesdelsur.com',
      stockActual: 320,
      totalSacos: 980,
      estado: 'ACTIVO',
      zona: 'Sur',
      ultimaCompra: '2024-01-16',
    },
    {
      id: '3',
      nombre: 'Empresa Extractora Norte',
      contacto: 'Carlos López',
      telefono: '+51 987 789 123',
      email: 'info@extractoranorte.com',
      stockActual: 450,
      totalSacos: 890,
      estado: 'INACTIVO',
      zona: 'Norte',
      ultimaCompra: '2024-01-10',
    },
    {
      id: '4',
      nombre: 'Minerales y Derivados SAC',
      contacto: 'Ana Martínez',
      telefono: '+51 987 456 789',
      email: 'ana@mineralesysa.com',
      stockActual: 280,
      totalSacos: 1100,
      estado: 'ACTIVO',
      zona: 'Centro',
      ultimaCompra: '2024-01-14',
    },
    {
      id: '5',
      nombre: 'Sociedad Minera Central',
      contacto: 'Pedro Sánchez',
      telefono: '+51 987 321 654',
      email: 'pedro@mineracentral.com',
      stockActual: 600,
      totalSacos: 750,
      estado: 'ACTIVO',
      zona: 'Centro',
      ultimaCompra: '2024-01-13',
    },
  ];

  const filteredClients = mockClients.filter(client => {
    const matchesSearch = client.nombre.toLowerCase().includes(search.toLowerCase()) ||
                         client.contacto.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || client.estado === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (estado: string) => {
    return estado === 'ACTIVO' ? (
      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Activo</span>
    ) : (
      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Inactivo</span>
    );
  };

  const getZoneBadge = (zona: string) => {
    const colors = {
      'Norte': 'bg-blue-100 text-blue-800',
      'Sur': 'bg-green-100 text-green-800',
      'Centro': 'bg-purple-100 text-purple-800',
      'Este': 'bg-orange-100 text-orange-800',
      'Oeste': 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[zona as keyof typeof colors] || 'bg-gray-100'}`}>
        {zona}
      </span>
    );
  };

  const handleNuevoClienteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setNuevoCliente(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmitNuevoCliente = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!nuevoCliente.nombre || !nuevoCliente.contacto || !nuevoCliente.telefono) {
      alert('Por favor complete los campos obligatorios: Nombre, Contacto y Teléfono');
      return;
    }

    // Aquí iría la lógica para guardar el cliente en la base de datos
    console.log('Nuevo cliente registrado:', nuevoCliente);
    
    // Mostrar confirmación
    alert(`Cliente ${nuevoCliente.nombre} registrado exitosamente!`);
    
    // Resetear formulario y cerrar modal
    setNuevoCliente({
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
    setShowNuevoClienteModal(false);
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
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Clientes</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <Package className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Stock Total</p>
              <p className="text-2xl font-bold text-gray-900">2,150</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-xl mr-4">
              <TrendingUp className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Clientes Activos</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl mr-4">
              <Package className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sacos Promedio</p>
              <p className="text-2xl font-bold text-gray-900">179</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border">
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
            <select className="input-field">
              <option value="all">Todas las zonas</option>
              <option value="Norte">Norte</option>
              <option value="Sur">Sur</option>
              <option value="Centro">Centro</option>
              <option value="Este">Este</option>
              <option value="Oeste">Oeste</option>
            </select>
          </div>

          <div>
            <select className="input-field">
              <option>Ordenar por: Nombre</option>
              <option>Ordenar por: Stock</option>
              <option>Ordenar por: Última compra</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white rounded-2xl border overflow-hidden card-hover">
            {/* Client Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Users className="text-primary-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-bold text-gray-900">{client.nombre}</h3>
                    <div className="flex items-center mt-1">
                      {getStatusBadge(client.estado)}
                      <span className="ml-2">{getZoneBadge(client.zona)}</span>
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
                  <div className="flex items-center text-gray-600 mb-2">
                    <Users size={16} className="mr-2" />
                    <span className="text-sm">Contacto</span>
                  </div>
                  <p className="font-medium text-gray-900">{client.contacto}</p>
                </div>

                {/* Contact Methods */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Phone size={16} className="text-gray-400 mr-3" />
                    <span className="text-gray-700">{client.telefono}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail size={16} className="text-gray-400 mr-3" />
                    <span className="text-gray-700">{client.email}</span>
                  </div>
                </div>

                {/* Stock Info */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Stock Actual</div>
                      <div className="text-2xl font-bold text-gray-900">{client.stockActual}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Sacos</div>
                      <div className="text-2xl font-bold text-gray-900">{client.totalSacos}</div>
                    </div>
                  </div>

                  {/* Stock Progress */}
                  <div>
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Utilización de stock</span>
                      <span>{Math.round((client.stockActual / client.totalSacos) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${(client.stockActual / client.totalSacos) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Last Purchase */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-600">Última compra</div>
                  <div className="font-medium text-gray-900">{client.ultimaCompra}</div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <button className="flex-1 btn-secondary py-2 text-sm">
                      Editar
                    </button>
                    <button className="flex-1 btn-primary py-2 text-sm">
                      Contactar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Client Button */}
      <div className="flex justify-center">
        <button 
          className="border-2 border-dashed border-gray-300 hover:border-primary-300 rounded-2xl p-8 w-full max-w-md flex flex-col items-center justify-center transition-colors"
          onClick={() => setShowNuevoClienteModal(true)}
        >
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="text-primary-600" size={32} />
          </div>
          <span className="text-lg font-medium text-gray-700">Agregar nuevo cliente</span>
          <span className="text-sm text-gray-500 mt-2">Registre un nuevo cliente en el sistema</span>
        </button>
      </div>

      {/* Modal para Nuevo Cliente */}
      {showNuevoClienteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-2xl bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <UserPlus className="mr-3 text-blue-600" size={28} />
                Registro de Nuevo Cliente
              </h2>
              <button
                onClick={() => setShowNuevoClienteModal(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitNuevoCliente}>
              <div className="space-y-6 max-h-[70vh] overflow-y-auto px-2">
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-700">
                    Complete todos los campos para registrar un nuevo cliente. Los campos marcados con * son obligatorios.
                  </p>
                </div>

                {/* Sección 1: Información Básica */}
                <div className="border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="mr-2 text-blue-600" size={20} />
                    Información Básica
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre/Razón Social *
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        RUC
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contacto Principal *
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teléfono *
                      </label>
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
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={nuevoCliente.email}
                        onChange={handleNuevoClienteChange}
                        className="input-field"
                        placeholder="Ej: contacto@empresa.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Cliente
                      </label>
                      <select
                        name="tipoCliente"
                        value={nuevoCliente.tipoCliente}
                        onChange={handleNuevoClienteChange}
                        className="input-field"
                      >
                        <option value="">Seleccionar tipo</option>
                        <option value="MINERO">Minero</option>
                        <option value="PALLAQUERO">Pallaquero</option>
                        <option value="COMERCIAL">Comercial</option>
                        <option value="INDUSTRIAL">Industrial</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sección 2: Ubicación */}
                <div className="border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="mr-2 text-blue-600" size={20} />
                    Ubicación
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección
                      </label>
                      <input
                        type="text"
                        name="direccion"
                        value={nuevoCliente.direccion}
                        onChange={handleNuevoClienteChange}
                        className="input-field"
                        placeholder="Ej: Av. Industrial 123"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zona
                      </label>
                      <select
                        name="zona"
                        value={nuevoCliente.zona}
                        onChange={handleNuevoClienteChange}
                        className="input-field"
                      >
                        <option value="">Seleccionar zona</option>
                        <option value="Norte">Norte</option>
                        <option value="Sur">Sur</option>
                        <option value="Centro">Centro</option>
                        <option value="Este">Este</option>
                        <option value="Oeste">Oeste</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sección 3: Información de Stock */}
                <div className="border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="mr-2 text-blue-600" size={20} />
                    Información de Stock
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Inicial (sacos)
                      </label>
                      <input
                        type="number"
                        name="stockInicial"
                        value={nuevoCliente.stockInicial}
                        onChange={handleNuevoClienteChange}
                        className="input-field"
                        placeholder="Ej: 500"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Mineral Principal
                      </label>
                      <select
                        name="tipoMineral"
                        value={nuevoCliente.tipoMineral}
                        onChange={handleNuevoClienteChange}
                        className="input-field"
                      >
                        <option value="">Seleccionar mineral</option>
                        <option value="OXIDO">Óxido</option>
                        <option value="SULFURO">Sulfuro</option>
                        <option value="MIXTO">Mixto</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sección 4: Observaciones */}
                <div className="border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="mr-2 text-blue-600" size={20} />
                    Observaciones
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas adicionales
                    </label>
                    <textarea
                      name="observaciones"
                      value={nuevoCliente.observaciones}
                      onChange={handleNuevoClienteChange}
                      className="input-field min-h-[100px]"
                      placeholder="Observaciones sobre el cliente, acuerdos especiales, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNuevoClienteModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <X size={18} className="mr-2" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Save size={18} className="mr-2" />
                  Registrar Cliente
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