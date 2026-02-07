import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { useSupabaseStore } from '@/store/supabaseStore';
import { format, parseISO, subDays, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

const ActivityChart: React.FC = () => {
  const { millingLogs } = useSupabaseStore();

  const chartData = useMemo(() => {
    if (!millingLogs || millingLogs.length === 0) return [];

    // Group by date for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return {
        date: startOfDay(date),
        displayDate: format(date, 'EEE dd', { locale: es }),
        total: 0
      };
    }).reverse();

    millingLogs.forEach(log => {
      const logDate = startOfDay(parseISO(log.created_at));
      const dayData = last7Days.find(d => isSameDay(d.date, logDate));
      if (dayData) {
        dayData.total += (log.total_sacks || 0);
      }
    });

    return last7Days;
  }, [millingLogs]);

  if (!millingLogs || millingLogs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 font-medium italic">
        {/* 
        - [x] Detalle de carga por molino con Suma Total visible

        ## Fase 10: Dashboard Visual y Analítica (Solicitud Usuario)
        - [/] Implementar gráfica de producción (Sacos por día)
        - [ ] Alertas visuales de Stock Bajo en Clientes
        - [ ] Refinar diseño de Recibos para impresión
        - [ ] KPIs avanzados en Dashboard (Hoy vs Ayer)
        */}
        No hay datos de producción suficientes...
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="displayDate"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '12px'
            }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Sacos"
            stroke="#4f46e5"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorTotal)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ActivityChart;
