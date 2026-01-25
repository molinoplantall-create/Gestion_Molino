import React from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react';
import MillCard from '@/components/dashboard/MillCard';
import StatsCard from '@/components/dashboard/StatsCard';
import RecentSessions from '@/components/dashboard/RecentSessions';
import ActivityChart from '@/components/dashboard/ActivityChart';
import { useAppStore } from '@/store/appStore';

const Dashboard: React.FC = () => {
  const { mills, getMillingStats } = useAppStore();
  const stats = getMillingStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Visión general del sistema en tiempo real</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-sm font-medium">
            <Calendar size={16} className="mr-2" />
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Sacos"
          value="4,220"
          change="+12%"
          icon={Package}
          color="blue"
          description="Total procesados"
        />
        <StatsCard
          title="En Proceso"
          value={stats.activeSessions.toString()}
          icon={Clock}
          color="orange"
          description="Moliendas activas"
        />
        <StatsCard
          title="Completadas Hoy"
          value={stats.completedToday.toString()}
          change="+8%"
          icon={CheckCircle}
          color="green"
          description="Desde medianoche"
        />
        <StatsCard
          title="Mantenimiento"
          value="1"
          icon={AlertTriangle}
          color="red"
          description="Requiere atención"
        />
      </div>

      {/* Mills Status */}
      <div className="card-hover bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Estado de Molinos</h2>
            <p className="text-gray-600">Tiempo real - Actualizado ahora</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Libre</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Ocupado</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Mantenimiento</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mills.map((mill) => (
            <MillCard key={mill.id} mill={mill} />
          ))}
        </div>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="card-hover bg-white rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Actividad por Molino</h2>
              <p className="text-gray-600">Sacos procesados últimos 7 días</p>
            </div>
            <BarChart3 className="text-primary-600" size={24} />
          </div>
          <ActivityChart />
        </div>

        {/* Recent Sessions */}
        <div className="card-hover bg-white rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Moliendas Recientes</h2>
              <p className="text-gray-600">Últimas 5 registradas</p>
            </div>
            <TrendingUp className="text-primary-600" size={24} />
          </div>
          <RecentSessions />
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-hover bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-2xl p-6">
          <div className="flex items-center">
            <Users className="mr-3" size={24} />
            <div>
              <p className="text-sm opacity-90">Clientes Activos</p>
              <p className="text-2xl font-bold">12</p>
            </div>
          </div>
          <p className="text-sm opacity-90 mt-4">+2 este mes</p>
        </div>
        
        <div className="card-hover bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl p-6">
          <div className="flex items-center">
            <CheckCircle className="mr-3" size={24} />
            <div>
              <p className="text-sm opacity-90">Eficiencia</p>
              <p className="text-2xl font-bold">94%</p>
            </div>
          </div>
          <p className="text-sm opacity-90 mt-4">+3% vs mes anterior</p>
        </div>
        
        <div className="card-hover bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-6">
          <div className="flex items-center">
            <Clock className="mr-3" size={24} />
            <div>
              <p className="text-sm opacity-90">Tiempo Promedio</p>
              <p className="text-2xl font-bold">2.1h</p>
            </div>
          </div>
          <p className="text-sm opacity-90 mt-4">-0.3h vs mes anterior</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;