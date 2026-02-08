import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, MessageSquare, Eye, Edit, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { MillingLog } from '@/types';
import { useSupabaseStore } from '@/store/supabaseStore';
import { Table } from '@/components/common/Table';

const Moliendas: React.FC = () => {
  const { millingLogs, logsCount, logsLoading, fetchMillingLogs, mills, fetchMills } = useSupabaseStore();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMill, setSelectedMill] = useState<string>('all');
  const [selectedMineral, setSelectedMineral] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchMills();
  }, [fetchMills]);

  useEffect(() => {
    fetchMillingLogs({
      page: currentPage,
      pageSize,
      search,
      status: selectedStatus,
      millId: selectedMill,
      mineralType: selectedMineral,
      startDate,
      endDate
    });
  }, [fetchMillingLogs, currentPage, search, selectedStatus, selectedMill, selectedMineral, startDate, endDate]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus, selectedMill, selectedMineral, startDate, endDate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EN_PROCESO':
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold rounded-full">En Proceso</span>;
      case 'FINALIZADO':
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold rounded-full">Finalizado</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-slate-50 text-slate-700 border border-slate-100 text-xs font-semibold rounded-full">{status}</span>;
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
      key: 'mill_id',
      label: 'Molino',
      render: (session: MillingLog) => {
        // En moliendas futuras tendremos 'name', en las antiguas intentamos fallback usando el store
        const millInfo = Array.isArray(session.mills_used)
          ? session.mills_used.map((m: any) => {
            if (m.name) return m.name;
            const storeM = mills.find((sm: any) => sm.id === (m.id || m.mill_id));
            return storeM?.name || `Molino ${(m.id || m.mill_id || '??').substring(0, 4)}`;
          }).join(', ')
          : 'Molino';
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center mr-3 border border-indigo-100">
              <span className="font-bold text-xs text-indigo-600">M</span>
            </div>
            <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]" title={millInfo}>
              {millInfo}
            </span>
          </div>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Fecha',
      render: (session: MillingLog) => {
        const date = new Date(session.created_at);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-700">{date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
              {date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}
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
        return (
          <div className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {clientName}
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
    const finalizadas = millingLogs.filter(log => log.status === 'FINALIZADO').length;
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
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por observaciones..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="IN_PROGRESS">En Proceso</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </div>

          <div>
            <select
              value={selectedMill}
              onChange={(e) => setSelectedMill(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todos los molinos</option>
              {mills.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Fecha Inicio</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Fecha Fin</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Mineral</label>
            <select
              value={selectedMineral}
              onChange={(e) => setSelectedMineral(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">Tipos de mineral</option>
              <option value="OXIDO">Óxido</option>
              <option value="SULFURO">Sulfuro</option>
            </select>
          </div>

          <div className="flex justify-end order-last">
            <button
              onClick={() => {
                setSearch('');
                setSelectedStatus('all');
                setSelectedMill('all');
                setSelectedMineral('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest px-2 py-2"
            >
              Limpiar Filtros
            </button>
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