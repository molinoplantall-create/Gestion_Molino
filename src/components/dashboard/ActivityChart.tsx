import React, { useMemo, useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  Line, ComposedChart, Legend
} from 'recharts';
import { useSupabaseStore } from '@/store/supabaseStore';
import { supabase } from '@/lib/supabase';
import {
  format, parseISO, subDays, startOfDay, isSameDay,
  startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval,
  startOfYear, endOfYear, subMonths
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Users, Map, Filter, BarChart3, Info, ArrowRightLeft, X, TrendingUp, History } from 'lucide-react';

type ViewMode = 'semana' | 'mes' | 'anio';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];

const ActivityChart: React.FC = () => {
  const { millingLogs, clients, zones, allClients } = useSupabaseStore();

  // Filters
  const [viewMode, setViewMode] = useState<ViewMode>('semana');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Full milling logs and intake logs (unfiltered, for charts)
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [allInputs, setAllInputs] = useState<any[]>([]);

  // Fetch all logs and inputs for full history
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch Milling Logs
        const { data: logsData, error: logsError } = await supabase
          .from('milling_logs')
          .select('*, clients(name, zone)')
          .order('created_at', { ascending: false });

        if (!logsError && logsData) setAllLogs(logsData);

        // Fetch Intake (stock_batches)
        const { data: intakeData, error: intakeError } = await supabase
          .from('stock_batches')
          .select('*, clients(name, zone)')
          .order('created_at', { ascending: false });

        if (!intakeError && intakeData) setAllInputs(intakeData);

      } catch (e) {
        console.error('Error fetching data for chart:', e);
      }
    };
    fetchAllData();
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

  // Apply filters to both logs and inputs
  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      if (selectedClient !== 'all' && log.client_id !== selectedClient) return false;
      if (selectedZone !== 'all') {
        const clientZone = log.clients?.zone || '';
        if (clientZone !== selectedZone) return false;
      }
      return true;
    });
  }, [allLogs, selectedClient, selectedZone]);

  const filteredInputs = useMemo(() => {
    return allInputs.filter(input => {
      if (selectedClient !== 'all' && input.client_id !== selectedClient) return false;
      if (selectedZone !== 'all') {
        const clientZone = input.clients?.zone || '';
        if (clientZone !== selectedZone) return false;
      }
      return true;
    });
  }, [allInputs, selectedClient, selectedZone]);

  // Chart data based on view mode (Mixing Production and Intake)
  const chartData = useMemo(() => {
    if (filteredLogs.length === 0 && filteredInputs.length === 0) return [];

    if (viewMode === 'semana') {
      const days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        return {
          date: startOfDay(date),
          label: format(date, 'EEE dd', { locale: es }),
          sacos: 0,
          ingresos: 0
        };
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
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const days = daysInMonth.map(date => ({
        date: startOfDay(date),
        label: format(date, 'dd', { locale: es }),
        sacos: 0,
        ingresos: 0
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
        const todayInt = parseInt(format(now, 'dd'));
        return days.filter((_, i) => i < todayInt);
      }
      return days;
    }

    if (viewMode === 'anio') {
      const yearStart = startOfYear(new Date(selectedYear, 0));
      const yearEnd = endOfYear(yearStart);
      const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

      const monthlyData = months.map(date => ({
        date,
        label: format(date, 'MMM', { locale: es }),
        sacos: 0,
        ingresos: 0
      }));

      filteredLogs.forEach(log => {
        const logDate = parseISO(log.created_at);
        if (logDate.getFullYear() === selectedYear) {
          const mData = monthlyData[logDate.getMonth()];
          if (mData) mData.sacos += (log.total_sacks || 0);
        }
      });

      filteredInputs.forEach(input => {
        const inputDate = parseISO(input.created_at);
        if (inputDate.getFullYear() === selectedYear) {
          const mData = monthlyData[inputDate.getMonth()];
          if (mData) mData.ingresos += (input.initial_quantity || 0);
        }
      });

      const now = new Date();
      if (selectedYear === now.getFullYear()) {
        return monthlyData.filter((_, i) => i <= now.getMonth());
      }
      return monthlyData;
    }

    return [];
  }, [filteredLogs, filteredInputs, viewMode, selectedMonth, selectedYear]);

  // Stats summary
  const [showTraceability, setShowTraceability] = useState(false);
  
  // Calculate Lag/Traceability for the selected month/year
  const lagAnalysis = useMemo(() => {
    if (viewMode !== 'mes' && viewMode !== 'anio') return [];
    
    const clientSummary: Record<string, { 
      id: string, 
      name: string, 
      ingresos: number, 
      produccion: number, 
      rezago: number,
      pendienteAnterior: number 
    }> = {};

    // Grouping logic
    const periodStart = viewMode === 'mes' 
      ? startOfMonth(new Date(selectedYear, selectedMonth))
      : startOfYear(new Date(selectedYear, 0));
    
    const periodEnd = viewMode === 'mes'
      ? endOfMonth(periodStart)
      : endOfYear(periodStart);

    allClients.forEach(c => {
      clientSummary[c.id] = { id: c.id, name: c.name, ingresos: 0, produccion: 0, rezago: 0, pendienteAnterior: 0 };
    });

    // 1. Calc current period stats
    filteredLogs.forEach(log => {
      const d = parseISO(log.created_at);
      if (d >= periodStart && d <= periodEnd) {
        if (clientSummary[log.client_id]) clientSummary[log.client_id].produccion += (log.total_sacks || 0);
      }
    });

    filteredInputs.forEach(input => {
      const d = parseISO(input.created_at);
      if (d >= periodStart && d <= periodEnd) {
        if (clientSummary[input.client_id]) clientSummary[input.client_id].ingresos += (input.initial_quantity || 0);
      } else if (d < periodStart) {
        // Mineral entered before period that might still be pending
        if (clientSummary[input.client_id]) clientSummary[input.client_id].pendienteAnterior += (input.remaining_quantity || 0);
      }
    });

    return Object.values(clientSummary)
      .map(s => ({ ...s, rezago: s.produccion - s.ingresos }))
      .filter(s => s.produccion > 0 || s.ingresos > 0)
      .sort((a, b) => b.rezago - a.rezago);
  }, [allClients, filteredLogs, filteredInputs, viewMode, selectedMonth, selectedYear]);

  const totalSacos = chartData.reduce((sum, d) => sum + d.sacos, 0);
  const totalIngresos = chartData.reduce((sum, d) => sum + d.ingresos, 0);

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
    <div className="space-y-6">
      {/* Traceability Modal */}
      {showTraceability && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowTraceability(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                  <ArrowRightLeft size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Análisis de Trazabilidad</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {viewMode === 'mes' ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}` : `Año ${selectedYear}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowTraceability(false)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
                <div className="flex gap-3">
                  <Info className="text-amber-500 shrink-0" size={18} />
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    Este análisis identifica moliendas que corresponden a mineral ingresado en meses anteriores. 
                    Un <span className="font-black">Rezago Positivo</span> indica que el cliente procesó más de lo que trajo este mes (molió stock antiguo).
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {lagAnalysis.map((item, idx) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">
                          {idx + 1}
                        </div>
                        <span className="font-black text-slate-900">{item.name}</span>
                      </div>
                      {item.rezago > 0 ? (
                        <span className="flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                          <TrendingUp size={12} className="mr-1" /> Rezago Positivo
                        </span>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Ingresos</span>
                        <span className="text-xs font-black text-emerald-600">+{item.ingresos}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Molienda</span>
                        <span className="text-xs font-black text-indigo-600">-{item.produccion}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${item.rezago > 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-100 border-slate-200'}`}>
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Diferencia</span>
                        <span className={`text-xs font-black ${item.rezago > 0 ? 'text-indigo-700' : 'text-slate-600'}`}>
                          {item.rezago > 0 ? `+${item.rezago}` : item.rezago}
                        </span>
                      </div>
                    </div>
                    
                    {item.pendienteAnterior > 0 && item.rezago > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-400 italic">
                        <History size={12} />
                        Tenía {item.pendienteAnterior} sacos pendientes de meses anteriores.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                Sistema de Trazabilidad Planta Saramarca II
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header con Título y Filtros de Tiempo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-base sm:text-xl font-black text-slate-900">Actividad Reciente</h2>
          <p className="text-xs text-slate-500 font-medium">Comparativa de ingresos y producción</p>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center justify-center md:justify-end">
          {/* Vista: Semana / Mes / Año */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-inner">
            {([
              { key: 'semana', label: '7 Días' },
              { key: 'mes', label: 'Mes' },
              { key: 'anio', label: 'Año' }
            ] as { key: ViewMode; label: string }[]).map(v => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === v.key
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Year selector (mes + año) */}
          {(viewMode === 'mes' || viewMode === 'anio') && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-2 py-1 sm:py-1.5 border border-slate-200 rounded-lg text-[10px] sm:text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Filtros Secundarios: Clientes y Zonas en UNA SOLA LÍNEA */}
      <div className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
        {/* Mes selector (solo si viewMode = mes) */}
        {viewMode === 'mes' && (
          <div className="flex items-center gap-1.5 col-span-2 md:col-span-3">
            <Calendar size={12} className="text-slate-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-[10px] font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Cliente */}
        <div className={`flex items-center gap-1.5 ${viewMode === 'mes' ? 'col-span-1 md:col-span-5' : 'col-span-1 md:col-span-6'}`}>
          <Users size={12} className="text-slate-400 shrink-0" />
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
            className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-[10px] font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none truncate"
          >
            <option value="all">Todos los clientes</option>
            {clients.filter(c => c.is_active !== false).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Zona */}
        <div className={`flex items-center gap-1.5 ${viewMode === 'mes' ? 'col-span-1 md:col-span-4' : 'col-span-1 md:col-span-6'}`}>
          <Map size={12} className="text-slate-400 shrink-0" />
          <select
            value={selectedZone}
            onChange={e => setSelectedZone(e.target.value)}
            className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-[10px] font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none truncate"
          >
            <option value="all">Todas las zonas</option>
            {zones.map(z => (
              <option key={z.id} value={z.name}>{z.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mini Stats - Colores alineados con el gráfico */}
      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-slate-500 font-bold">Producción:</span>
          <span className="font-black text-indigo-600">{totalSacos.toLocaleString()} <span className="hidden sm:inline">sacos</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-500 font-bold">Ingresos:</span>
          <span className="font-black text-emerald-600">{totalIngresos.toLocaleString()} <span className="hidden sm:inline">sacos</span></span>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          {/* BOTÓN DE TRAZABILIDAD */}
          {(viewMode === 'mes' || viewMode === 'anio') && (
            <button 
              onClick={() => setShowTraceability(true)}
              className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all text-[10px] font-black uppercase tracking-wider shadow-sm"
            >
              <ArrowRightLeft size={12} strokeWidth={3} />
              Trazabilidad
            </button>
          )}

          <div className="flex items-center gap-1.5 group relative">
            <Info size={14} className="text-indigo-400 cursor-help" />
            <span className="text-[10px] sm:text-xs text-slate-400 italic">Nota</span>
            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl border border-slate-700">
              <p className="font-bold mb-1 text-indigo-300">¿Por qué los totales no coinciden con el Stock?</p>
              Este gráfico muestra el <strong>flujo del periodo</strong>. El <strong>Stock Total</strong> incluye el saldo acumulado anterior.
            </div>
          </div>
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
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border-none shadow-2xl rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 border-b border-slate-50 pb-1">{label}</p>
                        {payload.map((entry: any) => (
                          <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
                            <span className={`text-xs font-black ${entry.name === 'sacos' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                              {entry.name === 'sacos' ? 'Producción' : 'Ingreso'}:
                            </span>
                            <span className="text-xs font-black text-slate-900">{entry.value.toLocaleString()} sacos</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="sacos" name="sacos" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSacos)" animationDuration={1200} />
              <Area type="monotone" dataKey="ingresos" name="ingresos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" animationDuration={1200} />
            </AreaChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border-none shadow-2xl rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 border-b border-slate-50 pb-1">{label}</p>
                        {payload.map((entry: any) => (
                          <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
                            <span className={`text-xs font-black ${entry.name === 'sacos' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                              {entry.name === 'sacos' ? 'Producción' : 'Ingreso'}:
                            </span>
                            <span className="text-xs font-black text-slate-900">{entry.value.toLocaleString()} sacos</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="sacos" name="sacos" radius={[6, 6, 0, 0]} barSize={viewMode === 'anio' ? 28 : (chartData.length > 20 ? 12 : 20)}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="ingresos" name="ingresos" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ActivityChart;
