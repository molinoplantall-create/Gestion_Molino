import React, { useMemo, useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  ComposedChart, Line
} from 'recharts';
import { useSupabaseStore } from '@/store/supabaseStore';
import { supabase } from '@/lib/supabase';
import {
  format, parseISO, subDays, startOfDay, isSameDay,
  startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval,
  startOfYear, endOfYear
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, Map, TrendingUp, TrendingDown, Package, Factory, Minus } from 'lucide-react';

export type ChartViewMode = 'semana' | 'mes' | 'anio';

export interface ActivityChartProps {
  /** Período controlado externamente desde el Dashboard */
  viewMode: ChartViewMode;
  selectedYear: number;
  selectedMonth: number;
  /** Filtros opcionales de cliente/zona internos al chart */
  showFilters?: boolean;
}

const MONTH_NAMES_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Paleta por mes para modo AÑO — degradado indigo-violet
const MONTH_COLORS = [
  '#6366f1','#7c3aed','#8b5cf6','#6366f1','#7c3aed','#a78bfa',
  '#6366f1','#7c3aed','#8b5cf6','#6366f1','#7c3aed','#a78bfa'
];

const ActivityChart: React.FC<ActivityChartProps> = ({
  viewMode,
  selectedYear,
  selectedMonth,
  showFilters = true,
}) => {
  const { clients, zones } = useSupabaseStore();

  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [allInputs, setAllInputs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [logsRes, intakeRes] = await Promise.all([
          supabase.from('milling_logs').select('*, clients(name, zone)').order('created_at', { ascending: false }),
          supabase.from('stock_batches').select('*, clients(name, zone)').order('created_at', { ascending: false })
        ]);
        if (!logsRes.error && logsRes.data) setAllLogs(logsRes.data);
        if (!intakeRes.error && intakeRes.data) setAllInputs(intakeRes.data);
      } catch (e) {
        console.error('ActivityChart fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filteredLogs = useMemo(() =>
    allLogs.filter(log => {
      if (selectedClient !== 'all' && log.client_id !== selectedClient) return false;
      if (selectedZone !== 'all' && (log.clients?.zone || '') !== selectedZone) return false;
      return true;
    }), [allLogs, selectedClient, selectedZone]);

  const filteredInputs = useMemo(() =>
    allInputs.filter(input => {
      if (selectedClient !== 'all' && input.client_id !== selectedClient) return false;
      if (selectedZone !== 'all' && (input.clients?.zone || '') !== selectedZone) return false;
      return true;
    }), [allInputs, selectedClient, selectedZone]);

  // ── Chart data ──
  const chartData = useMemo(() => {
    if (viewMode === 'semana') {
      const days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        return { date: startOfDay(date), label: format(date, 'EEE dd', { locale: es }), sacos: 0, ingresos: 0 };
      }).reverse();
      filteredLogs.forEach(log => {
        const day = days.find(d => isSameDay(d.date, startOfDay(parseISO(log.created_at))));
        if (day) day.sacos += (log.total_sacks || 0);
      });
      filteredInputs.forEach(input => {
        const day = days.find(d => isSameDay(d.date, startOfDay(parseISO(input.created_at))));
        if (day) day.ingresos += (input.initial_quantity || 0);
      });
      return days;
    }

    if (viewMode === 'mes') {
      const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
      const monthEnd = endOfMonth(monthStart);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map(date => ({
        date: startOfDay(date), label: format(date, 'dd', { locale: es }), sacos: 0, ingresos: 0
      }));
      filteredLogs.forEach(log => {
        const day = days.find(d => isSameDay(d.date, startOfDay(parseISO(log.created_at))));
        if (day) day.sacos += (log.total_sacks || 0);
      });
      filteredInputs.forEach(input => {
        const day = days.find(d => isSameDay(d.date, startOfDay(parseISO(input.created_at))));
        if (day) day.ingresos += (input.initial_quantity || 0);
      });
      const now = new Date();
      if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth()) {
        return days.filter((_, i) => i < parseInt(format(now, 'dd')));
      }
      return days;
    }

    // anio → 12 monthly bars (all months, no scroll)
    const yearStart = startOfYear(new Date(selectedYear, 0));
    const months = eachMonthOfInterval({ start: yearStart, end: endOfYear(yearStart) });
    const data = months.map((date, idx) => ({
      date,
      label: MONTH_SHORT[idx],
      fullLabel: MONTH_NAMES_FULL[idx],
      sacos: 0,
      ingresos: 0,
      monthIndex: idx
    }));
    filteredLogs.forEach(log => {
      const d = parseISO(log.created_at);
      if (d.getFullYear() === selectedYear) {
        const m = data[d.getMonth()];
        if (m) m.sacos += (log.total_sacks || 0);
      }
    });
    filteredInputs.forEach(input => {
      const d = parseISO(input.created_at);
      if (d.getFullYear() === selectedYear) {
        const m = data[d.getMonth()];
        if (m) m.ingresos += (input.initial_quantity || 0);
      }
    });
    // Always return all 12 months (no filter) — show future months as 0
    return data;
  }, [filteredLogs, filteredInputs, viewMode, selectedMonth, selectedYear]);

  const totalSacos = chartData.reduce((s, d) => s + d.sacos, 0);
  const totalIngresos = chartData.reduce((s, d) => s + d.ingresos, 0);

  // Annual stats for quick pills
  const annualStats = useMemo(() => {
    if (viewMode !== 'anio') return null;
    const withData = chartData.filter(m => m.sacos > 0);
    const bestMonth = [...withData].sort((a, b) => b.sacos - a.sacos)[0];
    const avg = withData.length > 0 ? Math.round(totalSacos / withData.length) : 0;
    const now = new Date();
    const curIdx = selectedYear === now.getFullYear() ? now.getMonth() : chartData.length - 1;
    const prev = curIdx > 0 ? chartData[curIdx - 1]?.sacos || 0 : 0;
    const cur = chartData[curIdx]?.sacos || 0;
    const trend = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
    return { bestMonth, avg, trend, activeMonths: withData.length };
  }, [chartData, viewMode, totalSacos, selectedYear]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    // For year view, get full month name
    const fullLabel = payload[0]?.payload?.fullLabel || label;
    return (
      <div className="bg-white p-3 shadow-xl rounded-2xl border border-slate-100 min-w-[140px]">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1">{fullLabel}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center justify-between gap-3 py-0.5">
            <span className={`text-[11px] font-bold ${entry.name === 'sacos' ? 'text-indigo-600' : 'text-emerald-600'}`}>
              {entry.name === 'sacos' ? '⚙ Prod.' : '📦 Ing.'}
            </span>
            <span className="text-[11px] font-black text-slate-900">{(entry.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">

      {/* ── KPI pills ── */}
      <div className="flex gap-2 shrink-0">
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex-1">
          <Factory size={13} className="text-indigo-500 shrink-0" />
          <div>
            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none">Producción</p>
            <p className="text-sm font-black text-indigo-700 leading-tight">{totalSacos.toLocaleString()} <span className="text-[9px] font-bold">scs</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 flex-1">
          <Package size={13} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none">Ingresos</p>
            <p className="text-sm font-black text-emerald-700 leading-tight">{totalIngresos.toLocaleString()} <span className="text-[9px] font-bold">scs</span></p>
          </div>
        </div>
        {viewMode === 'anio' && annualStats && (
          <>
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 flex-1">
              <div>
                <p className="text-[8px] font-black text-violet-400 uppercase tracking-widest leading-none">Mejor mes</p>
                <p className="text-sm font-black text-violet-700 leading-tight">
                  {annualStats.bestMonth ? MONTH_SHORT[annualStats.bestMonth.monthIndex] : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-1">
              <div className="flex items-center gap-1">
                {annualStats.trend > 0
                  ? <TrendingUp size={12} className="text-emerald-500" />
                  : annualStats.trend < 0
                  ? <TrendingDown size={12} className="text-red-400" />
                  : <Minus size={12} className="text-slate-400" />}
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Tendencia</p>
                <p className={`text-sm font-black leading-tight ${annualStats.trend > 0 ? 'text-emerald-600' : annualStats.trend < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                  {Math.abs(annualStats.trend).toFixed(0)}%
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Filtros cliente/zona ── */}
      {showFilters && (
        <div className="flex gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 flex-1 min-w-0">
            <Users size={11} className="text-slate-400 shrink-0" />
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="text-[10px] font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="all">Todos los clientes</option>
              {clients.filter(c => c.is_active !== false).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Map size={11} className="text-slate-400 shrink-0" />
            <select
              value={selectedZone}
              onChange={e => setSelectedZone(e.target.value)}
              className="text-[10px] font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Todas las zonas</option>
              {zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Gráfico ── */}
      <div className="flex-1 min-h-0">
        {viewMode === 'anio' ? (
          /* AÑO: BarChart compacto con todos los 12 meses sin scroll */
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 4, left: -28, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                interval={0}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip content={customTooltip} cursor={{ fill: '#f8fafc', radius: 4 }} />
              <Bar dataKey="sacos" name="sacos" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.label}
                    fill={entry.sacos > 0 ? MONTH_COLORS[index % MONTH_COLORS.length] : '#e2e8f0'}
                    fillOpacity={entry.sacos > 0 ? 1 : 0.6}
                  />
                ))}
              </Bar>
              <Bar dataKey="ingresos" name="ingresos" radius={[3, 3, 0, 0]} maxBarSize={12} fill="#10b981" fillOpacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        ) : viewMode === 'semana' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSacos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip content={customTooltip} />
              <Area type="monotone" dataKey="sacos" name="sacos" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#gradSacos)" />
              <Area type="monotone" dataKey="ingresos" name="ingresos" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradIngresos)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* MES: ComposedChart barras diarias */
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                interval={Math.ceil(chartData.length / 10) - 1}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="sacos" name="sacos" radius={[4, 4, 0, 0]} barSize={chartData.length > 20 ? 8 : 14} fill="#6366f1" fillOpacity={0.85} />
              <Line type="monotone" dataKey="ingresos" name="ingresos" stroke="#10b981" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Leyenda mini ── */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-indigo-500" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Producción</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ingresos</span>
        </div>
        {viewMode === 'anio' && (
          <span className="text-[9px] text-slate-300 font-bold ml-auto">Barras claras = meses sin producción</span>
        )}
      </div>
    </div>
  );
};

export default ActivityChart;
