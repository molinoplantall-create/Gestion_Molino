import React, { useState } from 'react';
import { Search, Filter, Download, MessageSquare, Eye, Edit, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { MillingSession } from '@/types';

const Moliendas: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Datos de ejemplo
  const mockSessions: MillingSession[] = Array.from({ length: 48 }, (_, i) => ({
    id: `#${(1000 + i).toString().padStart(3, '0')}`,
    molinoId: `${(i % 4) + 1}`,
    clienteId: `${i + 1}`,
    clienteNombre: `Cliente ${String.fromCharCode(65 + (i % 5))}`,
    cantidadSacos: 15 + Math.floor(Math.random() * 20),
    mineral: i % 2 === 0 ? 'OXIDO' : 'SULFURO',
    subMineral: i % 2 === 0 ? 'CUARZO' : 'LLAMPO',
    horaInicio: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    horaFinCalculada: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000),
    duracionMinutos: i % 2 === 0 ? 100 : 120 + Math.floor(Math.random() * 30),
    estado: i % 3 === 0 ? 'EN_PROCESO' : 'FINALIZADO',
    operadorId: '1',
    operadorNombre: 'Operador ' + (i % 3 + 1),
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  }));

  const filteredSessions = mockSessions.filter(session => {
    const matchesSearch = session.clienteNombre.toLowerCase().includes(search.toLowerCase()) ||
                         session.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || session.estado === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'EN_PROCESO':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">En Proceso</span>;
      case 'FINALIZADO':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Finalizado</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{estado}</span>;
    }
  };

  const getMineralBadge = (mineral: string) => {
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        mineral === 'OXIDO' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
      }`}>
        {mineral}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moliendas</h1>
          <p className="text-gray-600 mt-1">Historial completo de procesos de molienda</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button className="btn-primary flex items-center">
            <MessageSquare size={18} className="mr-2" />
            Enviar WhatsApp
          </button>
          <button className="btn-secondary flex items-center">
            <Download size={18} className="mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por cliente, ID, molino..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">Todos los estados</option>
              <option value="EN_PROCESO">En Proceso</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select className="input-field pl-10">
                <option>Últimos 7 días</option>
                <option>Este mes</option>
                <option>Mes anterior</option>
                <option>Rango personalizado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium">
            Hoy
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
            Esta semana
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
            Este mes
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
            <Filter size={16} className="inline mr-2" />
            Más filtros
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Molino</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sacos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mineral</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duración</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operador</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-gray-900">{session.id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="font-medium">M{session.molinoId}</span>
                      </div>
                      <span className="text-gray-900">Molino {session.molinoId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{session.clienteNombre}</div>
                    <div className="text-sm text-gray-500">
                      {session.horaInicio.toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{session.cantidadSacos}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getMineralBadge(session.mineral)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">
                      {Math.floor(session.duracionMinutos / 60)}h {session.duracionMinutos % 60}m
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(session.estado)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{session.operadorNombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                        <Edit size={18} />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSessions.length)} de {filteredSessions.length} registros
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg ${
                    currentPage === pageNum
                      ? 'bg-primary-600 text-white'
                      : 'border text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <span className="text-blue-600 font-bold">Σ</span>
            </div>
            <div>
              <p className="text-sm text-blue-700">Total sacos procesados</p>
              <p className="text-2xl font-bold text-blue-900">4,220</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <span className="text-green-600 font-bold">✓</span>
            </div>
            <div>
              <p className="text-sm text-green-700">Moliendas finalizadas</p>
              <p className="text-2xl font-bold text-green-900">156</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-xl mr-4">
              <span className="text-orange-600 font-bold">⏱️</span>
            </div>
            <div>
              <p className="text-sm text-orange-700">Tiempo promedio</p>
              <p className="text-2xl font-bold text-orange-900">2.1h</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Moliendas;