import React from 'react';
import { useSupabaseStore } from '@/store/supabaseStore';

const ActivityChart: React.FC = () => {
  const { mills, millingLogs } = useSupabaseStore();

  // Colores predefinidos para los molinos
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-orange-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-amber-500'
  ];

  // Calculamos el total de sacos procesados por cada molino
  const chartData = mills.map((mill, index) => {
    let totalSacos = 0;

    millingLogs.forEach(log => {
      if (Array.isArray(log.mills_used)) {
        const usage = log.mills_used.find((m: any) => m.mill_id === mill.id);
        if (usage) {
          totalSacos += (usage.cuarzo || 0) + (usage.llampo || 0);
        }
      }
    });

    return {
      name: mill.name,
      value: totalSacos,
      color: colors[index % colors.length]
    };
  });

  const maxValue = Math.max(...chartData.map(d => d.value), 1);

  return (
    <div>
      <div className="space-y-5">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-24 shrink-0">
              <span className="text-sm font-bold text-slate-700 truncate block" title={item.name}>
                {item.name}
              </span>
            </div>
            <div className="flex-1 ml-4">
              <div className="relative">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  <span className="text-slate-600 italic">{item.value.toLocaleString()} sacos</span>
                  <span>{((item.value / maxValue) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 shadow-inner">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-1000 ease-out shadow-sm`}
                    style={{ width: `${(item.value / maxValue) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {chartData.length === 0 && (
          <div className="py-20 text-center text-slate-400 font-medium italic">
            Esperando datos de molienda...
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-8">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${item.color} mr-2 shadow-sm`}></div>
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tight">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityChart;