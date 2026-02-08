import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

import { MillingLog } from '@/types';

interface RecentSessionsProps {
  sessions: MillingLog[];
  mills?: any[];
}

const RecentSessions: React.FC<RecentSessionsProps> = ({ sessions, mills = [] }) => {

  const translateStatus = (status: string) => {
    switch (status) {
      case 'FINALIZADO': return 'Finalizado';
      case 'EN_PROCESO': return 'En Proceso';
      case 'IN_PROGRESS': return 'En Proceso';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FINALIZADO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'EN_PROCESO':
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        // Obtenemos los nombres de los molinos desde mills_used (JSONB)
        // Fallback robusto usando el estado de molinos del store si no hay nombre guardado
        const millInfo = Array.isArray(session.mills_used) && session.mills_used.length > 0
          ? session.mills_used.map(m => {
            if (m.name) return m.name;
            const storeM = mills.find(sm => sm.id === m.id);
            return storeM?.name || `Molino ${m.id.substring(0, 4)}`;
          }).join(', ')
          : 'N/A';

        const startTime = new Date(session.created_at || '');
        const horaStr = startTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });

        return (
          <div
            key={session.id}
            className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mr-4 text-indigo-600 border border-indigo-100 shadow-sm group-hover:scale-110 transition-transform">
                <Clock size={20} strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center">
                  <h4 className="font-bold text-slate-900 leading-tight">
                    {(session as any).clients?.name || 'Cliente'}
                  </h4>
                  <span className={`ml-3 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center border ${getStatusColor(session.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 anim-pulse"></span>
                    {translateStatus(session.status)}
                  </span>
                </div>
                <div className="flex items-center text-[11px] text-slate-500 mt-1 font-medium">
                  <span className="mr-3 text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded leading-none font-bold">
                    {session.total_sacks} SACOS
                  </span>
                  <span className="mr-3 uppercase tracking-wider font-bold text-slate-700">{session.mineral_type}</span>
                  <span className="text-slate-400 flex items-center">
                    <span className="mr-1.5 font-bold text-slate-500">{startTime.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })}</span>
                    <span>{horaStr}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Molinos</div>
              <div className="font-bold text-slate-700 text-xs truncate max-w-[80px]" title={millInfo}>
                {millInfo}
              </div>
            </div>
          </div>
        );
      })}
      {sessions.length === 0 && (
        <div className="py-10 text-center text-slate-400 font-medium italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No hay moliendas recientes
        </div>
      )}
    </div>
  );
};

export default RecentSessions;