import React, { useEffect } from 'react';
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
  const { mills, loading: millsLoading, fetchMills } = useSupabaseStore();

  useEffect(() => {
    fetchMills();
  }, [fetchMills]);

  if (millsLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const millsToDisplay = mills && mills.length > 0 ? mills : [
    {
      id: '1', nombre: 'Molino I', estado: 'OCUPADO', sacosProcesados: 320, horasTrabajadas: 125,
      status: 'ocupado', name: 'Molino I', capacity: 150, total_hours_worked: 320
    },
    {
      id: '2', nombre: 'Molino II', estado: 'LIBRE', sacosProcesados: 0, horasTrabajadas: 98,
      status: 'libre', name: 'Molino II', capacity: 120, total_hours_worked: 280
    },
    {
      id: '3', nombre: 'Molino III', estado: 'MANTENIMIENTO', sacosProcesados: 0, horasTrabajadas: 156,
      status: 'mantenimiento', name: 'Molino III', capacity: 180, total_hours_worked: 310
    },
    {
      id: '4', nombre: 'Molino IV', estado: 'LIBRE', sacosProcesados: 0, horasTrabajadas: 203,
      status: 'libre', name: 'Molino IV', capacity: 160, total_hours_worked: 290
    }
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Resumen general del sistema de molienda</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
            <Download size={18} strokeWidth={1.5} className="mr-2" />
            Exportar
          </button>
          <div className="inline-flex items-center px-4 py-2 bg-white text-indigo-600 rounded-xl text-sm font-medium border border-indigo-100 shadow-sm">
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
          title="Total Moliendo"
          value="145"
          change="+12.5%"
          icon={Factory}
          color="blue"
          description="esta semana"
          trend="up"
        />
        <StatsCard
          title="Stock Actual"
          value="1,250"
          change="-2%"
          icon={ShoppingBag}
          color="orange"
          description="sacos disponibles"
          trend="down"
        />
        <StatsCard
          title="Clientes Activos"
          value="28"
          change="+3"
          icon={Users}
          color="green"
          description="nuevos este mes"
          trend="up"
        />
        <StatsCard
          title="Ingresos Mensuales"
          value="$45,280"
          change="+8.5%"
          icon={DollarSign}
          color="purple"
          description="vs mes pasado"
          trend="up"
        />
      </div>

      {/* SECCIÓN 2: ESTADO DE MOLINOS */}
      <div className="card-hover bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Estado de Molinos</h2>
            <p className="text-sm text-slate-500">Tiempo real - Actualizado ahora</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></div>
              <span className="text-xs text-slate-600 font-medium">Libre</span>
            </div>
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-xs text-slate-600 font-medium">Ocupado</span>
            </div>
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2"></div>
              <span className="text-xs text-slate-600 font-medium">Mantenimiento</span>
            </div>
          </div>
        </div>

        {/* GRID DE MOLINOS: 4 columnas en desktop, 2 en tablet, 1 en móvil */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {millsToDisplay.map((mill) => (
            <MillCard key={mill.id} mill={mill} />
          ))}
        </div>
      </div>

      {/* SECCIÓN 3: ACTIVIDAD Y MOLIENDAS EN 2 COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICA DE ACTIVIDAD */}
        <div className="card-hover bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Actividad Semanal</h2>
              <p className="text-sm text-slate-500">Sacos procesados últimos 7 días</p>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart3 className="text-indigo-600" size={20} strokeWidth={1.5} />
              <select className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option>Esta semana</option>
                <option>Este mes</option>
                <option>Este año</option>
              </select>
            </div>
          </div>
          <div className="h-80">
            <ActivityChart />
          </div>
        </div>

        {/* MOLIENDAS RECIENTES */}
        <div className="card-hover bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Moliendas Recientes</h2>
              <p className="text-sm text-slate-500">Últimas 5 registradas</p>
            </div>
            <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
              Ver todas <Activity className="ml-1" size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <RecentSessions />
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm active:scale-[0.98]">
              <span>+ Nueva Molienda</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: NOTIFICACIONES (Solo) */}
      <div className="card-hover bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="bg-red-50 p-2 rounded-lg mr-3">
              <Bell className="text-red-600" size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Notificaciones Recientes</h2>
              <p className="text-sm text-slate-500">Alertas del sistema</p>
            </div>
          </div>
          <div className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">
            3 nuevas
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start p-4 hover:bg-red-50/50 rounded-xl transition-colors border border-red-100 bg-red-50/30">
            <div className="bg-red-100 p-2 rounded-lg mr-3 shrink-0">
              <AlertTriangle size={18} strokeWidth={1.5} className="text-red-600" />
            </div>
            <div>
              <div className="flex justify-between items-start">
                <p className="font-bold text-slate-900 text-sm">Stock bajo</p>
                <span className="text-[10px] text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-medium">Crítico</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 mb-2">Nivel crítico en bodega 3 - Requiere atención.</p>
              <span className="text-[10px] text-slate-400">Hace 2 horas</span>
            </div>
          </div>

          <div className="flex items-start p-4 hover:bg-emerald-50/50 rounded-xl transition-colors border border-emerald-100 bg-emerald-50/30">
            <div className="bg-emerald-100 p-2 rounded-lg mr-3 shrink-0">
              <CheckCircle size={18} strokeWidth={1.5} className="text-emerald-600" />
            </div>
            <div>
              <div className="flex justify-between items-start">
                <p className="font-bold text-slate-900 text-sm">Nuevo cliente</p>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">Info</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 mb-2">Minera Santa Rosa registrada.</p>
              <span className="text-[10px] text-slate-400">Hace 4 horas</span>
            </div>
          </div>

          <div className="flex items-start p-4 hover:bg-blue-50/50 rounded-xl transition-colors border border-blue-100 bg-blue-50/30">
            <div className="bg-blue-100 p-2 rounded-lg mr-3 shrink-0">
              <Factory size={18} strokeWidth={1.5} className="text-blue-600" />
            </div>
            <div>
              <div className="flex justify-between items-start">
                <p className="font-bold text-slate-900 text-sm">Fin Molienda</p>
                <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-medium">Proceso</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 mb-2">320 sacos en Molino I.</p>
              <span className="text-[10px] text-slate-400">Hace 6 horas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;