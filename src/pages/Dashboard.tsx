import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Clock, CheckCircle, AlertTriangle,
  TrendingUp, Users, Calendar, BarChart3,
  Factory, ShoppingBag, DollarSign, Activity,
  Bell, Download
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
          <p className="text-slate-600">Cargando dashboard...</p>
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
  const trendHoy = diffAyer >= 0 ? "up" : "down";
  const changeHoy = `${Math.abs(diffAyer)} sacos ${diffAyer >= 0 ? 'más' : 'menos'} que ayer`;

  const totalStockSacos = clients.reduce((acc, client) => acc + (client.stock_cuarzo || 0) + (client.stock_llampo || 0), 0);
  const totalClientes = clients.length;
  const ingresosEstimados = millingLogs.reduce((acc, log) => acc + (log.total_sacks || 0), 0) * 12.5; // Ejemplo: 12.5 por saco

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium italic">Sistema de Gestión de Molienda</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95">
            <Download size={18} strokeWidth={1.5} className="mr-2" />
            Exportar
          </button>
          <div className="inline-flex items-center px-4 py-2 bg-white text-indigo-600 rounded-xl text-sm font-semibold border border-indigo-100 shadow-sm">
            <Calendar size={18} strokeWidth={1.5} className="mr-2" />
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: 4 TARJETAS DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Producción Hoy"
          value={totalSacosHoy.toLocaleString()}
          change={changeHoy}
          icon={TrendingUp}
          color="blue"
          description="registrados hoy"
          trend={trendHoy}
        />
        <StatsCard
          title="Stock en Bodega"
          value={totalStockSacos.toLocaleString()}
          change={totalStockSacos > 1000 ? "Estable" : "Bajo"}
          icon={ShoppingBag}
          color="orange"
          description="sacos totales"
          trend={totalStockSacos > 1000 ? "up" : "down"}
        />
        <StatsCard
          title="Clientes Activos"
          value={totalClientes.toString()}
          change={(clients?.filter(c => c.is_active).length || 0).toString()}
          icon={Users}
          color="green"
          description="registrados"
          trend="up"
        />
        <StatsCard
          title="Ingresos Estimados"
          value={`$${ingresosEstimados.toLocaleString()}`}
          change="Basado en sacos"
          icon={DollarSign}
          color="purple"
          description="molienda histórica"
          trend="up"
        />
      </div>

      {/* SECCIÓN 2: ESTADO DE MOLINOS */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Estado de Molinos</h2>
            <p className="text-sm text-slate-500 font-medium">Monitor en tiempo real</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></div>
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Libre</span>
            </div>
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Ocupado</span>
            </div>
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2"></div>
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Mantenimiento</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mills.map((mill) => (
            <MillCard key={mill.id} mill={mill} />
          ))}
          {mills.length === 0 && (
            <div className="col-span-full py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-500 font-medium italic">No hay molinos registrados en el sistema</p>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 3: ACTIVIDAD Y MOLIENDAS EN 2 COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICA DE ACTIVIDAD */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Actividad Semanal</h2>
              <p className="text-sm text-slate-500 font-medium">Sacos procesados (Últimos logs)</p>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart3 className="text-indigo-600" size={20} strokeWidth={1.5} />
              <select className="text-xs font-bold border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option>Recientes</option>
              </select>
            </div>
          </div>
          <div className="h-80">
            <ActivityChart />
          </div>
        </div>

        {/* MOLIENDAS RECIENTES */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Moliendas Recientes</h2>
              <p className="text-sm text-slate-500 font-medium">Últimos registros</p>
            </div>
            <button
              onClick={() => navigate('/moliendas')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center transition-colors px-2 py-1 hover:bg-indigo-50 rounded-lg"
            >
              Ver todas <Activity className="ml-1" size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <RecentSessions sessions={millingLogs} mills={mills} />
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => navigate('/registro-molienda')}
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 active:scale-95"
            >
              <span>+ Nueva Molienda</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: NOTIFICACIONES */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="bg-rose-50 p-2.5 rounded-xl mr-3 border border-rose-100 shadow-sm">
              <Bell className="text-rose-600" size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Alertas del Sistema</h2>
              <p className="text-sm text-slate-500 font-medium italic">Monitor de eventos</p>
            </div>
          </div>
          <div className="bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-rose-100 shadow-sm">
            En Tiempo Real
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start p-4 hover:bg-rose-50/50 rounded-2xl transition-all border border-slate-100 bg-slate-50/30 group">
            <div className="bg-rose-100 p-2.5 rounded-xl mr-4 shrink-0 group-hover:scale-110 transition-transform shadow-sm">
              <AlertTriangle size={18} strokeWidth={1.5} className="text-rose-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="font-bold text-slate-900 text-sm tracking-tight">Capacidad Crítica</p>
                <span className="text-[10px] text-rose-700 font-black uppercase tracking-tighter">Atención</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">El sistema de notificación de stock está configurado y activo.</p>
              <div className="flex items-center mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <Clock size={10} className="mr-1" /> Activo ahora
              </div>
            </div>
          </div>

          <div className="flex items-start p-4 hover:bg-emerald-50/50 rounded-2xl transition-all border border-slate-100 bg-slate-50/30 group">
            <div className="bg-emerald-100 p-2.5 rounded-xl mr-4 shrink-0 group-hover:scale-110 transition-transform shadow-sm">
              <Users size={18} strokeWidth={1.5} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="font-bold text-slate-900 text-sm tracking-tight">Acceso Admin</p>
                <span className="text-[10px] text-emerald-700 font-black uppercase tracking-tighter">Activo</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Gestión de usuarios y permisos habilitada.</p>
              <div className="flex items-center mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <Clock size={10} className="mr-1" /> Sesión segura
              </div>
            </div>
          </div>

          <div className="flex items-start p-4 hover:bg-indigo-50/50 rounded-2xl transition-all border border-slate-100 bg-slate-50/30 group">
            <div className="bg-indigo-100 p-2.5 rounded-xl mr-4 shrink-0 group-hover:scale-110 transition-transform shadow-sm">
              <Factory size={18} strokeWidth={1.5} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="font-bold text-slate-900 text-sm tracking-tight">Molinos OK</p>
                <span className="text-[10px] text-indigo-700 font-black uppercase tracking-tighter">Info</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Todos los sensores y motores reportan estado óptimo.</p>
              <div className="flex items-center mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <Clock size={10} className="mr-1" /> Sincronizado
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;