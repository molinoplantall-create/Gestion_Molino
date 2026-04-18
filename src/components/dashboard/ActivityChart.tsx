import React, { useMemo, useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { useSupabaseStore } from '@/store/supabaseStore';
import { supabase } from '@/lib/supabase';
import {
  format, parseISO, subDays, startOfDay, isSameDay,
  startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval,
  startOfYear, endOfYear, subMonths
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Users, Map, Filter, BarChart3 } from 'lucide-react';

type ViewMode = 'semana' | 'mes' | 'anio';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];

const ActivityChart: React.FC = () => {
  const { millingLogs, clients, zones } = useSupabaseStore();

  // Filters
  const [viewMode, setViewMode] = useState<ViewMode>('semana');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Full milling logs (unfilterd, for charts)
  const [allLogs, setAllLogs] = useState<any[]>([]);

  // Fetch all logs for full history
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data, error } = await supabase
          .from('milling_logs')
          .select('*, clients(name, zone)')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setAllLogs(data);
        }
      } catch (e) {
        console.error('Error fetching all milling logs for chart:', e);
      }
    };
    fetchAll();
  }, [millingLogs.length]);

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allLogs.forEach(log => {
      years.add(new Date(log.created_at).getFullYear());
    });
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allLogs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      // Filter by client
      if (selectedClient !== 'all' && log.client_id !== selectedClient) return false;

      // Filter by zone (via client relationship)
      if (selectedZone !== 'all') {
        const clientZone = log.clients?.zone || '';
        if (clientZone !== selectedZone) return false;
      }

      return true;
    });
  }, [allLogs, selectedClient, selectedZone]);

  // Chart data based on view mode
  const chartData = useMemo(() => {
    if (filteredLogs.length === 0) return [];

    if (viewMode === 'semana') {
      // Last 7 days
      const days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        return {
          date: startOfDay(date),
          label: format(date, 'EEE dd', { locale: es }),
          sacos: 0
        };
      }).reverse();

      filteredLogs.forEach(log => {
        const logDate = startOfDay(parseISO(log.created_at));
        const day = days.find(d => isSameDay(d.date, logDate));
        if (day) day.sacos += (log.total_sacks || 0);
      });

      return days;
    }

    if (viewMode === 'mes') {
      // Days of selected month
      const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
      const monthEnd = endOfMonth(monthStart);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const days = daysInMonth.map(date => ({
        date: startOfDay(date),
        label: format(date, 'dd', { locale: es }),
        sacos: 0
      }));

      filteredLogs.forEach(log => {
        const logDate = startOfDay(parseISO(log.created_at));
        const day = days.find(d => isSameDay(d.date, logDate));
        if (day) day.sacos += (log.total_sacks || 0);
      });

      // Si es el mes y año actual, solo mostrar hasta hoy
      const now = new Date();
      if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth()) {
        const todayStr = format(now, 'dd', { locale: es });
        const todayInt = parseInt(todayStr);
        return days.filter((_, i) => i < todayInt);
      }

      return days;
    }

    if (viewMode === 'anio') {
      // Monthly aggregation for selected year
      const yearStart = startOfYear(new Date(selectedYear, 0));
      const yearEnd = endOfYear(yearStart);
      const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

      const monthlyData = months.map(date => ({
        date,
        label: format(date, 'MMM', { locale: es }),
        sacos: 0
      }));

      filteredLogs.forEach(log => {
        const logDate = parseISO(log.created_at);
        const logYear = logDate.getFullYear();
        const logMonth = logDate.getMonth();
        if (logYear === selectedYear) {
          const monthData = monthlyData[logMonth];
          if (monthData) monthData.sacos += (log.total_sacks || 0);
        }
      });

      // Si es el año actual, solo mostrar hasta el mes actual
      const now = new Date();
      if (selectedYear === now.getFullYear()) {
        const currentMonth = now.getMonth();
        return monthlyData.filter((_, i) => i <= currentMonth);
      }

      return monthlyData;
    }

    return [];
  }, [filteredLogs, viewMode, selectedMonth, selectedYear]);

  // Stats summary
  const totalSacos = chartData.reduce((sum, d) => sum + d.sacos, 0);
  const maxDay = chartData.reduce((max, d) => d.sacos > max.sacos ? d : max, { label: '-', sacos: 0 });
  const avgSacos = chartData.length > 0 ? Math.round(totalSacos / chartData.filter(d => d.sacos > 0).length || 1) : 0;

  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  if (allLogs.length === 0 && millingLogs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 font-medium italic">
        No hay datos de producción suficientes...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Vista: Semana / Mes / Año */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          {([
            { key: 'semana', label: '7 Días' },
            { key: 'mes', label: 'Mes' },
            { key: 'anio', label: 'Año' }
          ] as { key: ViewMode; label: string }[]).map(v => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === v.key
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Mes selector (solo si viewMode = mes) */}
        {viewMode === 'mes' && (
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>
        )}

        {/* Year selector (mes + año) */}
        {(viewMode === 'mes' || viewMode === 'anio') && (
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}

        {/* Separador visual */}
        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

        {/* Cliente */}
        <div className="flex items-center gap-1">
          <Users size={13} className="text-slate-400" />
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none max-w-[140px]"
          >
            <option value="all">Todos los clientes</option>
            {clients.filter(c => c.is_active !== false).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Zona */}
        <div className="flex items-center gap-1">
          <Map size={13} className="text-slate-400" />
          <select
            value={selectedZone}
            onChange={e => setSelectedZone(e.target.value)}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none max-w-[140px]"
          >
            <option value="all">Todas las zonas</option>
            {zones.map(z => (
              <option key={z.id} value={z.name}>{z.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-slate-500">Total:</span>
          <span className="font-black text-slate-800">{totalSacos.toLocaleString()} sacos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-500">Pico:</span>
          <span className="font-black text-slate-800">{maxDay.sacos} ({maxDay.label})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-slate-500">Promedio:</span>
          <span className="font-black text-slate-800">{avgSacos}/día</span>
        </div>
      </div>

      {/* Gráfico */}
      <div className={viewMode === 'semana' ? 'h-56' : 'h-64'}>
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'semana' ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSacos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                formatter={(value: number) => [`${value.toLocaleString()} sacos`, 'Producción']}
              />
              <Area
                type="monotone"
                dataKey="sacos"
                name="Sacos"
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSacos)"
                animationDuration={1200}
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                formatter={(value: number) => [`${value.toLocaleString()} sacos`, 'Producción']}
              />
              <Bar dataKey="sacos" name="Sacos" radius={[6, 6, 0, 0]} barSize={viewMode === 'anio' ? 28 : (chartData.length > 20 ? 12 : 20)}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ActivityChart;
