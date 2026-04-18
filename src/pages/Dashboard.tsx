import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Clock, CheckCircle, AlertTriangle,
  TrendingUp, TrendingDown, Users, Calendar, BarChart3,
  Factory, ShoppingBag, DollarSign, Activity,
  Bell, Download, Plus, ChevronRight, FileText,
  PieChart as PieIcon, Map, Filter, Zap, Box,
  AlertCircle, Eye, X, MapPin
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import MillCard from '@/components/dashboard/MillCard';
import RecentSessions from '@/components/dashboard/RecentSessions';
import ActivityChart from '@/components/dashboard/ActivityChart';
import { useSupabaseStore } from '@/store/supabaseStore';
import { useToast } from '@/hooks/useToast';
import { usePageFocus } from '@/hooks/usePageFocus';

const COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const MINERAL_COLORS: Record<string, string> = { 'Óxido': '#6366f1', 'Sulfuro': '#facc15' };

// Normalización de zonas para agrupar errores de escritura comunes
const ZONES_MAPPING: Record<string, string> = {
  'CARMAGO': 'CAMARGO',
  'CAMAGO': 'CAMARGO',
  'CAMARGO': 'CAMARGO'
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    mills,
    clients,
    allClients,
    millingLogs,
    millsLoading,
    fetchMills,
    fetchClients,
    fetchAllClients,
    fetchZones,
    fetchMillingLogs,
    recalcAllClientsStock
  } = useSupabaseStore();

  const [activeTab, setActiveTab] = useState<'operaciones' | 'reportes'>('operaciones');
  const [showSinZonaModal, setShowSinZonaModal] = useState(false);

  usePageFocus(() => {
    fetchMills();
    fetchAllClients();
    fetchClients();
    fetchZones();
    fetchMillingLogs({ pageSize: 200 });

    const repairDone = sessionStorage.getItem('repair_done');
    if (!repairDone) {
      recalcAllClientsStock().then(() => {
        sessionStorage.setItem('repair_done', 'true');
      });
    }
  });

  // ═══════════════════════════════════════════════
  // CÁLCULOS OPERATIVOS
  // ═══════════════════════════════════════════════
  const now = useMemo(() => new Date(), []);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const totalSacosHoy = millingLogs
    .filter(log => new Date(log.created_at) >= today)
    .reduce((acc, log) => acc + (log.total_sacks || 0), 0);

  const totalStockSacos = allClients.reduce((acc, c) => acc + (c.stock_cuarzo || 0) + (c.stock_llampo || 0), 0);
  const molinosOcupados = mills.filter(m => m.status && m.status.toUpperCase() !== 'LIBRE').length;
  const molinosLibres = mills.length - molinosOcupados;

  // ═══════════════════════════════════════════════
  // CÁLCULOS DE INTELIGENCIA GERENCIAL
  // ═══════════════════════════════════════════════
  const intelligence = useMemo(() => {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // 1. Producción Mensual (AreaChart)
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
    }).filter((_, i) => i <= currentMonth);

    // 2. % Cambio vs mes anterior
    const sacosEsteMes = monthlyProd[currentMonth]?.sacos || 0;
    const sacosMesAnterior = currentMonth > 0 ? (monthlyProd[currentMonth - 1]?.sacos || 0) : 0;
    const pctCambio = sacosMesAnterior > 0
      ? ((sacosEsteMes - sacosMesAnterior) / sacosMesAnterior * 100).toFixed(1)
      : '---';
    const tendenciaPositiva = Number(pctCambio) >= 0 || pctCambio === '---';

    // 3. Productividad por Molino (BarChart)
    const millStats = mills.map(m => {
      const prodTotal = millingLogs.reduce((sum, log) => {
        if (!Array.isArray(log.mills_used)) return sum;
        const millEntry = log.mills_used.find((mu: any) => (mu.mill_id === m.id || mu.id === m.id));
        return sum + (millEntry?.total || millEntry?.total_sacks || (Number(millEntry?.cuarzo || 0) + Number(millEntry?.llampo || 0)) || 0);
      }, 0);
      return { name: m.name, total: prodTotal, status: m.status };
    }).sort((a, b) => b.total - a.total);

    // 4. Distribución Mineral (PieChart)
    const rawMineralData = millingLogs.reduce((acc, log) => {
      acc[log.mineral_type] = (acc[log.mineral_type] || 0) + (log.total_sacks || 0);
      return acc;
    }, {} as Record<string, number>);
    const mineralData = Object.entries(rawMineralData).map(([name, value]) => ({
      name: name === 'OXIDO' ? 'Óxido' : 'Sulfuro', value
    }));

    // 4.5. Distribución por Tipo de Cliente (PieChart) - ABSORBIDO DE ANALÍTICA
    const typeData: Record<string, number> = { 'MINERO': 0, 'PALLAQUERO': 0 };
    allClients.forEach(c => {
        const volume = (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0);
        const type = (c.client_type || 'N/A').toUpperCase();
        if (type === 'MINERO') typeData['MINERO'] += volume;
        else if (type === 'PALLAQUERO') typeData['PALLAQUERO'] += volume;
    });
    const chartTypeData = Object.entries(typeData).map(([name, value]) => ({ name, value }));

    // 5. Totales y Promedios - USO DE allClients PARA TOTAL REAL
    const totalSacos = allClients.reduce((sum, c) => sum + (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0), 0);
    const avgSacos = millingLogs.length > 0 ? (millingLogs.reduce((sum, log) => sum + (log.total_sacks || 0), 0) / millingLogs.length) : 0;
    const totalOperaciones = millingLogs.length;

    // 6. Top 5 Clientes — basado en HISTORIAL ACUMULADO REAL (no en logs limitados)
    const topClients = [...allClients]
      .map(c => ({
        name: c.name,
        total: (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0),
        stockActual: (c.stock_cuarzo || 0) + (c.stock_llampo || 0),
        tipo: c.client_type || 'N/A'
      }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // 7. Volumen por Zona
    const zoneData: Record<string, number> = {};
    allClients.forEach(c => {
      const volume = (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0);
      if (volume <= 0) return;
      
      let rawZone = (c.zone || 'SIN ZONA').trim().toUpperCase();
      // Agrupar si existe en el mapeo, sino usar el nombre normalizado
      const zone = ZONES_MAPPING[rawZone] || rawZone;
      
      zoneData[zone] = (zoneData[zone] || 0) + volume;
    });
    const chartZoneData = Object.entries(zoneData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 8. Clientes SIN ZONA
    const clientesSinZona = allClients.filter(c => !c.zone || c.zone.trim() === '');

    // 9. Tasa de ocupación (Eficiencia Mensual)
    // Calculamos la eficiencia como: Producción Real / Capacidad Teórica del mes a la fecha
    // Capacidad teórica estimada: 4 molinos * 150 sacos * 1.5 turnos/día
    const diasTranscurridos = now.getDate() || 1;
    const capacidadTeóricaDiaria = mills.length * 150 * 1.5; 
    const capacidadAcumulada = capacidadTeóricaDiaria * diasTranscurridos;
    
    const tasaOcupacion = capacidadAcumulada > 0
      ? Math.min(((sacosEsteMes / capacidadAcumulada) * 100), 100).toFixed(0)
      : '0';

    // 10. Cálculos para la pestaña de Reportes
    const millStatsReport = mills.map(m => {
      const prodTotal = millingLogs.reduce((sum, log) => {
        if (!Array.isArray(log.mills_used)) return sum;
        const millEntry = log.mills_used.find(mu => (mu.mill_id === m.id || mu.id === m.id));
        return sum + (millEntry?.total || millEntry?.total_sacks || (Number(millEntry?.cuarzo || 0) + Number(millEntry?.llampo || 0)) || 0);
      }, 0);
      return { name: m.name, total: prodTotal, status: m.status };
    }).sort((a, b) => b.total - a.total);

    const totalSacosReporte = millingLogs.reduce((sum, log) => sum + (log.total_sacks || 0), 0);
    const avgSacosReporte = millingLogs.length > 0 ? totalSacosReporte / millingLogs.length : 0;
    const millDisponibilidad = `${((mills.filter(m => m.status === 'LIBRE').length / mills.length) * 100).toFixed(0)}%`;

    return {
      monthlyProd, pctCambio, tendenciaPositiva,
      millStats, mineralData,
      totalSacos, avgSacos, totalOperaciones,
      topClients, chartZoneData, clientesSinZona,
      tasaOcupacion, sacosEsteMes, chartTypeData,
      millStatsReport, totalSacosReporte, avgSacosReporte, millDisponibilidad
    };
  }, [millingLogs, mills, allClients, now]);

  // ═══════════════════════════════════════════════
  // EXPORTACIONES
  // ═══════════════════════════════════════════════
  const formatDateSafe = (dateStr: string) => {
    if (!dateStr) return '---';
    try {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    } catch { return '---'; }
  };

  const handleExportExcel = () => {
    if (!millingLogs.length) return toast.warning('Sin Datos', 'No hay registros para exportar.');
    const data = millingLogs.map(log => ({
      Fecha: formatDateSafe(log.created_at),
      Cliente: log.clients?.name || '---',
      Mineral: log.mineral_type || '---',
      'Total Sacos': log.total_sacks || 0,
      Cuarzo: log.total_cuarzo || 0,
      Llampo: log.total_llampo || 0,
      Observaciones: log.observations || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Producción");
    XLSX.writeFile(wb, `Reporte_Produccion_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel Generado', 'Reporte de molienda descargado.');
  };

  const handleExportIngresosExcel = () => {
    if (!allClients.length) return toast.warning('Sin Datos', 'No hay clientes para exportar.');
    const data = [...allClients]
      .filter(c => (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0) > 0 || (c.stock_cuarzo || 0) + (c.stock_llampo || 0) > 0)
      .map(c => ({
        Cliente: c.name || '---',
        'Tipo': c.client_type || 'N/A',
        'Sacos en Stock (Cuarzo)': c.stock_cuarzo || 0,
        'Sacos en Stock (Llampo)': c.stock_llampo || 0,
        'TOTAL ACTUAL STOCK': (c.stock_cuarzo || 0) + (c.stock_llampo || 0),
        'Histórico Cuarzo': c.cumulative_cuarzo || 0,
        'Histórico Llampo': c.cumulative_llampo || 0,
        'Zona': c.zone || 'SIN ZONA'
      }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario_Stock");
    XLSX.writeFile(wb, `Stock_Almacen_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel Generado', 'Consolidado de stock actual descargado.');
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    // Header
    doc.setFillColor(63, 81, 181);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('REPORTE GERENCIAL DE PRODUCCIÓN', 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text('PLANTA DE BENEFICIO - INMACULADA CONCEPCIÓN', 105, 27, { align: 'center' });
    doc.text(`Generado: ${new Date().toLocaleString()}`, 105, 34, { align: 'center' });

    // KPIs
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: 48,
      head: [['INDICADOR', 'VALOR']],
      body: [
        ['Producción Total Histórica', `${intelligence.totalSacos.toLocaleString()} sacos`],
        ['Producción Este Mes', `${intelligence.sacosEsteMes.toLocaleString()} sacos`],
        ['Variación vs Mes Anterior', `${intelligence.pctCambio}%`],
        ['Total Operaciones', `${intelligence.totalOperaciones}`],
        ['Promedio por Carga', `${intelligence.avgSacos.toFixed(1)} sacos`],
        ['Tasa de Ocupación', `${intelligence.tasaOcupacion}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181] },
    });

    // Top Clientes
    const body = intelligence.topClients.map((c, i) => [i + 1, c.name, c.total.toLocaleString(), c.tipo]);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [['#', 'CLIENTE TOP 5', 'TOTAL SACOS', 'TIPO']],
      body,
      theme: 'grid',
      headStyles: { fillColor: [51, 51, 51] },
    });

    doc.save(`Balance_Gerencial_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF Generado', 'Informe gerencial descargado.');
  };

  // ═══════════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════════
  if (millsLoading && mills.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold italic">Sincronizando planta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto px-4 md:px-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">CENTRO DE CONTROL E INTELIGENCIA</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Molinera Inmaculada</h1>
          <p className="text-slate-500 font-medium flex items-center mt-1">
            <Activity size={16} className="mr-2 text-indigo-500" />
            Dashboard operativo e inteligencia gerencial unificados
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveTab('operaciones')}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'operaciones' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            ⚙️ Operaciones
          </button>
          <button
            onClick={() => setActiveTab('reportes')}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'reportes' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            📊 Centro de Analítica
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* TAB 1: OPERACIONES                         */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'operaciones' ? (
        <>
          {/* KPIs Operativos */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
            {[
              { label: 'PRODUCCIÓN HOY', value: totalSacosHoy.toLocaleString(), unit: 'sacos', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
              { label: 'STOCK EN ALMACÉN', value: totalStockSacos.toLocaleString(), unit: 'sacos', icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: 'MOLINOS OPERANDO', value: `${molinosOcupados}/${mills.length}`, unit: 'activos', icon: Factory, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'DISPONIBILIDAD', value: molinosLibres.toString(), unit: 'libres', icon: CheckCircle, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
            ].map((kpi) => (
              <div key={kpi.label} className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-start justify-between mb-2 sm:mb-4">
                  <div className={`p-2 sm:p-4 ${kpi.bg} ${kpi.border} border rounded-xl sm:rounded-2xl group-hover:scale-110 transition-transform`}>
                    <kpi.icon className={`${kpi.color} w-4 h-4 sm:w-7 sm:h-7`} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1 truncate">{kpi.label}</p>
                  <div className="flex items-baseline gap-1 sm:gap-2 truncate">
                    <h3 className="text-lg sm:text-3xl font-black text-slate-900 tracking-tight truncate">{kpi.value}</h3>
                    <span className="text-[8px] sm:text-xs font-bold text-slate-400">{kpi.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Estado de Planta */}
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8 border border-slate-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Estado de Planta</h2>
              <button onClick={() => navigate('/registro-molienda')} className="flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                <Plus size={16} className="mr-2" /> NUEVA MOLIENDA
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {mills.map((mill) => <MillCard key={mill.id} mill={mill} />)}
            </div>
          </div>

          {/* Actividad y Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-8">
              {/* Box 1: Actividad */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 mb-6">Actividad Reciente</h2>
                <div className="h-80 w-full"><ActivityChart /></div>
              </div>

              {/* Box 2: Uso de Molinos (Filling the space) */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Carga por Molino</h2>
                    <p className="text-xs text-slate-500 font-medium">Distribución de sacos procesados</p>
                  </div>
                  <Factory className="text-indigo-600 opacity-20" size={32} />
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={intelligence.millStats} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 900 }} width={80} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontWeight: 700 }} />
                      <Bar dataKey="total" radius={[0, 10, 10, 0]} barSize={24}>
                        {intelligence.millStats.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h2 className="text-xl font-black text-slate-900 mb-6">Últimas Moliendas</h2>
              <RecentSessions sessions={millingLogs.slice(0, 10)} mills={mills} />
            </div>
          </div>
        </>
      ) : (
        <>
      {/* ═══════════════════════════════════════════ */}
      {/* TAB 2: ANALÍTICA GERENCIAL (PREMIUM)       */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'reportes' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
          
          {/* Dashboard Header Icons & Premium Exports */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform">
                <BarChart3 size={250} strokeWidth={1.5} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                    <Zap className="text-white fill-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Performance Global</h2>
                    <p className="text-indigo-100 text-sm font-medium">Control volumétrico y eficiencia de planta</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                   {[
                      { label: 'Total Histórico', value: intelligence.totalSacos.toLocaleString(), icon: Box },
                      { label: 'Este Mes', value: intelligence.sacosEsteMes.toLocaleString(), icon: Calendar },
                      { label: 'Eficiencia', value: `${intelligence.tasaOcupacion}%`, icon: Activity },
                      { label: 'Promedio', value: intelligence.avgSacos.toFixed(1), icon: Zap },
                   ].map((item, i) => (
                      <div key={i} className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                        <item.icon size={16} className="text-indigo-200 mb-2" />
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">{item.label}</p>
                        <p className="text-xl font-black">{item.value}</p>
                      </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-2">Exportaciones Maestras</h3>
                <p className="text-xs text-slate-500 font-medium">Descarga la data procesada y balances de stock.</p>
              </div>
              <div className="space-y-3 mt-6">
                <button onClick={handleExportExcel} className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 rounded-2xl hover:bg-emerald-50 hover:text-emerald-700 border border-slate-100 hover:border-emerald-200 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Download size={18} className="text-emerald-500" />
                    </div>
                    <span className="font-bold text-sm">Producción Completa</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-400" />
                </button>
                <button onClick={handleExportIngresosExcel} className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 rounded-2xl hover:bg-indigo-50 hover:text-indigo-700 border border-slate-100 hover:border-indigo-200 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <ShoppingBag size={18} className="text-indigo-500" />
                    </div>
                    <span className="font-bold text-sm">Stock Actual (Almacén)</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400" />
                </button>
                <button onClick={handleGeneratePDF} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg font-bold text-sm">
                  <FileText size={18} /> GENERAR REPORTE PDF
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de Tendencia con Gradiente Premium */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Tendencia Evolutiva</h3>
                  <p className="text-xs text-slate-500 font-medium">Volumen de molienda mensual ({now.getFullYear()})</p>
                </div>
                <div className="px-4 py-2 bg-emerald-50 rounded-xl">
                  <span className={`text-xs font-black ${intelligence.tendenciaPositiva ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {intelligence.pctCambio}% vs mes anterior
                  </span>
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={intelligence.monthlyProd}>
                    <defs>
                      <linearGradient id="premiumGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 800 }}
                      cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                    />
                    <Area type="monotone" dataKey="sacos" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#premiumGradient)" animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Productividad por Molino (RESTORED) */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Rendimiento de Unidades</h3>
                  <p className="text-xs text-slate-500 font-medium">Sacos totales por molino</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <Factory className="text-emerald-600" size={20} />
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intelligence.millStats} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 900 }} width={80} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontWeight: 700 }} />
                    <Bar dataKey="total" radius={[0, 10, 10, 0]} barSize={24}>
                      {intelligence.millStats.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Distribución Mineral */}
             <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-8">Composición de Mineral</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={intelligence.mineralData} 
                        cx="50%" cy="50%" 
                        innerRadius={70} outerRadius={100} 
                        paddingAngle={10} dataKey="value"
                      >
                        {intelligence.mineralData.map((entry, i) => (
                          <Cell key={i} fill={entry.name === 'Óxido' ? '#6366f1' : '#facc15'} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', fontWeight: 900 }} />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 700, fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* Ranking de Clientes con Stock Actual */}
             <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-slate-900">Ranking Top 5 y Balance Actual</h3>
                  <div className="flex gap-2 text-[10px] font-black uppercase">
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">HISTÓRICO</span>
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">STOCK</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {intelligence.topClients.map((client, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                          idx === 0 ? 'bg-amber-100 text-amber-600 shadow-sm' :
                          idx === 1 ? 'bg-slate-200 text-slate-400' :
                          idx === 2 ? 'bg-orange-100 text-orange-600' :
                          'bg-white text-slate-300 border border-slate-100'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 tracking-tight">{client.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{client.tipo}</span>
                        </div>
                      </div>
                      <div className="flex gap-8 items-center">
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Procesado</p>
                          <p className="text-lg font-black text-indigo-600">{client.total.toLocaleString()}</p>
                        </div>
                        <div className="text-right px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">En Almacén</p>
                          <p className="text-lg font-black text-emerald-700">{client.stockActual.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      )}

          {/* Sección inferior: Mineral + Zonas + Top Clientes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Distribución por Tipo de Cliente - NUEVO */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6">Tipo de Clientes</h3>
              <div className="h-[260px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={intelligence.chartTypeData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" animationDuration={1200}>
                      {intelligence.chartTypeData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 700 }} />
                    <Legend verticalAlign="bottom" wrapperStyle={{ fontWeight: 700, fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-10 text-center pointer-events-none">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Mix</span>
                  <span className="text-xl font-black text-slate-900">Perfiles</span>
                </div>
              </div>
            </div>

            {/* Volumen por Zona + SIN ZONA Diagnóstico */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Volumen por Zona</h3>
                  <p className="text-xs text-slate-500 font-medium">Procedencia del mineral</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <Map className="text-indigo-600" size={20} />
                </div>
              </div>

              {/* Alerta SIN ZONA */}
              {intelligence.clientesSinZona.length > 0 && (
                <button
                  onClick={() => setShowSinZonaModal(true)}
                  className="w-full mb-4 flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all group"
                >
                  <div className="flex items-center gap-2 text-left">
                    <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-amber-700">
                      {intelligence.clientesSinZona.length} cliente(s) SIN ZONA
                    </span>
                  </div>
                  <Eye size={14} className="text-amber-500 group-hover:text-amber-700" />
                </button>
              )}

              <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar">
                {intelligence.chartZoneData.slice(0, 10).map((z, i) => (
                  <div key={z.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className={`text-xs font-bold truncate ${z.name === 'SIN ZONA' ? 'text-amber-600 italic' : 'text-slate-700'}`}>
                        {z.name}
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{z.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Clientes */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Top 5 Clientes</h3>
                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">PRODUCCIÓN</span>
              </div>
              <div className="space-y-3">
                {intelligence.topClients.map((client, idx) => (
                  <div key={client.name} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                        idx === 0 ? 'bg-amber-100 text-amber-600' :
                        idx === 1 ? 'bg-slate-200 text-slate-500' :
                        idx === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-white text-slate-400 border border-slate-100'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 tracking-tight">{client.name}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{client.tipo}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-indigo-600">{client.total.toLocaleString()}</span>
                      <span className="block text-[8px] font-black text-slate-400 uppercase">sacos</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ MODAL SIN ZONA ═══ */}
      {showSinZonaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSinZonaModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <MapPin className="text-amber-600" size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Clientes SIN ZONA</h3>
                  <p className="text-xs text-slate-500 font-medium">{intelligence.clientesSinZona.length} clientes sin zona asignada</p>
                </div>
              </div>
              <button onClick={() => setShowSinZonaModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-2">
              {intelligence.clientesSinZona.length === 0 ? (
                <p className="text-center text-slate-500 py-8">✅ Todos los clientes tienen zona asignada</p>
              ) : (
                intelligence.clientesSinZona.map(c => {
                  const totalHistorico = (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0);
                  const stockActual = (c.stock_cuarzo || 0) + (c.stock_llampo || 0);
                  return (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-amber-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-black text-sm border border-amber-100">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{c.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{c.client_type || 'SIN TIPO'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-700">Stock: {stockActual}</p>
                        {totalHistorico > 0 && (
                          <p className="text-[10px] font-bold text-slate-400">Hist: {totalHistorico.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-400 text-center">
                Para asignar zona, vaya a <strong className="text-indigo-600">Gestión de Clientes</strong> y edite cada cliente
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
