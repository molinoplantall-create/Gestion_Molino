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
        return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold rounded-full">En Proceso</span>;
      case 'FINALIZADO':
        return <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold rounded-full">Finalizado</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-slate-50 text-slate-700 border border-slate-100 text-xs font-semibold rounded-full">{estado}</span>;
    }
  };

  const getMineralBadge = (mineral: string) => {
    return (
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${mineral === 'OXIDO'
        ? 'bg-blue-50 text-blue-700 border-blue-100'
        : 'bg-purple-50 text-purple-700 border-purple-100'
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
          <h1 className="text-2xl font-bold text-slate-900">Moliendas</h1>
          <p className="text-slate-500 mt-1">Historial completo de procesos de molienda</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm">
            <MessageSquare size={18} strokeWidth={1.5} className="mr-2" />
            Enviar WhatsApp
          </button>
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={18} strokeWidth={1.5} className="mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Buscar por cliente, ID, molino..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} strokeWidth={1.5} />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              >
                <option value="all">Todos los estados</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="FINALIZADO">Finalizado</option>
              </select>
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} strokeWidth={1.5} />
              <select className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                <option>Últimos 7 días</option>
                <option>Este mes</option>
                <option>Mes anterior</option>
                <option>Rango personalizado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-100">
            Hoy
          </button>
          <button className="px-4 py-1.5 bg-white text-slate-600 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50">
            Esta semana
          </button>
          <button className="px-4 py-1.5 bg-white text-slate-600 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50">
            Este mes
          </button>
          <button className="px-4 py-1.5 bg-white text-slate-600 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 flex items-center">
            <Filter size={14} strokeWidth={1.5} className="mr-2" />
            Más filtros
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Molino</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sacos</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mineral</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Duración</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Operador</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-medium text-slate-600">{session.id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3 border border-slate-200">
                        <span className="font-semibold text-xs text-slate-600">M{session.molinoId}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-700">Molino {session.molinoId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{session.clienteNombre}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {session.horaInicio.toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-slate-700">{session.cantidadSacos}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getMineralBadge(session.mineral)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600 font-medium">
                      {Math.floor(session.duracionMinutos / 60)}h {session.duracionMinutos % 60}m
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(session.estado)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600">{session.operadorNombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver detalles">
                        <Eye size={18} strokeWidth={1.5} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                        <Edit size={18} strokeWidth={1.5} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <div className="text-sm text-slate-500">
            Mostrando <span className="font-medium text-slate-700">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSessions.length)}</span> de <span className="font-medium text-slate-700">{filteredSessions.length}</span> registros
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} strokeWidth={1.5} />
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
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center">
          <div className="p-3 bg-indigo-50 rounded-xl mr-4 border border-indigo-100">
            <span className="text-indigo-600 font-bold">Σ</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total sacos procesados</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">4,220</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center">
          <div className="p-3 bg-emerald-50 rounded-xl mr-4 border border-emerald-100">
            <span className="text-emerald-600 font-bold">✓</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Moliendas finalizadas</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">156</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center">
          <div className="p-3 bg-amber-50 rounded-xl mr-4 border border-amber-100">
            <span className="text-amber-600 font-bold">⏱️</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tiempo promedio</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">2.1h</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Moliendas;