import React from 'react';
import { Clock, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';
import { Mill } from '@/types';
import { MILL_STATUS_CONFIG } from '@/constants';

interface MillCardProps {
  mill: Mill;
}

const MillCard: React.FC<MillCardProps> = ({ mill }) => {
  const getStatusIcon = () => {
    switch (mill.estado) {
      case 'LIBRE': return <CheckCircle size={20} className="text-green-500" />;
      case 'OCUPADO': return <Clock size={20} className="text-orange-500" />;
      case 'MANTENIMIENTO': return <Wrench size={20} className="text-red-500" />;
      default: return <AlertTriangle size={20} className="text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (mill.estado) {
      case 'LIBRE': return 'border-green-200 bg-green-50';
      case 'OCUPADO': return 'border-orange-200 bg-orange-50';
      case 'MANTENIMIENTO': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={`card-hover border rounded-2xl p-5 ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border">
            <span className="text-xl">⚙️</span>
          </div>
          <div className="ml-3">
            <h3 className="font-bold text-gray-900">{mill.nombre}</h3>
            <div className="flex items-center mt-1">
              {getStatusIcon()}
              <span className="ml-2 font-medium capitalize">
                {MILL_STATUS_CONFIG[mill.estado]?.label || mill.estado.toLowerCase()}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{mill.sacosProcesados.toLocaleString()}</div>
          <div className="text-sm text-gray-500">sacos</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between pt-3 border-t border-gray-200">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{mill.horasTrabajadas}</div>
            <div className="text-xs text-gray-500">horas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {Math.round(mill.horasTrabajadas / 50)}
            </div>
            <div className="text-xs text-gray-500">mant.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MillCard;