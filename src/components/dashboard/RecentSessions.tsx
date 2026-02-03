import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

const RecentSessions: React.FC = () => {
  const sessions = [
    {
      id: 1,
      molino: 'Molino I',
      cliente: 'Minera Andina',
      sacos: 25,
      mineral: 'Sulfuro',
      estado: 'FINALIZADO',
      hora: '10:30 - 13:15',
      tiempo: '2h 45m',
    },
    {
      id: 2,
      molino: 'Molino II',
      cliente: 'Minerales del Sur',
      sacos: 18,
      mineral: 'Óxido',
      estado: 'EN_PROCESO',
      hora: '11:00 - 12:40',
      tiempo: '1h 40m',
    },
    {
      id: 3,
      molino: 'Molino IV',
      cliente: 'Compañía Extractora',
      sacos: 30,
      mineral: 'Sulfuro',
      estado: 'FINALIZADO',
      hora: '08:00 - 11:30',
      tiempo: '3h 30m',
    },
  ];

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'FINALIZADO': return <CheckCircle size={16} className="text-green-500" />;
      case 'EN_PROCESO': return <Clock size={16} className="text-orange-500" />;
      default: return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'FINALIZADO': return 'bg-green-100 text-green-800';
      case 'EN_PROCESO': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mr-4 text-slate-600">
              <span className="font-semibold">{session.molino.split(' ')[1]}</span>
            </div>
            <div>
              <div className="flex items-center">
                <h4 className="font-medium text-slate-900">{session.cliente}</h4>
                <span className={`ml-3 px-2 py-0.5 text-xs rounded-full flex items-center ${getStatusColor(session.estado)}`}>
                  {React.cloneElement(getStatusIcon(session.estado) as React.ReactElement, { size: 14, strokeWidth: 1.5 })}
                  <span className="ml-1.5">{session.estado.replace('_', ' ')}</span>
                </span>
              </div>
              <div className="flex items-center text-sm text-slate-500 mt-1">
                <span className="mr-4 text-slate-600 font-medium">{session.sacos} sacos</span>
                <span className="mr-4">{session.mineral}</span>
                <span>{session.hora}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="font-medium text-slate-900">{session.tiempo}</div>
            <div className="text-xs text-slate-400">duración</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentSessions;