import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, MessageSquare, Eye, Edit, Trash2, Calendar, ChevronLeft, ChevronRight, Package, CheckCircle, Clock } from 'lucide-react';
import { MillingLog } from '@/types';
import { useSupabaseStore } from '@/store/supabaseStore';
import { Table } from '@/components/common/Table';
import { useModal } from '@/hooks/useModal';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';

const Moliendas: React.FC = () => {
  const { millingLogs, logsCount, logsLoading, fetchMillingLogs, mills, fetchMills, deleteMillingLog, loading } = useSupabaseStore();
  const deleteModal = useModal<{ id: string, name: string }>();
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
          <button
            onClick={() => {
              deleteModal.open({
                id: session.id,
                name: `molienda de ${session.clients?.name || 'Cliente'} (${session.total_sacks} sacos)`
              });
            }}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={18} strokeWidth={1.5} />
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

  const handleDeleteConfirm = async () => {
    if (deleteModal.data) {
      const success = await deleteMillingLog(deleteModal.data.id);
      if (success) {
        deleteModal.close();
      }
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto px-4 md:px-6">
      {/* HEADER INDUSTRIAL UNIFICADO */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">HISTORIAL TÉCNICO</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Bitácora de Moliendas</h1>
          <p className="text-slate-500 font-medium flex items-center mt-1">
            <Calendar size={16} className="mr-2 text-indigo-500" />
            Registro cronológico detallado de todos los procesos operativos
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="flex items-center px-5 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 font-bold text-sm">
            <MessageSquare size={18} className="mr-3" />
            WHATSAPP
          </button>
          <button
            onClick={() => alert('Exportando historial...')}
            className="flex items-center px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold text-sm"
          >
            <Download size={18} className="mr-3" />
            EXPORTAR ANALÍTICA
          </button>
        </div>
      </div>

      {/* KPI SUMMARY - ESTILO PREMIUM */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'TOTAL PROCESADO', value: stats.totalSacos.toLocaleString(), icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', suffix: 'Sacos' },
          { label: 'MOLIENDAS ÉXITO', value: stats.finalizadas.toLocaleString(), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', suffix: 'Protocolos' },
          { label: 'TIEMPO ESTIMADO', value: stats.tiempoPromedio, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', suffix: 'Horas/Prom' },
        ].map((kpi, i) => (
          <div key={i} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm transition-all duration-300">
            <div className="flex items-center">
              <div className={`p-4 ${kpi.bg} ${kpi.border} rounded-2xl border mr-5`}>
                <kpi.icon className={kpi.color} size={28} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{kpi.suffix}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FILTRADO AVANZADO - ESTILO INDUSTRIAL */}
      <div className="bg-slate-50 rounded-[2.5rem] p-6 lg:p-8 border border-white shadow-xl shadow-slate-200/50 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Búsqueda Técnica</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por cliente u observaciones..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado de Proceso</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer shadow-sm"
            >
              <option value="all">Todos los estados operativos</option>
              <option value="IN_PROGRESS">En Proceso (Activo)</option>
              <option value="FINALIZADO">Finalizado (Cerrado)</option>
            </select>
          </div>

          <div className="lg:col-span-3 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidad de Molienda</label>
            <select
              value={selectedMill}
              onChange={(e) => setSelectedMill(e.target.value)}
              className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer shadow-sm"
            >
              <option value="all">Todos los molinos</option>
              {mills.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 flex items-end">
            <button
              onClick={() => {
                setSearch('');
                setSelectedStatus('all');
                setSelectedMill('all');
                setSelectedMineral('all');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full h-[54px] text-[10px] font-black text-indigo-600 bg-indigo-50 border-2 border-indigo-100 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest"
            >
              RESET FILTROS
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-slate-200 pt-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rango Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rango Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Mineral</label>
            <select
              value={selectedMineral}
              onChange={(e) => setSelectedMineral(e.target.value)}
              className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none shadow-sm appearance-none cursor-pointer"
            >
              <option value="all">Todos los minerales</option>
              <option value="OXIDO">Mineral Óxido</option>
              <option value="SULFURO">Mineral Sulfuro</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE SECTION - DISEÑO TIPO REPORTE INDUSTRIAL */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
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
          emptyMessage="No se encontraron registros en el rango seleccionado."
        />
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDeleteConfirm}
        itemName={deleteModal.data?.name || ''}
        title="¿Confirmar borrado de molienda?"
        message="¿Estás seguro de borrar este registro? Los sacos se devolverán automáticamente al stock del cliente y se liberará el molino si estaba en proceso."
        isLoading={loading}
      />
    </div>
  );
};

export default Moliendas;
