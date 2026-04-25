import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, MessageSquare, Trash2, Calendar, ChevronLeft, ChevronRight, Package, CheckCircle, Clock, FileText } from 'lucide-react';
import { MillingLog } from '@/types';
import { useSupabaseStore } from '@/store/supabaseStore';
import { Table } from '@/components/common/Table';
import { useModal } from '@/hooks/useModal';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { useAuthStore } from '@/store/authStore';
import { usePageFocus } from '@/hooks/usePageFocus';
import { formatNumber } from '@/utils/formatters';
import { printReceipt } from '@/utils/printReceipt';

const Moliendas: React.FC = () => {
  const { millingLogs, logsCount, logsLoading, fetchMillingLogs, mills, fetchMills, deleteMillingLog, loading, zones, fetchZones } = useSupabaseStore();
  const deleteModal = useModal<{ id: string, name: string }>();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMill, setSelectedMill] = useState<string>('all');
  const [selectedMineral, setSelectedMineral] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuthStore();
  const pageSize = 10;

  usePageFocus(() => {
    fetchMills();
    fetchZones();
  });

  useEffect(() => {
    fetchMillingLogs({
      page: currentPage,
      pageSize,
      search,
      status: selectedStatus,
      millId: selectedMill,
      mineralType: selectedMineral,
      startDate,
      endDate,
      zone: selectedZone
    });
  }, [fetchMillingLogs, currentPage, search, selectedStatus, selectedMill, selectedMineral, startDate, endDate, selectedZone]);

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

  const calculateDuration = (session: MillingLog) => {
    if (session.mineral_type === 'OXIDO') {
      return '1h 40min';
    } else {
      let mins = 120 + Math.ceil(session.total_sacks * 3);
      if (mins > 150) mins = 150;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}min`;
    }
  };

  const columns = [
    {
      key: 'created_at',
      label: 'Inicio/Fecha',
      render: (session: MillingLog) => {
        const date = new Date(session.created_at);
        return (
          <div className="flex flex-col">
            <div className="flex items-center text-sm font-bold text-slate-700">
              <Calendar size={12} className="mr-1.5 text-indigo-500" />
              {date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <div className="flex items-center text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-1">
              <Clock size={10} className="mr-1" />
              {date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
          </div>
        );
      }
    },
    {
      key: 'client_id',
      label: 'Cliente',
      render: (session: MillingLog) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-900">{session.clients?.name || 'Cliente'}</span>
          <span className="text-[10px] text-slate-400 font-medium">ID: {session.id.substring(0, 8)}</span>
        </div>
      )
    },
    {
      key: 'mills_used',
      label: 'Molino(s)',
      render: (session: MillingLog) => {
        const mills_used = session.mills_used || [];
        return (
          <div className="flex flex-wrap gap-1">
            {mills_used.map((m: any, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200">
                {m.name || `M-${m.id.substring(0, 4)}`}
              </span>
            ))}
            {mills_used.length === 0 && <span className="text-slate-300 italic text-xs">---</span>}
          </div>
        );
      }
    },
    {
      key: 'mineral_type',
      label: 'Carga Detalles',
      render: (session: MillingLog) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1 mb-1">
            {getMineralBadge(session.mineral_type)}
          </div>
          <div className="text-[10px] font-bold text-slate-500 flex gap-2">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded">C: {session.total_cuarzo || 0}</span>
            <span className="bg-slate-100 px-1.5 py-0.5 rounded">Ll: {session.total_llampo || 0}</span>
          </div>
        </div>
      )
    },
    {
      key: 'total_sacks',
      label: 'Sacos',
      className: 'text-center',
      render: (session: MillingLog) => (
        <div className="flex flex-col items-center">
          <span className="text-sm font-black text-slate-700">{session.total_sacks}</span>
          <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Total</span>
        </div>
      )
    },
    {
      key: 'estimated_end',
      label: 'Fin Estimado',
      render: (session: MillingLog) => {
        const start = new Date(session.created_at);
        const durationHours = session.mineral_type === 'SULFURO' ? 2.25 : 1.67;
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const isFinalized = session.status === 'FINALIZADO';

        return (
          <div className="flex flex-col">
            <span className={`text-sm font-bold ${isFinalized ? 'text-emerald-600' : 'text-amber-600'}`}>
              {end.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
              {isFinalized ? 'Completado' : 'Estimado'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'operator',
      label: 'Operador',
      className: 'text-center',
      render: (session: any) => (
        <div className="text-xs font-bold text-slate-600">{session.operator_name || '—'}</div>
      )
    },
    {
      key: 'status',
      label: 'Estado',
      className: 'text-right',
      render: (session: MillingLog) => {
        const start = new Date(session.created_at);
        const durationHours = session.mineral_type === 'SULFURO' ? 2.25 : 1.67;
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const isPast = end < new Date();
        const displayStatus = isPast ? 'FINALIZADO' : session.status;
        return (
          <div className="flex justify-end">
            {displayStatus === 'IN_PROGRESS' || displayStatus === 'EN_PROCESO' ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                En Proceso
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                <CheckCircle size={10} strokeWidth={3} />
                Finalizado
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (session: MillingLog) => (
        <div className="flex space-x-1 justify-end">
          <button
            onClick={() => {
              const mappedData = {
                clienteNombre: session.clients?.name || 'Cliente',
                tipoCliente: (session.clients as any)?.client_type || 'Minero',
                mineral: session.mineral_type,
                tiempos: {
                  oxido: { hora40: true, hora00: false },
                  sulfuro: { hora00: true, hora30: false }
                },
                fechaInicio: new Date(session.created_at).toLocaleDateString(),
                horaInicio: new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                horaFin: new Date(new Date(session.created_at).getTime() + (session.mineral_type === 'SULFURO' ? 2.25 : 1.67) * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                stockTotal: 0,
                totalSacos: session.total_sacks,
                totalCuarzo: session.total_cuarzo,
                totalLlampo: session.total_llampo,
                stockRestanteTotal: 0,
                tiempoPorMolino: session.mineral_type === 'OXIDO' ? 100 : 130,
                molinos: (session.mills_used || []).map((m: any) => ({
                  id: m.id,
                  nombre: m.name || `Molino ${m.id}`,
                  activo: true,
                  cuarzo: m.cuarzo || 0,
                  llampo: m.llampo || 0,
                  total: m.total || 0,
                  tiempoEstimado: 0,
                  horaFin: null
                })),
                observaciones: session.observations || '',
                procesoId: session.id.substring(0, 8),
                estado: session.status
              };
              printReceipt(mappedData as any, user?.nombre || user?.email || 'Operador');
            }}
            className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Vista Previa Ticket"
          >
            <FileText size={18} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => {
              deleteModal.open({
                id: session.id,
                name: `molienda de ${session.clients?.name || 'Cliente'} (${session.total_sacks} sacos)`
              });
            }}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar Log"
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
    <div className="space-y-4 pb-10 max-w-[1600px] mx-auto px-4 md:px-6">
      {/* HEADER INDUSTRIAL COMPACTO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-600">HISTORIAL TÉCNICO</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bitácora de Moliendas</h1>
          <p className="text-slate-500 font-medium text-xs flex items-center mt-0.5">
            <Calendar size={14} className="mr-1.5 text-indigo-500" />
            Registro cronológico detallado de todos los procesos operativos
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="flex items-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 font-bold text-xs">
            <MessageSquare size={16} className="mr-2" />
            WHATSAPP
          </button>
          <button
            onClick={() => alert('Exportando historial...')}
            className="flex items-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 font-bold text-xs"
          >
            <Download size={16} className="mr-2" />
            EXPORTAR ANALÍTICA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'TOTAL PROCESADO', value: formatNumber(stats.totalSacos), icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', suffix: 'Sacos' },
          { label: 'MOLIENDAS ÉXITO', value: formatNumber(stats.finalizadas), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', suffix: 'Logs' },
          { label: 'TIEMPO ESTIMADO', value: stats.tiempoPromedio, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', suffix: 'Horas/Prom' },
        ].map((kpi) => (
          <div key={kpi.label} className="group kpi-card p-4">
            <div className="flex items-center">
              <div className={`p-3 ${kpi.bg} ${kpi.border} rounded-xl border mr-4`}>
                <kpi.icon className={kpi.color} size={22} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{kpi.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{kpi.suffix}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FILTRADO AVANZADO - ESTILO INDUSTRIAL COMPACTO */}
      <div className="bg-slate-50 rounded-[1.5rem] p-4 lg:p-5 border border-white shadow-lg shadow-slate-200/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Búsqueda Técnica</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
              <input
                type="text"
                placeholder="Cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none appearance-none cursor-pointer shadow-sm text-xs"
            >
              <option value="all">Todos</option>
              <option value="IN_PROGRESS">En Proceso</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Molino</label>
            <select
              value={selectedMill}
              onChange={(e) => setSelectedMill(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none appearance-none cursor-pointer shadow-sm text-xs"
            >
              <option value="all">Todos</option>
              {mills.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Zona</label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none appearance-none cursor-pointer shadow-sm text-xs"
            >
              <option value="all">Todas</option>
              {zones.map(z => (
                <option key={z.id} value={z.name}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none shadow-sm text-xs"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none shadow-sm text-xs"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mineral</label>
            <select
              value={selectedMineral}
              onChange={(e) => setSelectedMineral(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none shadow-sm appearance-none cursor-pointer text-xs"
            >
              <option value="all">Todos</option>
              <option value="OXIDO">Oxido</option>
              <option value="SULFURO">Sulfuro</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('');
                setSelectedStatus('all');
                setSelectedMill('all');
                setSelectedMineral('all');
                setSelectedZone('all');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full py-2 px-2 text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest h-[34px] flex items-center justify-center"
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      {/* TABLE SECTION - DISEÑO COMPACTO */}
      <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
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
          emptyMessage="No se encontraron registros."
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
