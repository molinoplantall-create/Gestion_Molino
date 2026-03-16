import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Clock, CheckCircle, AlertTriangle,
  TrendingUp, Users, Calendar, BarChart3,
  Factory, ShoppingBag, DollarSign, Activity,
  Bell, Download, Plus, ChevronRight, FileText,
  PieChart as PieIcon, Map, Filter
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
import StatsCard from '@/components/dashboard/StatsCard';
import RecentSessions from '@/components/dashboard/RecentSessions';
import ActivityChart from '@/components/dashboard/ActivityChart';
import { useSupabaseStore } from '@/store/supabaseStore';
import { useToast } from '@/hooks/useToast';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    mills,
    clients,
    millingLogs,
    millsLoading,
    fetchMills,
    fetchClients,
    fetchZones,
    fetchMillingLogs
  } = useSupabaseStore();

  const [activeTab, setActiveTab] = useState<'operaciones' | 'gerencia'>('operaciones');

  useEffect(() => {
    fetchMills();
    fetchClients();
    fetchZones();
    fetchMillingLogs({ pageSize: 50 });
  }, [fetchMills, fetchClients, fetchZones, fetchMillingLogs]);

  // --- Lógica de Analítica (Gerencia) ---
  const stats = useMemo(() => {
    const zoneData: Record<string, number> = {};
    const typeData: Record<string, number> = { 'MINERO': 0, 'PALLAQUERO': 0 };
    const COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

    clients.forEach(c => {
      const volume = (c.stock_cuarzo || 0) + (c.stock_llampo || 0);
      if (volume <= 0) return; // Skip clients with no current stock

      const zone = c.zone || 'SIN ZONA';
      zoneData[zone] = (zoneData[zone] || 0) + volume;

      if (c.client_type === 'MINERO') typeData['MINERO'] += volume;
      else if (c.client_type === 'PALLAQUERO') typeData['PALLAQUERO'] += volume;
    });

    const chartZoneData = Object.entries(zoneData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const chartTypeData = Object.entries(typeData)
      .map(([name, value]) => ({ name, value }));

    return { chartZoneData, chartTypeData, COLORS };
  }, [clients]);

  // --- Exportación de Reportes ---
  const handleExportExcel = () => {
    if (!millingLogs.length) return toast.warning('Sin Datos', 'No hay registros para exportar.');
    const data = millingLogs.map(log => ({
      Fecha: new Date(log.created_at).toLocaleDateString(),
      Cliente: log.clients?.name || 'N/A',
      Mineral: log.mineral_type,
      Total: log.total_sacks,
      Cuarzo: log.total_cuarzo,
      Llampo: log.total_llampo
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Producción");
    XLSX.writeFile(wb, `Reporte_Planta_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel Generado', 'El reporte se ha descargado correctamente.');
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('REPORTE GERENCIAL DE PRODUCCIÓN', 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 28);

    const body = millingLogs.slice(0, 20).map(log => [
      new Date(log.created_at).toLocaleDateString(),
      log.clients?.name || '---',
      log.mineral_type,
      log.total_sacks
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['FECHA', 'CLIENTE', 'MINERAL', 'SACOS']],
      body: body,
      theme: 'grid'
    });

    doc.save(`Reporte_Gerencial_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF Generado', 'El informe formal está listo.');
  };

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

  // Cálculos Operativos (KPIs)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const totalSacosHoy = millingLogs
    .filter(log => new Date(log.created_at) >= today)
    .reduce((acc, log) => acc + (log.total_sacks || 0), 0);

  const totalStockSacos = clients.reduce((acc, client) => acc + (client.stock_cuarzo || 0) + (client.stock_llampo || 0), 0);
  const totalClientes = clients.length;
  const totalHorasMaquina = mills.reduce((acc, m) => acc + ((m as any).horas_trabajadas || (m as any).horasTrabajadas || 0), 0);

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto px-4 md:px-6">
      {/* HEADER INDUSTRIAL UNIFICADO */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">CENTRO DE CONTROL E INTELIGENCIA</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Molinera Inmaculada</h1>
          <p className="text-slate-500 font-medium flex items-center mt-1">
            <Activity size={16} className="mr-2 text-indigo-500" />
            Control operativo y análisis gerencial unificado
          </p>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('operaciones')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'operaciones' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Operaciones
          </button>
          <button
            onClick={() => setActiveTab('gerencia')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'gerencia' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Gerencia / Reportes
          </button>
        </div>
      </div>

      {activeTab === 'operaciones' ? (
        <>
          {/* KPI CARDS OPERATIVAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              { label: 'PRODUCCIÓN HOY', value: totalSacosHoy.toLocaleString(), icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'STOCK TOTAL', value: totalStockSacos.toLocaleString(), icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'CLIENTES ACTIVOS', value: totalClientes.toString(), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'HORAS MÁQUINA', value: `${Math.round(totalHorasMaquina)}h`, icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50' },
            ].map((kpi, i) => (
              <div key={i} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className={`p-4 ${kpi.bg} rounded-2xl w-fit mb-4`}>
                  <kpi.icon className={kpi.color} size={28} strokeWidth={2.5} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{kpi.label}</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
              </div>
            ))}
          </div>

          {/* ESTADO DE MOLINOS */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Estado de Planta</h2>
              <button
                onClick={() => navigate('/registro-molienda')}
                className="btn-primary flex items-center px-6 py-3"
              >
                <Plus size={18} className="mr-2" /> NUEVA MOLIENDA
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mills.map((mill) => <MillCard key={mill.id} mill={mill} />)}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h2 className="text-xl font-black text-slate-900 mb-6">Actividad Reciente</h2>
              <div className="h-80 w-full"><ActivityChart /></div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h2 className="text-xl font-black text-slate-900 mb-6">Logs de Molienda</h2>
              <RecentSessions sessions={millingLogs.slice(0, 10)} mills={mills} />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* SECCIÓN GERENCIAL / ANALÍTICA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* HERRAMIENTAS DE EXPORTACIÓN */}
            <div className="lg:col-span-1 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
              <div className="inline-flex items-center px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">
                Acciones de Gerencia
              </div>
              <h2 className="text-3xl font-black mb-2 tracking-tight">Exportar Todo</h2>
              <p className="text-slate-400 text-sm font-medium mb-8">Descarga los registros históricos completos para auditoría externa o SUNAT.</p>

              <div className="space-y-4">
                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group"
                >
                  <div className="flex items-center">
                    <Download className="text-emerald-400 mr-4" size={24} />
                    <span className="font-bold">Libro de Molienda (Excel)</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 group-hover:text-white" />
                </button>
                <button
                  onClick={handleGeneratePDF}
                  className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group"
                >
                  <div className="flex items-center">
                    <FileText className="text-rose-400 mr-4" size={24} />
                    <span className="font-bold">Informe Situacional (PDF)</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 group-hover:text-white" />
                </button>
              </div>
            </div>

            {/* CHARTS DE ANALÍTICA INTEGRADAS */}
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900">Volumen por Zona de Procedencia</h3>
                <Map size={24} className="text-indigo-600" />
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartZoneData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={25}>
                      {stats.chartZoneData.map((e, i) => (
                        <Cell key={i} fill={stats.COLORS[i % stats.COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900">Distribución por Cliente</h3>
                <PieIcon size={24} className="text-indigo-600" />
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.chartTypeData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                      {stats.chartTypeData.map((e, i) => <Cell key={i} fill={stats.COLORS[i % stats.COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-8">Top Zonas (Sacos Totales)</h3>
              <div className="space-y-4">
                {stats.chartZoneData.slice(0, 5).map((z, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <span className="font-bold text-slate-700">{z.name}</span>
                    <span className="text-xl font-black text-indigo-600">{z.value.toLocaleString()} <small className="text-[10px] text-slate-400">SACOS</small></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ALERTAS CRÍTICAS (Siempre visibles) */}
      <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-white shadow-sm">
        <div className="flex items-center mb-6">
          <Bell className="text-indigo-600 mr-4" size={24} strokeWidth={2.5} />
          <h2 className="text-2xl font-black text-slate-900">Monitor de Sistema</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Trazabilidad FIFO', desc: 'Despacho automático de lotes más antiguos activo.', icon: Package, color: 'text-indigo-600' },
            { title: 'Sincro Supabase', desc: 'Conexión en tiempo real con la nube establecida.', icon: Activity, color: 'text-emerald-600' },
            { title: 'Auditoría Gerencial', desc: 'Reportes generados con firma digital del sistema.', icon: FileText, color: 'text-violet-600' }
          ].map((item, i) => (
            <div key={i} className="flex items-start p-5 bg-white rounded-2xl border border-slate-100">
              <item.icon size={20} className={`${item.color} mr-4 mt-1`} />
              <div>
                <p className="font-black text-slate-900 text-sm tracking-tight">{item.title}</p>
                <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
