import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  FileText,
  Printer,
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
import { supabase } from '@/lib/supabase';
import { useToast } from '../hooks/useToast';

const Reportes: React.FC = () => {
  const { millingLogs, mills, clients, allClients, fetchMillingLogs, fetchMills, fetchClients, fetchAllClients, recalcAllClientsStock } = useSupabaseStore();
  const toast = useToast();

  // Normalización de zonas para agrupar errores de escritura comunes
  const ZONES_MAPPING: Record<string, string> = {
    'CARMAGO': 'CAMARGO',
    'CAMAGO': 'CAMARGO',
    'CAMARGO': 'CAMARGO'
  };
  const [dateRange, setDateRange] = useState('month');
  // Fechas para cuando dateRange === 'custom' (filtra los KPIs y gráficos de arriba)
  const [statsCustomStart, setStatsCustomStart] = useState(`${new Date().getFullYear()}-01-01`);
  const [statsCustomEnd, setStatsCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [refrescando, setRefrescando] = useState(false);

  // Rango de fechas para "Ingresos por Rango" — por defecto, lo que va del año en curso
  const currentYearStart = `${new Date().getFullYear()}-01-01`;
  const todayStr = new Date().toISOString().split('T')[0];
  const [rangoInicio, setRangoInicio] = useState(currentYearStart);
  const [rangoFin, setRangoFin] = useState(todayStr);
  const [exportandoRango, setExportandoRango] = useState(false);

  useEffect(() => {
    fetchMillingLogs({ pageSize: 3000 });
    fetchMills();
    fetchAllClients();
    fetchClients();

    // Reparación silenciosa de datos al cargar (solo una vez por sesión)
    const repairDone = sessionStorage.getItem('repair_done');
    if (!repairDone) {
      recalcAllClientsStock().then(() => {
        sessionStorage.setItem('repair_done', 'true');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefrescar = async () => {
    setRefrescando(true);
    try {
      await Promise.all([
        fetchMillingLogs({ pageSize: 3000 }),
        fetchMills(),
        fetchAllClients(),
        fetchClients()
      ]);
      toast.success('Actualizado', 'Datos actualizados con la información más reciente.');
    } catch (err) {
      toast.error('Error', 'No se pudo actualizar. Intenta de nuevo.');
    } finally {
      setRefrescando(false);
    }
  };
  
  // Helper para formatear fechas sin desfase de zona horaria
  const formatDateSafe = (dateStr: string) => {
    if (!dateStr) return '---';
    try {
      const datePart = dateStr.split('T')[0];
      const [year, month, day] = datePart.split('-');
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '---';
    }
  };

  // Cálculos dinámicos procesados para Recharts
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Filtro real según "Rango de Datos" — antes este selector no filtraba nada
    let periodStart: Date;
    let periodEnd: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    if (dateRange === 'month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateRange === 'quarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      periodStart = new Date(now.getFullYear(), quarterStartMonth, 1);
    } else if (dateRange === 'year') {
      periodStart = new Date(now.getFullYear(), 0, 1);
    } else {
      // custom
      periodStart = statsCustomStart ? new Date(`${statsCustomStart}T00:00:00`) : new Date(now.getFullYear(), 0, 1);
      periodEnd = statsCustomEnd ? new Date(`${statsCustomEnd}T23:59:59`) : periodEnd;
    }

    const logsPeriodo = millingLogs.filter(log => {
      const d = new Date(log.created_at);
      return d >= periodStart && d <= periodEnd;
    });

    // 1. Datos para AreaChart (Producción Mensual) — siempre muestra la tendencia del año en curso
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

    // 2. Datos para BarChart (Eficiencia por Molino) — filtrado por el periodo elegido
    const millStats = mills.map(m => {
      const prodTotal = logsPeriodo.reduce((sum, log) => {
        if (!Array.isArray(log.mills_used)) return sum;
        // Soportar tanto mill_id como id por compatibilidad
        const millEntry = log.mills_used.find(mu => (mu.mill_id === m.id || mu.id === m.id));
        return sum + (millEntry?.total || millEntry?.total_sacks || (Number(millEntry?.cuarzo || 0) + Number(millEntry?.llampo || 0)) || 0);
      }, 0);
      return {
        name: m.name,
        total: prodTotal,
        status: m.status
      };
    }).sort((a, b) => b.total - a.total);

    // 3. Datos para PieChart (Distribución Mineral) — filtrado por el periodo elegido
    const rawMineralData = logsPeriodo.reduce((acc, log) => {
      acc[log.mineral_type] = (acc[log.mineral_type] || 0) + (log.total_sacks || 0);
      return acc;
    }, {} as Record<string, number>);

    const mineralData = Object.entries(rawMineralData).map(([name, value]) => ({
      name: name === 'OXIDO' ? 'Óxido' : 'Sulfuro',
      value
    }));

    // 4. KPIs y Top Clientes — filtrado por el periodo elegido
    const totalSacos = logsPeriodo.reduce((sum, log) => sum + (log.total_sacks || 0), 0);
    const avgSacos = logsPeriodo.length > 0 ? totalSacos / logsPeriodo.length : 0;
    const clientesAtendidos = new Set(logsPeriodo.map(l => l.client_id)).size;

    const clientPerformance: Record<string, { name: string; total: number; logs: number }> = {};
    logsPeriodo.forEach(log => {
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
      clientesAtendidos,
      topClientsList
    };
  }, [millingLogs, mills, dateRange, statsCustomStart, statsCustomEnd]);

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
      Fecha: formatDateSafe(log.created_at),
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

  const handleExportIngresosRango = async () => {
    if (!rangoInicio || !rangoFin) {
      toast.warning('Rango incompleto', 'Selecciona fecha de inicio y fecha de fin.');
      return;
    }
    if (rangoInicio > rangoFin) {
      toast.warning('Rango inválido', 'La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    setExportandoRango(true);
    toast.info('Generando Excel...', 'Procesando ingresos del rango seleccionado');

    try {
      // Consulta directa (no toca el estado global de la página, así los
      // gráficos y demás reportes no se ven afectados por este filtro)
      const { data: logsRango, error } = await supabase
        .from('milling_logs')
        .select('client_id, mineral_type, total_sacks, total_cuarzo, total_llampo, created_at, status, clients!inner(name, client_type, zone)')
        .gte('created_at', `${rangoInicio}T00:00:00`)
        .lte('created_at', `${rangoFin}T23:59:59`)
        .in('status', ['FINALIZADO', 'COMPLETED'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!logsRango || logsRango.length === 0) {
        toast.warning('Sin Datos', 'No hay ingresos registrados en ese rango de fechas.');
        setExportandoRango(false);
        return;
      }

      // Agrupado por cliente (con su tipo: Minero / Pallaquero)
      const porCliente: Record<string, { cliente: string; tipo: string; zona: string; cuarzo: number; llampo: number; total: number; operaciones: number }> = {};
      logsRango.forEach((log: any) => {
        const cId = log.client_id;
        if (!porCliente[cId]) {
          porCliente[cId] = {
            cliente: log.clients?.name || 'Cliente Desconocido',
            tipo: log.clients?.client_type || 'N/A',
            zona: log.clients?.zone || 'N/A',
            cuarzo: 0, llampo: 0, total: 0, operaciones: 0
          };
        }
        porCliente[cId].cuarzo += Number(log.total_cuarzo || 0);
        porCliente[cId].llampo += Number(log.total_llampo || 0);
        porCliente[cId].total += Number(log.total_sacks || 0);
        porCliente[cId].operaciones += 1;
      });

      const dataPorCliente = Object.values(porCliente)
        .sort((a, b) => b.total - a.total)
        .map(c => ({
          Cliente: c.cliente,
          'Tipo Cliente': c.tipo,
          Zona: c.zona,
          'Cuarzo (Sacos)': c.cuarzo,
          'Llampo (Sacos)': c.llampo,
          'Total Sacos': c.total,
          'N° Ingresos': c.operaciones
        }));

      // Resumen por Tipo (Minero vs Pallaquero)
      const porTipo: Record<string, { sacos: number; clientes: Set<string>; operaciones: number }> = {};
      logsRango.forEach((log: any) => {
        const tipo = log.clients?.client_type || 'N/A';
        if (!porTipo[tipo]) porTipo[tipo] = { sacos: 0, clientes: new Set(), operaciones: 0 };
        porTipo[tipo].sacos += Number(log.total_sacks || 0);
        porTipo[tipo].clientes.add(log.client_id);
        porTipo[tipo].operaciones += 1;
      });

      const dataResumenTipo = Object.entries(porTipo).map(([tipo, v]) => ({
        'Tipo Cliente': tipo,
        'Total Sacos': v.sacos,
        'N° Clientes': v.clientes.size,
        'N° Ingresos': v.operaciones
      }));

      const wb = XLSX.utils.book_new();
      const wsCliente = XLSX.utils.json_to_sheet(dataPorCliente);
      XLSX.utils.book_append_sheet(wb, wsCliente, 'Por Cliente');
      const wsTipo = XLSX.utils.json_to_sheet(dataResumenTipo);
      XLSX.utils.book_append_sheet(wb, wsTipo, 'Resumen por Tipo');

      XLSX.writeFile(wb, `Ingresos_${rangoInicio}_a_${rangoFin}.xlsx`);
      toast.success('Listo', 'Reporte de ingresos por rango generado correctamente.');
    } catch (err: any) {
      console.error('Error exportando ingresos por rango:', err);
      toast.error('Error', 'No se pudo generar el reporte. Intenta de nuevo.');
    } finally {
      setExportandoRango(false);
    }
  };

  const handleExportIngresosExcel = () => {
    if (!allClients || allClients.length === 0) {
      toast.warning('Sin Datos', 'No hay clientes para generar el reporte de ingresos.');
      return;
    }
    toast.info('Generando Excel...', 'Procesando consolidado de ingresos históricos');
    
    // Solo clientes que han traído algo históricamente
    const data = [...allClients]
      .filter(c => (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0) > 0)
      .map(c => ({
        Cliente: c.name,
        'Tipo Cliente': c.client_type || 'N/A',
        'Total Cuarzo (Sacos)': c.cumulative_cuarzo || 0,
        'Total Llampo (Sacos)': c.cumulative_llampo || 0,
        'Total Histórico': (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0),
        'Zona Principal': ZONES_MAPPING[(c.zone || '').trim().toUpperCase()] || (c.zone || 'N/A')
      }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consolidado Ingresos");
    XLSX.writeFile(wb, `Consolidado_Ingresos_Mineral_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleGenerateIngresosPDF = () => {
    if (!allClients) return;
    toast.info('Generando PDF...', 'Creando reporte de ingresos consolidados');
    const doc = new jsPDF() as any;

    doc.setFontSize(22);
    doc.setTextColor(63, 81, 181);
    doc.text('REPORTE CONSOLIDADO DE INGRESOS', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('TOTAL DE MINERAL RECIBIDO POR CLIENTE (DESDE INICIO)', 14, 28);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 14, 33);

    const clientRows = [...allClients]
      .filter(c => (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0) > 0)
      .sort((a, b) => ((b.cumulative_cuarzo || 0) + (b.cumulative_llampo || 0)) - ((a.cumulative_cuarzo || 0) + (a.cumulative_llampo || 0)))
      .map(c => [
        c.name,
        c.client_type,
        c.cumulative_cuarzo || 0,
        c.cumulative_llampo || 0,
        (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0)
      ]);

    doc.autoTable({
      startY: 40,
      head: [['CLIENTE', 'TIPO', 'CUARZO', 'LLAMPO', 'TOTAL INGRESOS']],
      body: clientRows,
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181] },
      foot: [['TOTALES', '', 
        clientRows.reduce((sum, row) => sum + (row[2] as number), 0),
        clientRows.reduce((sum, row) => sum + (row[3] as number), 0),
        clientRows.reduce((sum, row) => sum + (row[4] as number), 0)
      ]],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`Consolidado_Ingresos_${new Date().toISOString().split('T')[0]}.pdf`);
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
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ingresos de Mineral</span>
            <div className="flex gap-2">
              <button
                onClick={handleExportIngresosExcel}
                className="group flex items-center px-4 py-2.5 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all font-bold text-xs"
                title="Excel de todos los ingresos históricos sumados"
              >
                <Download size={16} className="mr-2" />
                EXCEL INGRESOS
              </button>
              <button
                onClick={handleGenerateIngresosPDF}
                className="flex items-center px-4 py-2.5 bg-indigo-50 border-2 border-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all font-bold text-xs"
                title="PDF de todos los ingresos históricos sumados"
              >
                <FileText size={16} className="mr-2" />
                PDF INGRESOS
              </button>
            </div>
          </div>

          <div className="w-px h-12 bg-slate-200 mx-2 hidden lg:block"></div>

          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ingresos por Rango (por Cliente / Tipo)</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={rangoInicio}
                onChange={(e) => setRangoInicio(e.target.value)}
                max={rangoFin}
                className="px-3 py-2 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
              />
              <span className="text-slate-400 text-xs font-bold">a</span>
              <input
                type="date"
                value={rangoFin}
                onChange={(e) => setRangoFin(e.target.value)}
                min={rangoInicio}
                max={todayStr}
                className="px-3 py-2 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
              />
              <button
                onClick={handleExportIngresosRango}
                disabled={exportandoRango}
                className="group flex items-center px-4 py-2.5 bg-amber-50 border-2 border-amber-100 text-amber-700 rounded-xl hover:bg-amber-100 transition-all font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                title="Excel de ingresos del rango elegido, por cliente y por tipo (Minero/Pallaquero)"
              >
                <Download size={16} className="mr-2" />
                {exportandoRango ? 'GENERANDO...' : 'EXCEL POR RANGO'}
              </button>
            </div>
          </div>

          <div className="w-px h-12 bg-slate-200 mx-2 hidden lg:block"></div>

          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Operación (Moliendas)</span>
            <div className="flex gap-2">
              <button
                onClick={handleExportExcel}
                className="group flex items-center px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-slate-400 transition-all font-bold text-xs"
              >
                <Download size={16} className="mr-2" />
                EXCEL MOLIENDA
              </button>
              <button
                onClick={handleGeneratePDF}
                className="flex items-center px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg font-bold text-xs"
              >
                <FileText size={16} className="mr-2" />
                PDF MOLIENDA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS MASTER */}
      <div className="bg-slate-50 rounded-[2rem] p-6 lg:p-8 border border-white shadow-xl shadow-slate-200/50 print:hidden">
        <div className={`grid grid-cols-2 ${dateRange === 'custom' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 sm:gap-6`}>
          <div className="col-span-2 sm:col-span-1 space-y-2">
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

          {dateRange === 'custom' && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desde</label>
                <input
                  type="date"
                  value={statsCustomStart}
                  onChange={(e) => setStatsCustomStart(e.target.value)}
                  max={statsCustomEnd}
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
                <input
                  type="date"
                  value={statsCustomEnd}
                  onChange={(e) => setStatsCustomEnd(e.target.value)}
                  min={statsCustomStart}
                  max={todayStr}
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none shadow-sm"
                />
              </div>
            </>
          )}

          <div className="flex items-end gap-3">
            <button
              onClick={handleRefrescar}
              disabled={refrescando}
              className="flex-1 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-tighter hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="Trae los datos más recientes desde el servidor"
            >
              <Filter size={16} className="mr-2" /> {refrescando ? 'ACTUALIZANDO...' : 'ACTUALIZAR'}
            </button>
            <button
              onClick={handlePrint}
              className="p-3.5 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
              title="Imprimir / Exportar como PDF"
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
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 mt-4">
        {[
          { label: 'PRODUCCIÓN DEL PERIODO', value: stats.totalSacos.toLocaleString(), icon: Box, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', trend: 'Sacos', trendUp: true },
          { label: 'CLIENTES ATENDIDOS', value: stats.clientesAtendidos, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', trend: 'En el periodo', trendUp: true },
          { label: 'PROMEDIO POR CARGA', value: stats.avgSacos.toFixed(1), icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', trend: 'Sacos/Log', trendUp: true },
          { label: 'DISPONIBILIDAD', value: `${((mills.filter(m => m.status === 'LIBRE').length / mills.length) * 100).toFixed(0)}%`, icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', trend: 'Equipo', trendUp: true },
        ].map((kpi) => (
          <div key={kpi.label} className="group bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-slate-100 shadow-sm transition-all duration-300 print:border-slate-300 print:shadow-none flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2 sm:mb-4 print:hidden">
              <div className={`p-2 sm:p-3 ${kpi.bg} ${kpi.border} rounded-xl sm:rounded-2xl border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <kpi.icon className={`${kpi.color} w-5 h-5 sm:w-6 sm:h-6`} strokeWidth={2.5} />
              </div>
              <div className={`hidden sm:flex items-center px-2 py-1 rounded-lg text-[10px] font-black ${kpi.trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                {kpi.trend}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1 truncate line-clamp-1" title={kpi.label}>{kpi.label}</p>
              <div className="flex items-baseline gap-1 sm:gap-2 truncate">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">{kpi.value}</h3>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">unidades</span>
              </div>
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

    </div>
  );
};

export default Reportes;
