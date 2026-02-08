import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

import { MillingLog } from '@/types';

interface RecentSessionsProps {
  sessions: MillingLog[];
}

const RecentSessions: React.FC<RecentSessionsProps> = ({ sessions }) => {

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'FINALIZADO': return <CheckCircle size={16} className="text-green-500" />;
      case 'EN_PROCESO': return <Clock size={16} className="text-orange-500" />;
      default: return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FINALIZADO': return 'bg-green-100 text-green-800';
      case 'EN_PROCESO': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        // Obtenemos los nombres de los molinos desde mills_used (JSONB)
        const millInfo = Array.isArray(session.mills_used) && session.mills_used.length > 0
          ? session.mills_used.map(m => m.name || m.id).join(', ')
          : 'N/A';

        const startTime = new Date(session.created_at || '');
        const horaStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
          <div
            key={session.id}
            className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mr-4 text-indigo-600 border border-indigo-100 shadow-sm">
                <span className="font-bold text-xs">MOL</span>
              </div>
              <div>
                <div className="flex items-center">
                  <h4 className="font-bold text-slate-900 leading-tight">
                    {(session as any).clients?.name || 'Cliente Desconocido'}
                  </h4>
                  <span className={`ml-3 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center ${getStatusColor(session.status)}`}>
                    {React.cloneElement(getStatusIcon(session.status) as React.ReactElement, { size: 10, strokeWidth: 2.5 })}
                    <span className="ml-1.5">{session.status.replace('_', ' ')}</span>
                  </span>
                </div>
                <div className="flex items-center text-[11px] text-slate-500 mt-1 font-medium">
                  <span className="mr-3 text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                    {session.total_sacks} SACOS
                  </span>
                  <span className="mr-3 uppercase">{session.mineral_type}</span>
                  <span className="text-slate-400">{horaStr}</span>
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