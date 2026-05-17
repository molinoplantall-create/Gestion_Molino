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
import { Calendar, Users, Map, TrendingUp, TrendingDown, Package, Factory, Minus } from 'lucide-react';

type ViewMode = 'semana' | 'mes' | 'anio';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#818cf8', '#6366f1', '#8b5cf6', '#a78bfa', '#818cf8', '#6366f1', '#8b5cf6', '#a78bfa', '#818cf8'];

const ActivityChart: React.FC = () => {
  const { clients, zones } = useSupabaseStore();

  const [viewMode, setViewMode] = useState<ViewMode>('semana');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [allInputs, setAllInputs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [logsRes, intakeRes] = await Promise.all([
          supabase.from('milling_logs').select('*, clients(name, zone)').order('created_at', { ascending: false }),
          supabase.from('stock_batches').select('*, clients(name, zone)').order('created_at', { ascending: false })
        ]);
        if (!logsRes.error && logsRes.data) setAllLogs(logsRes.data);
        if (!intakeRes.error && intakeRes.data) setAllInputs(intakeRes.data);
      } catch (e) {
        console.error('Error fetching chart data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allLogs.forEach(log => years.add(new Date(log.created_at).getFullYear()));
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allLogs]);

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

    // anio → monthly aggregation
    if (viewMode === 'anio') {
      const yearStart = startOfYear(new Date(selectedYear, 0));
      const months = eachMonthOfInterval({ start: yearStart, end: endOfYear(yearStart) });
      const data = months.map(date => ({
        date, label: format(date, 'MMM', { locale: es }), sacos: 0, ingresos: 0, monthIndex: date.getMonth()
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
      const now = new Date();
      if (selectedYear === now.getFullYear()) return data.filter((_, i) => i <= now.getMonth());
      return data;
    }
    return [];
  }, [filteredLogs, filteredInputs, viewMode, selectedMonth, selectedYear]);

  const totalSacos = chartData.reduce((s, d) => s + d.sacos, 0);
  const totalIngresos = chartData.reduce((s, d) => s + d.ingresos, 0);

  // ── Annual summary stats ──
  const annualStats = useMemo(() => {
    if (viewMode !== 'anio') return null;
    const bestMonth = [...chartData].sort((a, b) => b.sacos - a.sacos)[0];
    const activeMonths = chartData.filter(m => m.sacos > 0).length;
    const avg = activeMonths > 0 ? Math.round(totalSacos / activeMonths) : 0;
    const prevMonth = chartData.length >= 2 ? chartData[chartData.length - 2] : null;
    const lastMonth = chartData.length >= 1 ? chartData[chartData.length - 1] : null;
    const trend = prevMonth && lastMonth
      ? ((lastMonth.sacos - prevMonth.sacos) / Math.max(prevMonth.sacos, 1)) * 100
      : 0;
    return { bestMonth, activeMonths, avg, trend };
  }, [chartData, viewMode, totalSacos]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white p-3 shadow-xl rounded-2xl border border-slate-100 min-w-[130px]">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center justify-between gap-3 py-0.5">
            <span className={`text-xs font-bold ${entry.name === 'sacos' ? 'text-indigo-600' : 'text-emerald-600'}`}>
              {entry.name === 'sacos' ? '⚙ Producción' : '📦 Ingreso'}
            </span>
            <span className="text-xs font-black text-slate-900">{(entry.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-base font-black text-slate-900">Actividad Reciente</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Ingresos vs. Producción comparados</p>
        </div>

        {/* View mode tabs */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
          {([{ key: 'semana', label: '7D' }, { key: 'mes', label: 'Mes' }, { key: 'anio', label: 'Año' }] as { key: ViewMode; label: string }[]).map(v => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === v.key
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters row ── */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {/* Mes / Año selectors */}
        {viewMode === 'mes' && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Calendar size={12} className="text-slate-400" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="text-[11px] font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>
        )}
        {(viewMode === 'mes' || viewMode === 'anio') && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="text-[11px] font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {/* Cliente */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 flex-1 min-w-[120px]">
          <Users size={12} className="text-slate-400 shrink-0" />
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
            className="text-[11px] font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer w-full truncate"
          >
            <option value="all">Todos los clientes</option>
            {clients.filter(c => c.is_active !== false).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Zona */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
          <Map size={12} className="text-slate-400 shrink-0" />
          <select
            value={selectedZone}
            onChange={e => setSelectedZone(e.target.value)}
            className="text-[11px] font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="all">Todas las zonas</option>
            {zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI pills ── */}
      <div className="flex gap-3 shrink-0">
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex-1">
          <Factory size={14} className="text-indigo-500 shrink-0" />
          <div>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Producción</p>
            <p className="text-sm font-black text-indigo-700">{totalSacos.toLocaleString()} <span className="text-[10px] font-bold">sacos</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 flex-1">
          <Package size={14} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Ingresos</p>
            <p className="text-sm font-black text-emerald-700">{totalIngresos.toLocaleString()} <span className="text-[10px] font-bold">sacos</span></p>
          </div>
        </div>
      </div>

      {/* ── Vista AÑO: tarjetas resumidas + gráfico de barras limpio ── */}
      {viewMode === 'anio' ? (
        <div className="flex flex-col gap-3 flex-1 overflow-hidden">

          {/* Stats del año */}
          {annualStats && (
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mejor mes</p>
                <p className="text-sm font-black text-slate-900">{annualStats.bestMonth ? MONTH_SHORT[annualStats.bestMonth.monthIndex] : '—'}</p>
                <p className="text-[10px] font-bold text-indigo-600">{(annualStats.bestMonth?.sacos || 0).toLocaleString()} scs</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Promedio</p>
                <p className="text-sm font-black text-slate-900">{annualStats.avg.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-slate-500">sacos/mes</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tendencia</p>
                <div className="flex items-center justify-center gap-1">
                  {annualStats.trend > 0
                    ? <TrendingUp size={14} className="text-emerald-500" />
                    : annualStats.trend < 0
                    ? <TrendingDown size={14} className="text-red-400" />
                    : <Minus size={14} className="text-slate-400" />
                  }
                  <p className={`text-sm font-black ${annualStats.trend > 0 ? 'text-emerald-600' : annualStats.trend < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                    {Math.abs(annualStats.trend).toFixed(0)}%
                  </p>
                </div>
                <p className="text-[10px] font-bold text-slate-400">vs. mes ant.</p>
              </div>
            </div>
          )}

          {/* Barras mensuales compactas — lista */}
          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {chartData.map((m, i) => {
              const maxSacos = Math.max(...chartData.map(x => x.sacos), 1);
              const pct = Math.round((m.sacos / maxSacos) * 100);
              return (
                <div key={i} className="flex items-center gap-3 group hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors">
                  <span className="text-[10px] font-black text-slate-500 uppercase w-8 shrink-0">{m.label}</span>
                  <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(pct, m.sacos > 0 ? 4 : 0)}%`,
                        background: `linear-gradient(90deg, #6366f1, #8b5cf6)`
                      }}
                    />
                  </div>
                  <div className="text-right shrink-0 w-20">
                    <span className="text-[11px] font-black text-slate-800">{m.sacos.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-400 font-bold ml-1">scs</span>
                    {m.ingresos > 0 && (
                      <span className="block text-[9px] text-emerald-600 font-bold">+{m.ingresos.toLocaleString()} ing</span>
                    )}
                  </div>
                </div>
              );
            })}
            {chartData.every(m => m.sacos === 0) && (
              <div className="text-center py-8 text-slate-400 text-sm font-medium">
                Sin producción registrada en {selectedYear}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Vista SEMANA / MES: gráfico de área/barras ── */
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'semana' ? (
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSacos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip content={customTooltip} />
                <Area type="monotone" dataKey="sacos" name="sacos" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#gradSacos)" animationDuration={1000} />
                <Area type="monotone" dataKey="ingresos" name="ingresos" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gradIngresos)" animationDuration={1000} />
              </AreaChart>
            ) : (
              <ComposedChart data={chartData} margin={{ top: 5, right: 8, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="sacos" name="sacos" radius={[5, 5, 0, 0]} barSize={chartData.length > 20 ? 10 : 18} fill="#6366f1" fillOpacity={0.85} />
                <Line type="monotone" dataKey="ingresos" name="ingresos" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Leyenda compacta ── */}
      <div className="flex items-center gap-4 shrink-0 pb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-indigo-500" />
          <span className="text-[10px] font-bold text-slate-500">Producción</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-slate-500">Ingresos stock</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityChart;
