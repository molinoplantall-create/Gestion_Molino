import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  FileText,
  Printer,
  ChevronRight,
  Zap,
  Activity,
  Box,
  Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { useSupabaseStore } from '../store/supabaseStore';
import { useToast } from '../hooks/useToast';

const Reportes: React.FC = () => {
  const { millingLogs, mills, clients, fetchMillingLogs, fetchMills, fetchClients } = useSupabaseStore();
  const toast = useToast();
  const [dateRange, setDateRange] = useState('month');
  const [reportType, setReportType] = useState('general');

  useEffect(() => {
    fetchMillingLogs({ pageSize: 200 });
    fetchMills();
    fetchClients();
  }, [fetchMillingLogs, fetchMills, fetchClients]);

  // Cálculos dinámicos procesados para Recharts
  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // 1. Datos para AreaChart (Producción Mensual)
    const monthlyProd = months.map((month, i) => {
      const logsInMonth = millingLogs.filter(log => {
        const date = new Date(log.created_at);
        return date.getFullYear() === currentYear && date.getMonth() === i;
      });
      return {
        name: month,
        sacos: logsInMonth.reduce((sum, log) => sum + (log.total_sacks || 0), 0),
        clientes: new Set(logsInMonth.map(l => l.client_id)).size
      };
    }).filter((_, i) => i <= new Date().getMonth());

    // 2. Datos para BarChart (Eficiencia por Molino)
    const millStats = mills.map(m => {
      const prodTotal = millingLogs.reduce((sum, log) => {
        if (!Array.isArray(log.mills_used)) return sum;
        const millEntry = log.mills_used.find((mu: any) => mu.mill_id === m.id);
        return sum + (millEntry?.total || (millEntry?.cuarzo + millEntry?.llampo) || 0);
      }, 0);
      return {
        name: m.name,
        total: prodTotal,
        status: m.status
      };
    }).sort((a, b) => b.total - a.total);

    // 3. Datos para PieChart (Distribución Mineral)
    const rawMineralData = millingLogs.reduce((acc, log) => {
      acc[log.mineral_type] = (acc[log.mineral_type] || 0) + (log.total_sacks || 0);
      return acc;
    }, {} as Record<string, number>);

    const mineralData = Object.entries(rawMineralData).map(([name, value]) => ({
      name: name === 'OXIDO' ? 'Óxido' : 'Sulfuro',
      value
    }));

    // 4. KPIs y Top Clientes
    const totalSacos = millingLogs.reduce((sum, log) => sum + (log.total_sacks || 0), 0);
    const avgSacos = millingLogs.length > 0 ? totalSacos / millingLogs.length : 0;

    const clientPerformance: Record<string, { name: string; total: number; logs: number }> = {};
    millingLogs.forEach(log => {
      const cId = log.client_id;
      if (!clientPerformance[cId]) {
        clientPerformance[cId] = { name: log.clients?.name || 'Cliente', total: 0, logs: 0 };
      }
      clientPerformance[cId].total += log.total_sacks;
      clientPerformance[cId].logs += 1;
    });

    const topClientsList = Object.values(clientPerformance)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      monthlyProd,
      millStats,
      mineralData,
      totalSacos,
      avgSacos,
      topClientsList
    };
  }, [millingLogs, mills]);

  // Estilos de colores industriales
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  const MINERAL_COLORS = { 'Óxido': '#6366f1', 'Sulfuro': '#facc15' };

  // Handlers
  const handleExport = (type: string) => {
    toast.info(`Exportando ${type}`, `Generando archivo profesional de ${type.toLowerCase()}...`);
  };

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto px-4 md:px-6">
      {/* HEADER INDUSTRIAL */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-600">SISTEMA DE MONITOREO</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Reportes Analíticos</h1>
          <p className="text-slate-500 font-medium flex items-center mt-1">
            <Activity size={16} className="mr-2 text-indigo-500" />
            Análisis de rendimiento industrial y métricas de producción en tiempo real
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('Excel')}
            className="group flex items-center px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm font-bold text-sm"
          >
            <Download size={18} className="mr-3 group-hover:bounce" />
            DATA EXPORT
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="flex items-center px-5 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 font-bold text-sm"
          >
            <FileText size={18} className="mr-3" />
            GENERAR REPORTE
          </button>
        </div>
      </div>

      {/* FILTROS MASTER */}
      <div className="bg-slate-50 rounded-[2rem] p-6 lg:p-8 border border-white shadow-xl shadow-slate-200/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rango de Datos</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer shadow-sm"
              >
                <option value="month">Este Mes Operativo</option>
                <option value="quarter">Trimestre Actual</option>
                <option value="year">Balance Anual</option>
                <option value="custom">Rango Personalizado</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Métrica Principal</label>
            <select
              className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer shadow-sm"
            >
              <option>Volumen de Molienda (Sacos)</option>
              <option>Consumo de Mineral</option>
              <option>Disponibilidad de Molinos</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidad de Análisis</label>
            <select className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm">
              <option>Todos los Molinos Activos</option>
              {mills.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button className="flex-1 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-tighter hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center">
              <Filter size={16} className="mr-2" /> ACTUALIZAR
            </button>
            <button className="p-3.5 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
              <Printer size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS - DISEÑO INDUSTRIAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'PRODUCCIÓN TOTAL', value: stats.totalSacos.toLocaleString(), icon: Box, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', trend: '+12.5%', trendUp: true },
          { label: 'CLIENTES ATENDIDOS', value: clients.length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', trend: '+2', trendUp: true },
          { label: 'PROMEDIO POR CARGA', value: stats.avgSacos.toFixed(1), icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', trend: '-0.4%', trendUp: false },
          { label: 'DISPONIBILIDAD', value: `${((mills.filter(m => m.status === 'LIBRE').length / mills.length) * 100).toFixed(0)}%`, icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', trend: 'Optimo', trendUp: true },
        ].map((kpi, i) => (
          <div key={i} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-4 ${kpi.bg} ${kpi.border} rounded-2xl border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <kpi.icon className={kpi.color} size={28} strokeWidth={2.5} />
              </div>
              <div className={`flex items-center px-2 py-1 rounded-lg text-[10px] font-black ${kpi.trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                {kpi.trendUp ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                {kpi.trend}
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
              <span className="text-xs font-bold text-slate-400">unidades</span>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRAPHS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AREA CHART - PRODUCCIÓN TEMPORAL */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Rendimiento Operativo</h3>
              <p className="text-slate-500 text-sm font-medium">Flujo de molienda mensual acumulado</p>
            </div>
            <BarChart3 className="text-slate-300" size={32} />
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyProd}>
                <defs>
                  <linearGradient id="colorSacos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '15px' }}
                  itemStyle={{ fontWeight: 900 }}
                />
                <Area
                  type="monotone"
                  dataKey="sacos"
                  stroke="#4f46e5"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorSacos)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BAR CHART - EFICIENCIA POR MOLINO */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Eficiencia de Equipos</h3>
              <p className="text-slate-500 text-sm font-medium">Carga procesada por cada unidad de molienda</p>
            </div>
            <Activity className="text-slate-300" size={32} />
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.millStats} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 900 }}
                  width={90}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="total" radius={[0, 10, 10, 0]} barSize={24}>
                  {stats.millStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LOWER SECTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PIE CHART - MINERAL DISTRIBUCIÓN */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm lg:col-span-1">
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Balance de Mineral</h3>

          <div className="h-[280px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.mineralData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {stats.mineralData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === 'Óxido' ? MINERAL_COLORS['Óxido'] : MINERAL_COLORS['Sulfuro']}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ paddingTop: '20px', fontWeight: 700, fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-12 text-center pointer-events-none">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ratio</span>
              <span className="text-2xl font-black text-slate-900">Miner.</span>
            </div>
          </div>
        </div>

        {/* TOP CLIENTS TABLE DESIGN */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Top Performance Clientes</h3>
            <button className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
              VER TODOS <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {stats.topClientsList.map((client, idx) => (
              <div key={idx} className="flex items-center justify-between p-5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all duration-300 group">
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${idx === 0 ? 'bg-amber-100 text-amber-600' :
                      idx === 1 ? 'bg-slate-200 text-slate-500' :
                        idx === 2 ? 'bg-orange-100 text-orange-600' :
                          'bg-white text-slate-400 border border-slate-100'
                    }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 tracking-tight">{client.name}</h4>
                    <span className="text-xs font-bold text-slate-400 flex items-center mt-0.5">
                      <Box size={12} className="mr-1" /> {client.logs} operaciones registradas
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-indigo-600 group-hover:scale-110 transition-transform">
                    {client.total.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SACOS TOTALES</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECCIÓN ENVÍO MASIVO - ESTILO NOTIFICACIÓN INDUSTRIAL */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-8 lg:p-12 text-white">
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <Activity size={300} strokeWidth={1} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="max-w-xl text-center lg:text-left">
            <div className="inline-flex items-center px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-6">
              <MessageSquare size={14} className="mr-2" /> Comunicación en Red
            </div>
            <h2 className="text-3xl lg:text-5xl font-black mb-4 tracking-tighter">Exportación de Reportes a Clientes</h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed">
              Active el canal de envío automático para que sus clientes reciban el balance de producción directamente en sus dispositivos móviles.
            </p>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-4">
            <div className="min-w-[240px] px-6 py-5 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
              <span className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">DESTINATARIOS</span>
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold">Clientes con Saldo</span>
                <ChevronRight size={20} className="text-indigo-500" />
              </div>
            </div>
            <button
              onClick={() => toast.success('Enviando...', 'Iniciando canal masivo de WhatsApp')}
              className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-base uppercase tracking-widest shadow-2xl shadow-indigo-600/20 transition-all flex items-center justify-center"
            >
              INICIAR ENVÍO <Zap size={20} className="ml-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;
