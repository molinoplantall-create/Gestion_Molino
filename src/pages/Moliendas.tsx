import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, Trash2, Calendar, Package, CheckCircle,
  Clock, FileText, Printer, Activity, BarChart2, Edit3, X, Save,
  ChevronUp, ChevronDown, XCircle
} from 'lucide-react';
import { MillingLog } from '@/types';
import { useSupabaseStore } from '@/store/supabaseStore';
import { Table } from '@/components/common/Table';
import { useModal } from '@/hooks/useModal';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { useAuthStore } from '@/store/authStore';
import { formatNumber } from '@/utils/formatters';
import { printReceipt } from '@/utils/printReceipt';
import { printGlobalReport } from '@/utils/printGlobalReport';
import * as XLSX from 'xlsx';

// ──────────────────────────────────────────────────────────────────────────────
// EDIT OBSERVATIONS MODAL
// ──────────────────────────────────────────────────────────────────────────────
const EditObsModal: React.FC<{
  log: MillingLog | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, obs: string) => Promise<void>;
  isSaving: boolean;
}> = ({ log, isOpen, onClose, onSave, isSaving }) => {
  const [obs, setObs] = useState('');

  useEffect(() => {
    if (log) setObs(log.observations || '');
  }, [log]);

  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
              <Edit3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">Editar Observaciones</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                {log.clients?.name || 'Molienda'} · {new Date(log.created_at).toLocaleDateString('es-PE')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-4">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
            Observaciones / Notas
          </label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={4}
            placeholder="Escribe las observaciones de esta molienda..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
          />
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(log.id, obs)}
            disabled={isSaving}
            className="px-5 py-2 text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all flex items-center gap-2 shadow-sm shadow-indigo-200"
          >
            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────
const Moliendas: React.FC = () => {
  const {
    millingLogs, logsCount, logsLoading, fetchMillingLogs,
    mills, fetchMills, deleteMillingLog, updateMillingLog,
    loading, zones, fetchZones, allClients, fetchAllClients
  } = useSupabaseStore();

  const deleteModal = useModal<{ id: string; name: string }>();
  const { user } = useAuthStore();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMill, setSelectedMill] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedMineral, setSelectedMineral] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 20;

  // ── Edit obs modal ─────────────────────────────────────────────────────────
  const [editingLog, setEditingLog] = useState<MillingLog | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Debounce search
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  // Initial load
  useEffect(() => {
    fetchMills();
    fetchZones();
    fetchAllClients();
  }, []);

  // Refetch on filter/sort/page change
  useEffect(() => {
    fetchMillingLogs({
      page: currentPage,
      pageSize,
      search: debouncedSearch,
      status: selectedStatus,
      millId: selectedMill,
      clientId: selectedClient,
      mineralType: selectedMineral,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      zone: selectedZone,
      sortBy,
      sortOrder,
    });
  }, [currentPage, debouncedSearch, selectedStatus, selectedMill, selectedClient,
    selectedMineral, startDate, endDate, selectedZone, sortBy, sortOrder]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedStatus, selectedMill, selectedClient, selectedMineral, startDate, endDate, selectedZone]);

  // ── Sort handler ───────────────────────────────────────────────────────────
  const handleSort = useCallback((key: string) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  }, [sortBy]);

  // ── Reset filters ──────────────────────────────────────────────────────────
  const handleReset = () => {
    setSearch('');
    setSelectedStatus('all');
    setSelectedMill('all');
    setSelectedClient('all');
    setSelectedMineral('all');
    setSelectedZone('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasFilters = search || selectedStatus !== 'all' || selectedMill !== 'all' ||
    selectedClient !== 'all' || selectedMineral !== 'all' || selectedZone !== 'all' ||
    startDate || endDate;

  // ── KPI Stats (based on current page logs) ─────────────────────────────────
  const stats = React.useMemo(() => {
    const totalSacos = millingLogs.reduce((acc, log) => acc + (log.total_sacks || 0), 0);
    const finalizadas = millingLogs.filter(log => log.status === 'FINALIZADO' || log.status === 'COMPLETED').length;

    // Estimate duration in hours per log
    const durationHours = millingLogs.map(log => log.mineral_type === 'OXIDO' ? 1.67 : 2.25);
    const avgDuration = durationHours.length > 0
      ? (durationHours.reduce((a, b) => a + b, 0) / durationHours.length)
      : 0;

    const totalHours = durationHours.reduce((a, b) => a + b, 0);
    const avgRendimiento = totalHours > 0 ? (totalSacos / totalHours) : 0;

    return { totalSacos, finalizadas, avgDuration, avgRendimiento };
  }, [millingLogs]);

  // ── Edit obs save ──────────────────────────────────────────────────────────
  const handleSaveObs = async (id: string, observations: string) => {
    setIsSaving(true);
    await updateMillingLog(id, { observations } as any);
    setIsSaving(false);
    setEditingLog(null);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (deleteModal.data) {
      const success = await deleteMillingLog(deleteModal.data.id);
      if (success) deleteModal.close();
    }
  };

  // ── Export Excel ───────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (millingLogs.length === 0) {
      alert('No hay datos para exportar con los filtros actuales.');
      return;
    }

    const rows = millingLogs.map(log => {
      const date = new Date(log.created_at);
      const durationMin = log.mineral_type === 'OXIDO' ? 100 : 135;
      const durationH = durationMin / 60;
      return {
        'Fecha': date.toLocaleDateString('es-PE'),
        'Hora': date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
        'Cliente': log.clients?.name || 'N/A',
        'Mineral': log.mineral_type,
        'Sacos Totales': log.total_sacks || 0,
        'Cuarzo': log.total_cuarzo || 0,
        'Llampo': log.total_llampo || 0,
        'Molinos': (log.mills_used || []).map((m: any) => m.name || m.id).join(', '),
        'Duración': `${Math.floor(durationMin / 60)}h ${durationMin % 60}min`,
        'Rendimiento (sacos/hora)': log.total_sacks && durationH > 0
          ? Math.round(log.total_sacks / durationH) : 0,
        'Estado': log.status,
        'Observaciones': log.observations || '',
        'Operador': log.operator_name || 'N/A',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bitácora');

    // Column widths
    ws['!cols'] = [12, 8, 22, 10, 14, 10, 10, 24, 12, 12, 14, 30, 16].map(w => ({ wch: w }));

    XLSX.writeFile(wb, `Bitacora_Moliendas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getStatusConfig = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'IN_PROGRESS' || s === 'EN_PROCESO') {
      return {
        label: 'En Proceso',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500 animate-pulse',
        rowBg: 'bg-amber-50/30',
      };
    }
    if (s === 'FINALIZADO' || s === 'COMPLETED') {
      return {
        label: 'Finalizado',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        rowBg: '',
      };
    }
    if (s === 'CANCELADO' || s === 'CANCELLED') {
      return {
        label: 'Cancelado',
        className: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
        rowBg: 'bg-red-50/20',
      };
    }
    return {
      label: status,
      className: 'bg-slate-50 text-slate-600 border-slate-200',
      dot: 'bg-slate-400',
      rowBg: '',
    };
  };

  // ── Column sort icon ───────────────────────────────────────────────────────
  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortBy !== colKey) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortOrder === 'asc'
      ? <ChevronUp className="w-3 h-3 text-indigo-600" />
      : <ChevronDown className="w-3 h-3 text-indigo-600" />;
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'created_at',
      label: (
        <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 group">
          <span>Fecha / Hora</span><SortIcon colKey="created_at" />
        </button>
      ) as any,
      render: (session: MillingLog) => {
        const date = new Date(session.created_at);
        return (
          <div className="flex flex-col min-w-[90px]">
            <div className="flex items-center text-xs font-bold text-slate-700">
              <Calendar size={11} className="mr-1.5 text-indigo-400" />
              {date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </div>
            <div className="flex items-center text-[10px] text-slate-400 font-medium mt-0.5">
              <Clock size={9} className="mr-1" />
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
        <div className="flex flex-col min-w-[120px]">
          <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]" title={session.clients?.name}>
            {session.clients?.name || 'N/A'}
          </span>
          <span className="text-[9px] text-slate-400 font-mono">{session.id.substring(0, 8)}…</span>
        </div>
      )
    },
    {
      key: 'mills_used',
      label: 'Molino(s)',
      className: 'hidden md:table-cell',
      render: (session: MillingLog) => {
        const mills_used = session.mills_used || [];
        return (
          <div className="flex flex-wrap gap-1 max-w-[120px]">
            {mills_used.map((m: any, idx: number) => (
              <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold border border-slate-200 truncate">
                {m.name || `M-${String(m.id).substring(0, 4)}`}
              </span>
            ))}
            {mills_used.length === 0 && <span className="text-slate-300 italic text-[10px]">—</span>}
          </div>
        );
      }
    },
    {
      key: 'mineral_type',
      label: 'Mineral',
      className: 'hidden lg:table-cell',
      render: (session: MillingLog) => (
        <div className="flex flex-col gap-1">
          <span className={`self-start px-2 py-0.5 text-[10px] font-bold rounded-full border ${session.mineral_type === 'OXIDO'
            ? 'bg-blue-50 text-blue-700 border-blue-100'
            : 'bg-purple-50 text-purple-700 border-purple-100'
            }`}>
            {session.mineral_type === 'OXIDO' ? 'Óxido' : 'Sulfuro'}
          </span>
          <div className="text-[9px] text-slate-400 font-medium flex gap-1">
            <span>C:{session.total_cuarzo || 0}</span>
            <span>Ll:{session.total_llampo || 0}</span>
          </div>
        </div>
      )
    },
    {
      key: 'total_sacks',
      label: (
        <button onClick={() => handleSort('total_sacks')} className="flex items-center gap-1 group">
          <span>Sacos</span><SortIcon colKey="total_sacks" />
        </button>
      ) as any,
      className: 'text-center hidden sm:table-cell',
      render: (session: MillingLog) => (
        <div className="flex flex-col items-center">
          <span className="text-sm font-black text-slate-900">{session.total_sacks || 0}</span>
          <span className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">total</span>
        </div>
      )
    },
    {
      key: 'duration',
      label: 'Duración',
      className: 'text-center hidden xl:table-cell',
      render: (session: MillingLog) => {
        // OXIDO = 100 min (1h 40min), SULFURO = 135 min (2h 15min)
        const totalMin = session.mineral_type === 'OXIDO' ? 100 : 135;
        const horas = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        return (
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-slate-700">{horas}h {mins}min</span>
            <span className="text-[9px] text-slate-400">estimado</span>
          </div>
        );
      }
    },
    {
      key: 'productivity',
      label: 'Rendimiento',
      className: 'text-center hidden xl:table-cell',
      render: (session: MillingLog) => {
        const totalMin = session.mineral_type === 'OXIDO' ? 100 : 135;
        const h = totalMin / 60;
        const rate = h > 0 ? ((session.total_sacks || 0) / h) : 0;
        return (
          <div className="flex flex-col items-center">
            <span className={`text-xs font-black ${rate > 20 ? 'text-emerald-600' : rate > 10 ? 'text-amber-600' : 'text-slate-500'}`}>
              {rate.toFixed(0)}
            </span>
            <span className="text-[9px] text-slate-400">sacos/hora</span>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Estado',
      render: (session: MillingLog) => {
        const cfg = getStatusConfig(session.status);
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${cfg.className}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (session: MillingLog) => {
        const isInProgress = session.status === 'IN_PROGRESS' || session.status === 'EN_PROCESO';
        return (
          <div className="flex items-center gap-1 justify-end">
            {/* Editar observaciones (solo EN PROCESO) */}
            {isInProgress && (
              <button
                onClick={() => setEditingLog(session)}
                className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Editar observaciones"
              >
                <Edit3 size={15} strokeWidth={2} />
              </button>
            )}
            {/* Ticket */}
            <button
              onClick={() => {
                const mappedData = {
                  clienteNombre: session.clients?.name || 'Cliente',
                  tipoCliente: (session.clients as any)?.client_type || 'Minero',
                  mineral: session.mineral_type,
                  tiempos: { oxido: { hora40: true, hora00: false }, sulfuro: { hora00: true, hora30: false } },
                  fechaInicio: new Date(session.created_at).toLocaleDateString(),
                  horaInicio: new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                  horaFin: new Date(new Date(session.created_at).getTime() + (session.mineral_type === 'SULFURO' ? 2.25 : 1.67) * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                  stockTotal: 0,
                  totalSacos: session.total_sacks,
                  totalCuarzo: session.total_cuarzo,
                  totalLlampo: session.total_llampo,
                  stockRestanteTotal: 0,
                  tiempoPorMolino: session.mineral_type === 'OXIDO' ? 100 : 130,
                  molinos: (session.mills_used || []).map((m: any) => ({
                    id: m.id, nombre: m.name || `Molino ${m.id}`, activo: true,
                    cuarzo: m.cuarzo || 0, llampo: m.llampo || 0, total: m.total || 0,
                    tiempoEstimado: 0, horaFin: null
                  })),
                  observaciones: session.observations || '',
                  procesoId: session.id.substring(0, 8),
                  estado: session.status
                };
                printReceipt(mappedData as any, user?.nombre || user?.email || 'Operador');
              }}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Ver Ticket"
            >
              <FileText size={15} strokeWidth={1.5} />
            </button>
            {/* Eliminar */}
            <button
              onClick={() => deleteModal.open({
                id: session.id,
                name: `molienda de ${session.clients?.name || 'Cliente'} (${session.total_sacks} sacos)`
              })}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          </div>
        );
      }
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-10 max-w-[1600px] mx-auto px-4 md:px-6">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-600">HISTORIAL TÉCNICO</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bitácora de Moliendas</h1>
          <p className="text-slate-500 font-medium text-xs flex items-center mt-0.5">
            <Calendar size={13} className="mr-1.5 text-indigo-400" />
            Registro cronológico detallado de todos los procesos operativos
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => printGlobalReport(millingLogs, user?.nombre || user?.email || 'Desconocido')}
            className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm font-bold text-xs gap-2"
          >
            <Printer size={15} />
            Imprimir Informe
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 font-bold text-xs gap-2"
          >
            <Download size={15} />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'TOTAL MOLIENDAS', value: formatNumber(logsCount),
            icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', suffix: 'registros'
          },
          {
            label: 'SACOS PROCESADOS', value: formatNumber(stats.totalSacos),
            icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', suffix: 'sacos'
          },
          {
            label: 'DURACIÓN PROM.', value: stats.avgDurationLabel,
            icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', suffix: ''
          },
          {
            label: 'RENDIMIENTO PROM.', value: String(stats.avgRendimiento),
            icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', suffix: 'sacos/hora'
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all">
            <div className={`p-2.5 ${kpi.bg} ${kpi.border} rounded-xl border shrink-0`}>
              <kpi.icon className={`${kpi.color} w-5 h-5`} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">{kpi.label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900 tracking-tight">{kpi.value}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">{kpi.suffix}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTERS ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtros</p>
          {hasFilters && (
            <button onClick={handleReset} className="flex items-center gap-1 text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">
              <XCircle size={11} />Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-2">
          {/* Búsqueda por cliente / observaciones */}
          <div className="col-span-2 xl:col-span-2 space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Buscar cliente</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={14} />
              <input
                type="text"
                placeholder="Nombre de cliente u observación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all text-xs"
              />
            </div>
          </div>

          {/* Estado */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Estado</label>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none appearance-none cursor-pointer text-xs focus:border-indigo-500 focus:bg-white transition-all">
              <option value="all">Todos</option>
              <option value="IN_PROGRESS">En Proceso</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          {/* Molino */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Molino</label>
            <select value={selectedMill} onChange={(e) => setSelectedMill(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none appearance-none cursor-pointer text-xs focus:border-indigo-500 focus:bg-white transition-all">
              <option value="all">Todos</option>
              {mills.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Cliente */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Cliente</label>
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none appearance-none cursor-pointer text-xs focus:border-indigo-500 focus:bg-white transition-all">
              <option value="all">Todos</option>
              {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Mineral */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Mineral</label>
            <select value={selectedMineral} onChange={(e) => setSelectedMineral(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none appearance-none cursor-pointer text-xs focus:border-indigo-500 focus:bg-white transition-all">
              <option value="all">Todos</option>
              <option value="OXIDO">Óxido</option>
              <option value="SULFURO">Sulfuro</option>
            </select>
          </div>

          {/* Fecha inicio */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Desde</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none text-xs focus:border-indigo-500 focus:bg-white transition-all" />
          </div>

          {/* Fecha fin */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Hasta</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none text-xs focus:border-indigo-500 focus:bg-white transition-all" />
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        <Table
          data={millingLogs}
          columns={columns}
          loading={logsLoading}
          pagination={{
            currentPage,
            totalPages: Math.max(1, Math.ceil(logsCount / pageSize)),
            pageSize,
            totalItems: logsCount,
            onPageChange: setCurrentPage
          }}
          emptyMessage="No se encontraron registros."
          emptyDescription={hasFilters ? 'Intenta con otros filtros.' : undefined}
        />
      </div>

      {/* ── MODALS ── */}
      <EditObsModal
        log={editingLog}
        isOpen={!!editingLog}
        onClose={() => setEditingLog(null)}
        onSave={handleSaveObs}
        isSaving={isSaving}
      />
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
