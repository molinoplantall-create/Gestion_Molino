import React, { useMemo } from 'react';
import { BarChart3, AlertTriangle, Wrench, TrendingUp } from 'lucide-react';

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

    // Monthly distribution (last 6 months)
    const now = new Date();
    const byMonth: { label: string, preventivo: number, correctivo: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
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
    <div className="bg-white rounded-2xl p-4 md:p-6 border">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={20} className="text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Análisis de Fallas</h3>
        <span className="text-xs text-slate-400 ml-auto">{maintenanceLogs.length} registros totales</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Ranking by Mill */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
            <Wrench size={12} /> Ranking por Molino
          </h4>
          <div className="space-y-2">
            {rankings.byMill.map((mill, idx) => (
              <div key={mill.id} className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${
                  idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-amber-500' : 'bg-slate-400'
                }`}>{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-slate-700 truncate">{mill.name}</span>
                    <span className="text-xs font-black text-slate-800 ml-2">{mill.total}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full flex">
                      <div className="bg-red-400 h-full" style={{ width: `${(mill.correctivo / maxMillTotal) * 100}%` }} />
                      <div className="bg-blue-400 h-full" style={{ width: `${(mill.preventivo / maxMillTotal) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Correctivo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Preventivo</span>
          </div>
        </div>

        {/* Column 2: Monthly Distribution */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
            <TrendingUp size={12} /> Tendencia Mensual
          </h4>
          <div className="flex items-end gap-2 h-32">
            {rankings.byMonth.map((month, idx) => {
              const total = month.preventivo + month.correctivo;
              const heightPct = (total / maxMonthTotal) * 100;
              const correctivoPct = total > 0 ? (month.correctivo / total) * 100 : 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-600">{total}</span>
                  <div className="w-full rounded-t-md overflow-hidden flex flex-col-reverse" style={{ height: `${Math.max(heightPct, 4)}%` }}>
                    <div className="bg-blue-400 w-full" style={{ height: `${100 - correctivoPct}%` }} />
                    <div className="bg-red-400 w-full" style={{ height: `${correctivoPct}%` }} />
                  </div>
                  <span className="text-[9px] font-medium text-slate-400">{month.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Top Failures */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
            <AlertTriangle size={12} /> Top Fallas Correctivas
          </h4>
          {rankings.byType.length > 0 ? (
            <div className="space-y-2">
              {rankings.byType.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <span className="text-red-500 font-black text-sm shrink-0">{item.count}x</span>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{item.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <AlertTriangle size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Sin fallas correctivas registradas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
