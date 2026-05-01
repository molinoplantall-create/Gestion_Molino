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
import ClientComparisonChart from '@/components/dashboard/ClientComparisonChart';
import { useSupabaseStore } from '@/store/supabaseStore';
import { useToast } from '@/hooks/useToast';
import { usePageFocus } from '@/hooks/usePageFocus';
import { formatNumber } from '@/utils/formatters';

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

  const [showSinZonaModal, setShowSinZonaModal] = useState(false);
  const [comparisonMonth, setComparisonMonth] = useState(new Date().getMonth());
  const [comparisonYear, setComparisonYear] = useState(new Date().getFullYear());
  const [comparisonMode, setComparisonMode] = useState<'mes' | 'anio'>('mes');

  usePageFocus(() => {
    fetchMills();
    fetchAllClients();
    fetchClients();
    fetchZones();
    fetchMillingLogs({ pageSize: 5000 });

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

    // 11. Comparativa de Clientes (Filtro interactivo)
    const comparisonLogs = millingLogs.filter(log => {
      const d = new Date(log.created_at);
      if (comparisonMode === 'mes') {
        return d.getMonth() === comparisonMonth && d.getFullYear() === comparisonYear;
      } else {
        return d.getFullYear() === comparisonYear;
      }
    });
    
    const clientDataMap: Record<string, { name: string, total: number }> = {};
    comparisonLogs.forEach(log => {
      const clientName = log.clients?.name || 'Desconocido';
      if (!clientDataMap[clientName]) {
        clientDataMap[clientName] = { name: clientName, total: 0 };
      }
      clientDataMap[clientName].total += (log.total_sacks || 0);
    });
    
    const clientMonthlyProd = Object.values(clientDataMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // Limitado a Top 5 según solicitud

    const availableYears = Array.from(new Set(millingLogs.map(l => new Date(l.created_at).getFullYear())));
    if (availableYears.length === 0) availableYears.push(new Date().getFullYear());
    availableYears.sort((a, b) => b - a);

    return {
      monthlyProd, pctCambio, tendenciaPositiva,
      millStats, mineralData,
      totalSacos, avgSacos, totalOperaciones,
      topClients, chartZoneData, clientesSinZona,
      tasaOcupacion, sacosEsteMes, chartTypeData,
      millStatsReport, totalSacosReporte, avgSacosReporte, millDisponibilidad,
      clientMonthlyProd, availableYears
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
        ['Producción Total Histórica', `${formatNumber(intelligence.totalSacos)} sacos`],
        ['Producción Este Mes', `${formatNumber(intelligence.sacosEsteMes)} sacos`],
        ['Variación vs Mes Anterior', `${intelligence.pctCambio}%`],
        ['Total Operaciones', `${intelligence.totalOperaciones}`],
        ['Promedio por Carga', `${intelligence.avgSacos.toFixed(1)} sacos`],
        ['Tasa de Ocupación', `${intelligence.tasaOcupacion}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181] },
    });

    // Top Clientes
    const body = intelligence.topClients.map((c, i) => [i + 1, c.name, formatNumber(c.total), c.tipo]);
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
  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

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
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Molino Planta Saramarca II</h1>
          <p className="text-slate-500 font-medium flex items-center mt-1">
            <Activity size={16} className="mr-2 text-indigo-500" />
            Dashboard operativo e inteligencia gerencial unificados
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-sm">
            <Download size={16} className="text-emerald-500" /> 
            <span className="hidden sm:inline">PRODUCCIÓN</span>
          </button>
          <button onClick={handleExportIngresosExcel} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-sm">
            <ShoppingBag size={16} className="text-indigo-500" />
            <span className="hidden sm:inline">STOCK</span>
          </button>
          <button onClick={handleGeneratePDF} className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-xs transition-all shadow-md">
            <FileText size={16} />
            <span className="hidden sm:inline">REPORTE PDF</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* UNIFIED DASHBOARD LAYOUT                    */}
      {/* ═══════════════════════════════════════════ */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* ROW 1: KPIs Unificados */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          {[
            { 
              label: 'Producción Acumulada', 
              value: formatNumber(intelligence.totalSacos), 
              unit: 'sacos', 
              subtext: 'Total Histórico',
              icon: TrendingUp, 
              color: 'text-blue-600', 
              bg: 'bg-blue-50', 
              border: 'border-blue-100' 
            },
            { 
              label: 'Producción de Hoy', 
              value: formatNumber(totalSacosHoy), 
              unit: 'sacos', 
              subtext: 'Procesado en el día',
              icon: Zap, 
              color: 'text-amber-500', 
              bg: 'bg-amber-50', 
              border: 'border-amber-100' 
            },
            { 
              label: 'Molinos Operativos', 
              value: `${molinosOcupados}/${mills.length}`, 
              unit: 'activos', 
              subtext: 'En tiempo real',
              icon: Factory, 
              color: 'text-emerald-600', 
              bg: 'bg-emerald-50', 
              border: 'border-emerald-100' 
            },
            { 
              label: 'Rendimiento Global', 
              value: `${intelligence.tasaOcupacion}%`, 
              unit: 'eficiencia', 
              subtext: `Promedio: ${formatNumber(intelligence.avgSacos, 1)} sacos`,
              icon: Activity, 
              color: 'text-violet-600', 
              bg: 'bg-violet-50', 
              border: 'border-violet-100' 
            },
          ].map((kpi: { 
            label: string; 
            value: string; 
            unit: string; 
            subtext: string; 
            icon: any; 
            color: string; 
            bg: string; 
            border: string; 
            subtextColor?: string;
          }, idx) => (
            <div key={idx} className="bg-white p-3 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group overflow-hidden">
              <div className="flex items-start justify-between mb-2 sm:mb-4 gap-2">
                <div className="min-w-0 flex-1">
                   <p className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{kpi.label}</p>
                   <div className="flex items-baseline gap-1 sm:gap-2 truncate">
                     <h3 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">{kpi.value}</h3>
                     <span className="text-[9px] sm:text-xs font-bold text-slate-400 flex-shrink-0">{kpi.unit}</span>
                   </div>
                </div>
                <div className={`p-2.5 sm:p-3 ${kpi.bg} ${kpi.border} border rounded-xl sm:rounded-2xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <kpi.icon className={`${kpi.color} w-4 h-4 sm:w-6 sm:h-6`} strokeWidth={2.5} />
                </div>
              </div>
              <div className="min-w-0">
                <span className={`text-[9px] sm:text-xs font-black block truncate ${kpi.subtextColor || 'text-slate-500'}`}>
                  {kpi.subtext}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ROW 2: Charts (Actividad + Tendencia) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Actividad Reciente */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm overflow-hidden">
            <div className="w-full"><ActivityChart /></div>
          </div>

          {/* Tendencia Evolutiva */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <h3 className="text-base sm:text-xl font-black text-slate-900 mb-2 tracking-tight text-center sm:text-left">Tendencia Evolutiva</h3>
            <p className="text-xs text-slate-500 font-medium text-center sm:text-left mb-6">Crecimiento mensual acumulado ({now.getFullYear()})</p>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={intelligence.monthlyProd}>
                  <defs>
                    <linearGradient id="premiumGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 800 }}
                    cursor={{ stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '5 5' }}
                  />
                  <Area type="monotone" dataKey="sacos" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#premiumGradient)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ROW 3: Comparativa de Clientes (Interactivo) */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users size={18} className="text-indigo-500" />
                <h2 className="text-base sm:text-xl font-black text-slate-900">Comparativa de Producción por Cliente</h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">Análisis de volumen por periodo seleccionado</p>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center bg-slate-50 p-2 rounded-2xl border border-slate-100">
              {/* Selector de Modo */}
              <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
                <button 
                  onClick={() => setComparisonMode('mes')}
                  className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${comparisonMode === 'mes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Mes
                </button>
                <button 
                  onClick={() => setComparisonMode('anio')}
                  className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${comparisonMode === 'anio' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Año
                </button>
              </div>

              {/* Selector de Mes (solo si modo mes) */}
              {comparisonMode === 'mes' && (
                <select 
                  value={comparisonMonth}
                  onChange={e => setComparisonMonth(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
              )}

              {/* Selector de Año */}
              <select 
                value={comparisonYear}
                onChange={e => setComparisonYear(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {intelligence.availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ClientComparisonChart data={intelligence.clientMonthlyProd} />
          </div>
        </div>

        {/* ROW 4: Estado de Planta */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 opacity-[0.02] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
             <Factory size={250} strokeWidth={1.5} className="text-indigo-600" />
          </div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <h2 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight text-center sm:text-left">Estado de Planta</h2>
              <button onClick={() => navigate('/registro-molienda')} className="flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                <Plus size={16} className="mr-2" /> Nueva Molienda
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {mills.map((mill) => <MillCard key={mill.id} mill={mill} />)}
            </div>
          </div>
        </div>

        {/* ROW 4: Carga, Composición, Top Clientes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Carga por Molino */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mb-2 text-center sm:text-left">Carga por Molino</h3>
            <p className="text-xs text-slate-500 font-medium mb-6 text-center sm:text-left">Distribución de producción</p>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intelligence.millStats} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 900 }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontWeight: 700 }} formatter={(value) => formatNumber(value as number)} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={40} animationDuration={1500} className="hover:opacity-80 transition-opacity cursor-pointer">
                    {intelligence.millStats.map((_, index) => (
                      <Cell key={index} fill="#3b82f6" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Composición Mineral */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mb-2 text-center sm:text-left">Composición de Mineral</h3>
            <p className="text-xs text-slate-500 font-medium mb-6 text-center sm:text-left">Distribución por tipo</p>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={intelligence.mineralData} 
                    cx="50%" cy="50%" 
                    innerRadius={60} outerRadius={90} 
                    paddingAngle={5} dataKey="value"
                  >
                    {intelligence.mineralData.map((entry, i) => (
                      <Cell key={i} fill={entry.name === 'Óxido' ? '#f59e0b' : '#3b82f6'} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', fontWeight: 900 }} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 700, fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mb-2 text-center sm:text-left">Top 5 Clientes</h3>
            <p className="text-xs text-slate-500 font-medium mb-6 text-center sm:text-left">Ranking por balance actual</p>
            <div className="space-y-4">
              {intelligence.topClients.slice(0, 5).map((client, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shadow-sm">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-black text-slate-900">{client.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-black text-slate-900">{formatNumber(client.total)}</span>
                    <span className="block text-[10px] font-bold text-emerald-600">+{formatNumber(client.stockActual)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 5: Últimas Moliendas, Volumen por Zona */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <h2 className="text-base sm:text-xl font-black text-slate-900 mb-6 text-center lg:text-left">Últimas Moliendas</h2>
            <RecentSessions sessions={millingLogs.slice(0, 4)} mills={mills} />
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base sm:text-xl font-black text-slate-900 tracking-tight text-center sm:text-left">Volumen por Zona</h3>
              <MapPin className="text-slate-400" size={20} />
            </div>
            <p className="text-xs text-slate-500 font-medium text-center sm:text-left mb-6">Rendimiento por ubicación</p>

            <div className="space-y-4">
              {intelligence.chartZoneData.slice(0, 6).map((z, i) => (
                <div key={z.name} className="flex items-center gap-4">
                  <div className="w-24 flex-shrink-0 text-xs font-bold text-slate-700 truncate">{z.name}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${Math.max(10, (z.value / intelligence.chartZoneData[0].value) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="w-12 text-right text-xs font-black text-slate-900">{formatNumber(z.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
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
            <div className="p-6 overflow-y-auto max-h-[60vh] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                        <p className="text-xs font-black text-slate-700">Stock: {formatNumber(stockActual)}</p>
                        {totalHistorico > 0 && (
                          <p className="text-[10px] font-bold text-slate-400">Hist: {formatNumber(totalHistorico)}</p>
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
