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
          className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
              <span className="font-semibold text-gray-700">{session.molino.split(' ')[1]}</span>
            </div>
            <div>
              <div className="flex items-center">
                <h4 className="font-medium text-gray-900">{session.cliente}</h4>
                <span className={`ml-3 px-2 py-1 text-xs rounded-full ${getStatusColor(session.estado)}`}>
                  {getStatusIcon(session.estado)}
                  <span className="ml-1">{session.estado.replace('_', ' ')}</span>
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <span className="mr-4">{session.sacos} sacos</span>
                <span className="mr-4">{session.mineral}</span>
                <span>{session.hora}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="font-medium text-gray-900">{session.tiempo}</div>
            <div className="text-sm text-gray-500">duración</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentSessions;