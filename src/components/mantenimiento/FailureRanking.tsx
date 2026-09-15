import React, { useMemo } from 'react';
import { AlertTriangle, Calendar, CheckCircle } from 'lucide-react';

interface FailureRankingProps {
  maintenanceLogs: any[];
  mills: any[];
}

export const FailureRanking: React.FC<FailureRankingProps> = ({
  maintenanceLogs,
  mills
}) => {
  const rankings = useMemo(() => {
    if (!maintenanceLogs.length) return { byMill: [], byMonth: [], byType: [] };

    const millCounts: Record<string, { id: string; name: string; fallas: number; preventivos: number }> = {};

    maintenanceLogs.forEach((log: any) => {
      const millId = log.mill_id || log.molino_id;
      if (!millId) return;

      if (!millCounts[millId]) {
        const mill = mills.find(m => m.id === millId);
        millCounts[millId] = { id: millId, name: mill?.name || `Molino ${millId}`, fallas: 0, preventivos: 0 };
      }

      const tipo = (log.type || log.tipo || '').toUpperCase();
      if (tipo === 'CORRECTIVO' || tipo === 'EMERGENCIA') millCounts[millId].fallas++;
      else if (tipo === 'PREVENTIVO') millCounts[millId].preventivos++;
    });

    const byMill = Object.values(millCounts).sort((a, b) => b.fallas - a.fallas);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const byMonth: { label: string; fallas: number; predictivos: number; preventivos: number }[] = [];

    for (let i = 0; i <= currentMonth; i++) {
      const monthLogs = maintenanceLogs.filter((log: any) => {
        const d = new Date(log.created_at);
        return d.getFullYear() === currentYear && d.getMonth() === i;
      });
      const tipos = monthLogs.map((l: any) => (l.type || l.tipo || '').toUpperCase());
      byMonth.push({
        label: monthNames[i],
        // "Fallas" = Correctivo + Emergencia juntos: ambos representan que
        // el molino se rompió, uno de forma más urgente que el otro.
        fallas: tipos.filter(t => t === 'CORRECTIVO' || t === 'EMERGENCIA').length,
        predictivos: tipos.filter(t => t === 'PREDICTIVO').length,
        preventivos: tipos.filter(t => t === 'PREVENTIVO').length
      });
    }

    const descCounts: Record<string, number> = {};
    maintenanceLogs
      .filter((l: any) => (l.type || l.tipo || '').toUpperCase() === 'CORRECTIVO')
      .forEach((log: any) => {
        const desc = (log.description || '').trim().substring(0, 60);
        if (desc) descCounts[desc] = (descCounts[desc] || 0) + 1;
      });

    const byType = Object.entries(descCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([desc, count]) => ({ desc, count }));

    return { byMill, byMonth, byType };
  }, [maintenanceLogs, mills]);

  if (!maintenanceLogs.length) return null;

  const maxMonthTotal = Math.max(...rankings.byMonth.map(m => m.fallas + m.predictivos + m.preventivos), 1);
  const CHART_HEIGHT_PX = 140;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 leading-none">Tendencia de Fallas</h3>
          <p className="text-xs font-medium text-slate-400 mt-1">Para el ranking exacto por molino, mira "Comparación entre Molinos" más abajo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar size={12} /> Fallas por Mes ({new Date().getFullYear()})
          </h4>
          <div className="flex items-end gap-2" style={{ height: `${CHART_HEIGHT_PX}px` }}>
            {rankings.byMonth.map((month, idx) => {
              const total = month.fallas + month.predictivos + month.preventivos;
              const totalHeightPx = Math.max((total / maxMonthTotal) * CHART_HEIGHT_PX, total > 0 ? 6 : 2);
              const fallasHeightPx = total > 0 ? (month.fallas / total) * totalHeightPx : 0;
              const predictivosHeightPx = total > 0 ? (month.predictivos / total) * totalHeightPx : 0;
              const preventivosHeightPx = totalHeightPx - fallasHeightPx - predictivosHeightPx;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                  <span className="text-[10px] font-black text-slate-400">{total > 0 ? total : ''}</span>
                  <div className="w-full flex flex-col-reverse rounded-t-md overflow-hidden" style={{ height: `${totalHeightPx}px` }}>
                    <div style={{ height: `${fallasHeightPx}px` }} className="w-full bg-red-500" title={`${month.fallas} fallas (Correctivo + Emergencia)`} />
                    <div style={{ height: `${predictivosHeightPx}px` }} className="w-full bg-violet-400" title={`${month.predictivos} predictivos`} />
                    <div style={{ height: `${preventivosHeightPx}px` }} className="w-full bg-blue-400" title={`${month.preventivos} preventivos`} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{month.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 bg-slate-50 py-2 rounded-xl flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Fallas (Correctivo + Emergencia)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-400" /> Predictivo</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Preventivo</span>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2">
            <AlertTriangle size={12} /> Problemas Más Repetidos
          </h4>
          {rankings.byType.length > 0 ? (
            <div className="space-y-2.5">
              {rankings.byType.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                  <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0 font-black text-xs">
                    {item.count}
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-snug pt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-300 bg-slate-50 rounded-2xl">
              <CheckCircle size={32} className="mb-2 text-emerald-300" />
              <p className="text-xs font-bold">Sin fallas registradas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
