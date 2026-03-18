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
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useSupabaseStore } from '../store/supabaseStore';
import { useToast } from '../hooks/useToast';

const Reportes: React.FC = () => {
  const { millingLogs, mills, clients, allClients, fetchMillingLogs, fetchMills, fetchClients, fetchAllClients } = useSupabaseStore();
  const toast = useToast();
  const [dateRange, setDateRange] = useState('month');
  const [reportType, setReportType] = useState('general');

  useEffect(() => {
    fetchMillingLogs({ pageSize: 200 });
    fetchMills();
    fetchAllClients();
    fetchClients();
  }, [fetchMillingLogs, fetchMills, fetchAllClients, fetchClients]);

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
        // Soportar tanto mill_id como id por compatibilidad
        const millEntry = log.mills_used.find((mu: any) => (mu.mill_id === m.id || mu.id === m.id));
        return sum + (millEntry?.total || millEntry?.total_sacks || (Number(millEntry?.cuarzo || 0) + Number(millEntry?.llampo || 0)) || 0);
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
        clientPerformance[cId] = { name: log.clients?.name || 'Cliente Desconocido', total: 0, logs: 0 };
      }
      clientPerformance[cId].total += (log.total_sacks || 0);
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

  // Handlers Reales
  const handleExportExcel = () => {
    if (!millingLogs || millingLogs.length === 0) {
      toast.warning('Sin Datos', 'No hay registros de molienda para exportar.');
      return;
    }
    toast.info('Generando Excel...', 'Procesando historial de molienda');
    const data = millingLogs.map(log => ({
      Fecha: new Date(log.created_at).toLocaleDateString(),
      Cliente: log.clients?.name || 'N/A',
      Mineral: log.mineral_type,
      Sacos: log.total_sacks,
      Cuarzo: log.total_cuarzo,
      Llampo: log.total_llampo,
      Observaciones: log.observations || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Molienda");
    XLSX.writeFile(wb, `Reporte_Industrial_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleGeneratePDF = () => {
    toast.info('Generando PDF...', 'Creando informe formal');
    const doc = new jsPDF() as any;

    doc.setFontSize(22);
    doc.text('REPORTE OPERATIVO DE MOLIENDA', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);

    doc.autoTable({
      startY: 35,
      head: [['Métrica', 'Valor']],
      body: [
        ['Producción Total', `${stats.totalSacos} sacos`],
        ['Clientes Atendidos', allClients.length],
        ['Promedio por Carga', `${stats.avgSacos.toFixed(2)} sacos`],
        ['Molinos Disponibles', mills.filter(m => m.status === 'LIBRE').length]
      ],
      theme: 'striped'
    });

    const body = stats.topClientsList.map((c, i) => [i + 1, c.name, c.total, c.logs]);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['POS', 'CLIENTE TOP 5', 'TOTAL SACOS', 'OPERACIONES']],
      body: body,
      theme: 'grid'
    });

    doc.save(`Balance_Gerencial_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto px-4 md:px-6 print:p-0 print:m-0 print:block">
      {/* Estilos específicos para impresión */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          nav, aside, header, .print\\:hidden, button, select, [role="navigation"], .sidebar-container {
            display: none !important;
          }
          body, #root, main, .main-content {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      ` }} />

      {/* HEADER INDUSTRIAL */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 pb-6 print:hidden">
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
            onClick={handleExportExcel}
            className="group flex items-center px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm font-bold text-sm"
          >
            <Download size={18} className="mr-3 group-hover:bounce" />
            EXPORTAR EXCEL
          </button>
          <button
            onClick={handleGeneratePDF}
            className="flex items-center px-5 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 font-bold text-sm"
          >
            <FileText size={18} className="mr-3" />
            BAJAR REPORTE PDF
          </button>
        </div>
      </div>

      {/* FILTROS MASTER */}
      <div className="bg-slate-50 rounded-[2rem] p-6 lg:p-8 border border-white shadow-xl shadow-slate-200/50 print:hidden">
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
            <button
              onClick={handlePrint}
              className="p-3.5 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
            >
              <Printer size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden print:block mb-8 border-b-4 border-slate-900 pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Reporte Maestro de Producción</h1>
        <p className="text-slate-600 font-bold mt-1">Inmaculada Concepción - Planta de Beneficio</p>
      </div>

      {/* KPI CARDS - DISEÑO INDUSTRIAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-4">
        {[
          { label: 'PRODUCCIÓN HISTÓRICA', value: stats.totalSacos.toLocaleString(), icon: Box, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', trend: 'Total', trendUp: true },
          { label: 'CLIENTES ATENDIDOS', value: clients.length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', trend: 'Activos', trendUp: true },
          { label: 'PROMEDIO POR CARGA', value: stats.avgSacos.toFixed(1), icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', trend: 'Sacos/Log', trendUp: true },
          { label: 'DISPONIBILIDAD', value: `${((mills.filter(m => m.status === 'LIBRE').length / mills.length) * 100).toFixed(0)}%`, icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', trend: 'Equipo', trendUp: true },
        ].map((kpi, i) => (
          <div key={i} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm transition-all duration-300 print:border-slate-300 print:shadow-none">
            <div className="flex items-start justify-between mb-4 print:hidden">
              <div className={`p-4 ${kpi.bg} ${kpi.border} rounded-2xl border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <kpi.icon className={kpi.color} size={28} strokeWidth={2.5} />
              </div>
              <div className={`flex items-center px-2 py-1 rounded-lg text-[10px] font-black ${kpi.trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
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
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm print:shadow-none print:border-slate-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Tendencia Mensual de Producción</h3>
              <p className="text-slate-500 text-sm font-medium italic">Volumen bruto de sacos procesados por mes</p>
            </div>
            <BarChart3 className="text-slate-300 print:hidden" size={32} />
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
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm print:shadow-none print:border-slate-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Productividad por Molino</h3>
              <p className="text-slate-500 text-sm font-medium italic">Total de carga asignada a cada unidad</p>
            </div>
            <Activity className="text-slate-300 print:hidden" size={32} />
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        {/* PIE CHART - MINERAL DISTRIBUCIÓN */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm lg:col-span-1 print:shadow-none print:border-slate-300">
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Ratio de Minerales</h3>

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
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</span>
              <span className="text-2xl font-black text-slate-900">Mineral</span>
            </div>
          </div>
        </div>

        {/* TOP CLIENTS TABLE DESIGN */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm lg:col-span-2 overflow-hidden print:shadow-none print:border-slate-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Ranking de Clientes (Top 5)</h3>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full print:hidden">BASADO EN PRODUCCIÓN</span>
          </div>

          <div className="space-y-4">
            {stats.topClientsList.map((client, idx) => (
              <div key={idx} className="flex items-center justify-between p-5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all duration-300 group print:bg-white print:border-slate-100">
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
                      {client.logs} operaciones registradas
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-indigo-600 group-hover:scale-110 transition-transform">
                    {client.total.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SACOS</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECCIÓN ENVÍO MASIVO - ESTILO NOTIFICACIÓN INDUSTRIAL */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-8 lg:p-12 text-white print:hidden">
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
