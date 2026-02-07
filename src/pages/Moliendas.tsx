import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, MessageSquare, Eye, Edit, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { MillingLog } from '@/types';
import { useSupabaseStore } from '@/store/supabaseStore';
import { Table } from '@/components/common/Table';

const Moliendas: React.FC = () => {
  const { millingLogs, logsCount, logsLoading, fetchMillingLogs } = useSupabaseStore();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchMillingLogs({
      page: currentPage,
      pageSize,
      search,
      status: selectedStatus
    });
  }, [fetchMillingLogs, currentPage, search, selectedStatus]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus]);

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'EN_PROCESO':
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold rounded-full">En Proceso</span>;
      case 'FINALIZADO':
      case 'COMPLETED':
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

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (session: MillingLog) => (
        <span className="font-mono text-sm font-medium text-slate-600">#{session.id.substring(0, 6)}</span>
      )
    },
    {
      key: 'mill_id',
      label: 'Molino',
      render: (session: MillingLog) => {
        const millInfo = Array.isArray(session.mills_used)
          ? session.mills_used.map((m: any) => m.mill_id).join(', ')
          : 'Molino';
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3 border border-slate-200">
              <span className="font-semibold text-xs text-slate-600">M</span>
            </div>
            <span className="text-sm font-medium text-slate-700 truncate max-w-[100px]" title={millInfo}>
              {millInfo}
            </span>
          </div>
        );
      }
    },
    {
      key: 'client_id',
      label: 'Cliente',
      render: (session: MillingLog) => {
        const clientName = (session as any).clients?.name || 'Cliente';
        const startTime = new Date(session.created_at);
        return (
          <div>
            <div className="text-sm font-medium text-slate-900">{clientName}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {startTime.toLocaleDateString()}
            </div>
          </div>
        );
      }
    },
    {
      key: 'total_sacks',
      label: 'Sacos',
      render: (session: MillingLog) => (
        <span className="text-sm font-semibold text-slate-700">{session.total_sacks}</span>
      )
    },
    {
      key: 'mineral_type',
      label: 'Mineral',
      render: (session: MillingLog) => getMineralBadge(session.mineral_type)
    },
    {
      key: 'duration',
      label: 'Duración',
      render: () => <span className="text-sm text-slate-600 font-medium italic">-</span>
    },
    {
      key: 'status',
      label: 'Estado',
      render: (session: MillingLog) => getStatusBadge(session.status)
    },
    {
      key: 'operator',
      label: 'Operador',
      render: () => <div className="text-sm text-slate-600">Técnico</div>
    },
    {
      key: 'actions',
      label: 'Acciones',
      className: 'text-right',
      render: (session: MillingLog) => (
        <div className="flex space-x-1 justify-end">
          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <Eye size={18} strokeWidth={1.5} />
          </button>
          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <Edit size={18} strokeWidth={1.5} />
          </button>
        </div>
      )
    }
  ];

  // Cálculos para las tarjetas de resumen
  const stats = React.useMemo(() => {
    // Keep it simple for now, as we don't have global stats in the store yet
    const totalSacos = millingLogs.reduce((acc, log) => acc + (log.total_sacks || 0), 0);
    const finalizadas = millingLogs.filter(log => log.status === 'FINALIZADO' || log.status === 'COMPLETED').length;
    const tiempoPromedio = millingLogs.length > 0 ? "2.1h" : "0h";
    return { totalSacos, finalizadas, tiempoPromedio };
  }, [millingLogs]);

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
          <button
            className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            onClick={() => alert('Exportando historial...')}
          >
            <Download size={18} strokeWidth={1.5} className="mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Buscar por observaciones, mineral..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} strokeWidth={1.5} />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              >
                <option value="all">Todos los estados</option>
                <option value="IN_PROGRESS">En Proceso</option>
                <option value="COMPLETED">Finalizado</option>
              </select>
            </div>
          </div>

          <div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} strokeWidth={1.5} />
              <select className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer" defaultValue="week">
                <option value="week">Últimos 7 días</option>
                <option value="month">Este mes</option>
                <option value="quarter">Este trimestre</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <Table
        data={millingLogs}
        columns={columns}
        loading={logsLoading}
        pagination={{
          currentPage,
          totalPages: Math.ceil(logsCount / pageSize),
          pageSize,
          totalItems: logsCount,
          onPageChange: setCurrentPage
        }}
        emptyMessage="No se encontraron procesos registrados."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center">
          <div className="p-3 bg-indigo-50 rounded-xl mr-4 border border-indigo-100">
            <span className="text-indigo-600 font-bold">Σ</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total sacos procesados</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalSacos.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center">
          <div className="p-3 bg-emerald-50 rounded-xl mr-4 border border-emerald-100">
            <span className="text-emerald-600 font-bold">✓</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Moliendas finalizadas</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.finalizadas}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center">
          <div className="p-3 bg-amber-50 rounded-xl mr-4 border border-amber-100">
            <span className="text-amber-600 font-bold">⏱️</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tiempo promedio</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.tiempoPromedio}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Moliendas;