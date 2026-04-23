import React, { useMemo } from 'react';
import { BarChart3, AlertTriangle, Wrench, TrendingUp, CheckCircle } from 'lucide-react';

interface FailureRankingProps {
  maintenanceLogs: any[];
  mills: any[];
}

export const FailureRanking: React.FC<FailureRankingProps> = ({
  maintenanceLogs,
  mills
}) => {
  const rankings = useMemo(() => {
    if (!maintenanceLogs.length) return { byMill: [], byType: [], byMonth: [] };

    // Ranking by Mill (most failures)
    const millCounts: Record<string, { id: string, name: string, total: number, correctivo: number, preventivo: number, hours: number }> = {};
    
    maintenanceLogs.forEach((log: any) => {
      const millId = log.mill_id || log.molino_id;
      if (!millId) return;
      
      if (!millCounts[millId]) {
        const mill = mills.find(m => m.id === millId);
        millCounts[millId] = {
          id: millId,
          name: mill?.name || `Molino ${millId}`,
          total: 0,
          correctivo: 0,
          preventivo: 0,
          hours: 0
        };
      }
      
      millCounts[millId].total++;
      if (log.type === 'CORRECTIVO') millCounts[millId].correctivo++;
      else millCounts[millId].preventivo++;
      millCounts[millId].hours += (log.worked_hours || 0);
    });

    const byMill = Object.values(millCounts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // Monthly distribution (last 12 months)
    const now = new Date();
    const byMonth: { label: string, preventivo: number, correctivo: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      const monthLogs = maintenanceLogs.filter((log: any) => {
        const logDate = new Date(log.created_at);
        return logDate.getFullYear() === year && logDate.getMonth() === month;
      });

      byMonth.push({
        label: `${monthNames[month]} ${String(year).slice(2)}`,
        preventivo: monthLogs.filter((l: any) => l.type === 'PREVENTIVO').length,
        correctivo: monthLogs.filter((l: any) => l.type === 'CORRECTIVO').length,
      });
    }

    // Top failure descriptions
    const descCounts: Record<string, number> = {};
    maintenanceLogs
      .filter((l: any) => l.type === 'CORRECTIVO')
      .forEach((log: any) => {
        const desc = (log.description || '').substring(0, 50);
        if (desc) descCounts[desc] = (descCounts[desc] || 0) + 1;
      });

    const byType = Object.entries(descCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([desc, count]) => ({ desc, count }));

    return { byMill, byType, byMonth };
  }, [maintenanceLogs, mills]);

  if (!maintenanceLogs.length) return null;

  const maxMillTotal = Math.max(...rankings.byMill.map(m => m.total), 1);
  const maxMonthTotal = Math.max(...rankings.byMonth.map(m => m.preventivo + m.correctivo), 1);

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-2 mb-8">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <BarChart3 size={20} />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 leading-none">Análisis Predictivo de Fallas</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Inteligencia y Frecuencia de Activos</p>
        </div>
        <div className="ml-auto bg-slate-100 px-3 py-1 rounded-full">
           <span className="text-[10px] font-black text-slate-500 uppercase">{maintenanceLogs.length} Entradas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column 1: Ranking by Mill */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-2">
            <Wrench size={10} /> Frecuencia por Activo
          </h4>
          <div className="flex items-center gap-3 mb-2">
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
               <span className="text-[9px] font-black text-slate-400 uppercase">Correctivo</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
               <span className="text-[9px] font-black text-slate-400 uppercase">Preventivo</span>
             </div>
          </div>
          <div className="space-y-3">
            {rankings.byMill.map((mill, idx) => (
              <div key={mill.id} className="group cursor-default">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black text-white shrink-0 ${
                      idx === 0 ? 'bg-red-500 animate-pulse' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-amber-500' : 'bg-slate-300'
                    }`}>{idx + 1}</span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{mill.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400">{mill.total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-50">
                  <div className="h-full rounded-full flex shadow-inner">
                    <div className="bg-gradient-to-r from-red-400 to-red-500 h-full transition-all duration-700" style={{ width: `${(mill.correctivo / maxMillTotal) * 100}%` }} />
                    <div className="bg-gradient-to-r from-blue-400 to-blue-500 h-full transition-all duration-700" style={{ width: `${(mill.preventivo / maxMillTotal) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Monthly Distribution */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-2">
            <TrendingUp size={10} /> Frecuencia Mensual
          </h4>
          <div className="flex items-end gap-3 h-36 pt-4">
            {rankings.byMonth.map((month, idx) => {
              const total = month.preventivo + month.correctivo;
              const heightPct = (total / maxMonthTotal) * 100;
              const correctivoPct = total > 0 ? (month.correctivo / total) * 100 : 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="relative w-full flex flex-col items-center">
                     <span className="text-[9px] font-black text-slate-400 absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity">{total}</span>
                     <div className="w-full rounded-t-lg overflow-hidden flex flex-col-reverse shadow-sm border border-slate-50 group-hover:shadow-md transition-all" style={{ height: `${Math.max(heightPct, 8)}%`, width: '100%' }}>
                       <div className="bg-blue-500/80 w-full hover:brightness-110 transition-all" style={{ height: `${100 - correctivoPct}%` }} title="Preventivo" />
                       <div className="bg-red-500/80 w-full hover:brightness-110 transition-all border-b border-white/20" style={{ height: `${correctivoPct}%` }} title="Correctivo" />
                     </div>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate w-full text-center">{month.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 py-2 rounded-xl border border-slate-100">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shadow-sm" /> Correctivo</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" /> Preventivo</span>
          </div>
        </div>

        {/* Column 3: Top Failures */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-2">
            <AlertTriangle size={10} /> Problemas Críticos
          </h4>
          {rankings.byType.length > 0 ? (
            <div className="space-y-3">
              {rankings.byType.map((item, idx) => (
                <div key={idx} className="group relative flex items-start gap-3 bg-white hover:bg-red-50/50 rounded-xl p-3 border border-slate-100 hover:border-red-100 transition-all cursor-default shadow-sm hover:translate-x-1">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 font-black text-xs border border-red-100 group-hover:bg-red-500 group-hover:text-white transition-all">
                    {item.count}
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-bold leading-tight line-clamp-2 group-hover:text-slate-900 transition-colors uppercase italic">
                      "{item.desc.toLowerCase()}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-300 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle size={32} className="mb-2 opacity-20 text-emerald-500" />
              <p className="text-[10px] font-black uppercase tracking-widest">Operación Limpia</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
