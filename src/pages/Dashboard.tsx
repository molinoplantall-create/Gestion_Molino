import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Clock, CheckCircle, AlertTriangle,
  TrendingUp, Users, Calendar, BarChart3,
  Factory, ShoppingBag, DollarSign, Activity,
  Bell, Download, Plus, ChevronRight
} from 'lucide-react';
import MillCard from '@/components/dashboard/MillCard';
import StatsCard from '@/components/dashboard/StatsCard';
import RecentSessions from '@/components/dashboard/RecentSessions';
import ActivityChart from '@/components/dashboard/ActivityChart';
import { useSupabaseStore } from '@/store/supabaseStore';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    mills,
    clients,
    millingLogs,
    millsLoading,
    fetchMills,
    fetchClients,
    fetchMillingLogs
  } = useSupabaseStore();

  useEffect(() => {
    fetchMills();
    fetchClients();
    fetchMillingLogs({ pageSize: 15 });
  }, [fetchMills, fetchClients, fetchMillingLogs]);

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

  // Cálculos dinámicos
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const totalSacosHoy = millingLogs
    .filter(log => new Date(log.created_at) >= today)
    .reduce((acc, log) => acc + (log.total_sacks || 0), 0);

  const totalSacosAyer = millingLogs
    .filter(log => {
      const d = new Date(log.created_at);
      return d >= yesterday && d < today;
    })
    .reduce((acc, log) => acc + (log.total_sacks || 0), 0);

  const diffAyer = totalSacosHoy - totalSacosAyer;
  const trendHoy = diffAyer >= 0 ? "+ " : "- ";

  const totalStockSacos = clients.reduce((acc, client) => acc + (client.stock_cuarzo || 0) + (client.stock_llampo || 0), 0);
  const totalClientes = clients.length;
  const ingresosEstimados = millingLogs.reduce((acc, log) => acc + (log.total_sacks || 0), 0) * 12.5;

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto px-4 md:px-6">
      {/* HEADER INDUSTRIAL UNIFICADO */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">CENTRO DE MANDO OPERATIVO</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard General</h1>
          <p className="text-slate-500 font-medium flex items-center mt-1">
            <Activity size={16} className="mr-2 text-indigo-500" />
            Supervisión técnica de planta y flujo de producción en tiempo real
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/reportes')}
            className="flex items-center px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm font-bold text-sm"
          >
            <BarChart3 size={18} className="mr-3" />
            VER ANALÍTICA
          </button>
          <button
            onClick={() => navigate('/registro-molienda')}
            className="flex items-center px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold text-sm"
          >
            <Plus size={18} className="mr-3" />
            NUEVA MOLIENDA
          </button>
        </div>
      </div>

      {/* KPI CARDS - ESTILO INDUSTRIAL PREMIUM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'PRODUCCIÓN HOY', value: totalSacosHoy.toLocaleString(), icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', trend: `${trendHoy}${Math.abs(diffAyer)}`, trendUp: diffAyer >= 0 },
          { label: 'STOCK TOTAL', value: totalStockSacos.toLocaleString(), icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', trend: 'Sacos', trendUp: true },
          { label: 'CLIENTES ACTIVOS', value: totalClientes.toString(), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', trend: 'Base Datos', trendUp: true },
          { label: 'INGRESOS HIST.', value: `$${ingresosEstimados.toLocaleString()}`, icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', trend: 'Estimado', trendUp: true },
        ].map((kpi, i) => (
          <div key={i} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
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
              <span className="text-xs font-bold text-slate-400 font-mono uppercase">{i === 3 ? 'USD' : 'UNDS'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ESTADO DE MOLINOS - REDISEÑO INDUSTRIAL */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Estado de Planta (Molinos)</h2>
            <p className="text-sm text-slate-500 font-medium italic">Monitor de carga y disponibilidad operativa</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <div className="flex items-center px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-100">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></div>
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider">Libre</span>
            </div>
            <div className="flex items-center px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-100">
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider">Ocupado</span>
            </div>
            <div className="flex items-center px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-100">
              <div className="w-2.5 h-2.5 bg-rose-500 rounded-full mr-2"></div>
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider">Mantenimiento</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {mills.map((mill) => (
            <div key={mill.id} className="hover:scale-[1.02] transition-transform duration-300">
              <MillCard mill={mill} />
            </div>
          ))}
          {mills.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
              <Factory size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold italic">No hay sistemas de molienda registrados</p>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN INFERIOR: GRÁFICAS Y ACTIVIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* GRÁFICA DE ACTIVIDAD - ESTILO PREMIUM */}
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Actividad en Planta</h2>
              <p className="text-sm text-slate-500 font-medium">Historial de molienda reciente (Últimos logs)</p>
            </div>
            <div className="flex items-center gap-3 print:hidden">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <BarChart3 className="text-indigo-600" size={20} strokeWidth={2.5} />
              </div>
              <select className="text-xs font-black border-2 border-slate-100 rounded-xl px-4 py-2.5 bg-white text-slate-600 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                <option>Recientes</option>
              </select>
            </div>
          </div>
          <div className="h-80 w-full">
            <ActivityChart />
          </div>
        </div>

        {/* LOGS RECIENTES - ESTILO LISTA INDUSTRIAL */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Protocolos Recientes</h2>
              <p className="text-sm text-slate-500 font-medium italic">Bitácora de moliendas acabadas</p>
            </div>
            <button
              onClick={() => navigate('/moliendas')}
              className="text-indigo-600 hover:text-indigo-800 text-xs font-black flex items-center transition-all px-3 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl"
            >
              VER TODO <ChevronRight className="ml-1" size={14} strokeWidth={3} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <RecentSessions sessions={millingLogs} mills={mills} />
          </div>
          <button
            onClick={() => navigate('/registro-molienda')}
            className="mt-8 w-full inline-flex items-center justify-center px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 uppercase"
          >
            <span>+ Ejecutar Registro de Molienda</span>
          </button>
        </div>
      </div>

      {/* ALERTAS INDUSTRIALES - DISEÑO TIPO NOTIFICACIÓN CRÍTICA */}
      <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-white shadow-xl shadow-slate-200/50 mb-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="bg-rose-600 p-3 rounded-2xl mr-4 shadow-lg shadow-rose-200">
              <Bell className="text-white" size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Monitor de Eventos Críticos</h2>
              <p className="text-sm text-slate-500 font-medium italic">Alertas automáticas de hardware y stock</p>
            </div>
          </div>
          <div className="hidden sm:block text-[10px] font-black text-rose-600 border-2 border-rose-100 bg-rose-50 px-4 py-1.5 rounded-full uppercase tracking-widest">
            Sincronización Activa
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Balance de Stock', desc: 'Sistema de alerta de existencias mínimas configurado y monitoreando.', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-100', status: 'Atención' },
            { title: 'Arquitectura Segura', desc: 'Gestión de roles y auditoría de accesos activa en todos los módulos.', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100', status: 'Validado' },
            { title: 'Sensores de Molinos', desc: 'Telemetría de motores reportando estado óptimo en todas las unidades.', icon: Factory, color: 'text-indigo-600', bg: 'bg-indigo-100', status: 'Sincro' }
          ].map((item, i) => (
            <div key={i} className="flex items-start p-6 bg-white hover:bg-slate-50/50 rounded-3xl transition-all border border-slate-100 group shadow-sm">
              <div className={`${item.bg} p-3 rounded-2xl mr-4 shrink-0 group-hover:scale-110 transition-transform shadow-sm`}>
                <item.icon size={20} strokeWidth={2.5} className={item.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-black text-slate-900 text-sm tracking-tight truncate">{item.title}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;