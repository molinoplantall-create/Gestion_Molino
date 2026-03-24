import React from 'react';
import { BaseModal } from '../ui/BaseModal';
import { 
  Wrench, Calendar, Clock, User, AlertTriangle, CheckCircle, 
  X, FileText, Activity, DollarSign, ListChecks
} from 'lucide-react';

interface MaintenanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = dateStr.split('T')[0].split('-');
  return `${d[2]}-${d[1]}-${d[0].slice(2)}`;
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'COMPLETADO':
    case 'FINALIZADO':
      return { icon: CheckCircle, label: 'Completado', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    case 'EN_PROCESO':
      return { icon: Clock, label: 'En Proceso', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
    case 'PENDIENTE':
      return { icon: AlertTriangle, label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
    case 'CANCELADO':
      return { icon: X, label: 'Cancelado', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
    default:
      return { icon: Activity, label: status, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
  }
};

export const MaintenanceDetailModal: React.FC<MaintenanceDetailModalProps> = ({
  isOpen,
  onClose,
  record
}) => {
  if (!record) return null;

  const statusConfig = getStatusConfig(record.status);
  const StatusIcon = statusConfig.icon;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-100 rounded-xl">
          <Wrench className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">Detalle de Mantenimiento</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {record.id?.substring(0, 12)}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
          <StatusIcon size={14} />
          {statusConfig.label}
        </div>
      </div>

      {/* Financial Summary */}
      {((record as any).cost_pen > 0 || (record as any).cost_usd > 0) && (
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumen Financiero</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(record as any).cost_pen > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-700">Costo Soles</span>
                <span className="text-sm font-black text-emerald-800">S/ {(record as any).cost_pen.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {(record as any).cost_usd > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700">Costo Dólares</span>
                <span className="text-sm font-black text-blue-800">$ {(record as any).cost_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Wrench size={12} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Molino</span>
          </div>
          <p className="text-sm font-bold text-slate-800">{record.name || record.mills?.name || 'N/A'}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar size={12} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</span>
          </div>
          <p className="text-sm font-bold text-slate-800">{formatDate(record.created_at)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={12} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Horas</span>
          </div>
          <p className="text-sm font-bold text-slate-800">{record.worked_hours || 0}h</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <User size={12} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Técnico</span>
          </div>
          <p className="text-sm font-bold text-slate-800 truncate">{record.technician_name || 'N/A'}</p>
        </div>
      </div>

      {/* Type & Priority Row */}
      <div className="flex gap-3 mb-6">
        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${record.type === 'CORRECTIVO' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
          {record.type}
        </div>
        {record.priority && (
          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
            record.priority === 'CRITICA' ? 'bg-red-100 text-red-800' :
            record.priority === 'ALTA' ? 'bg-orange-100 text-orange-800' :
            record.priority === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            Prioridad: {record.priority}
          </div>
        )}
        {record.category && (
          <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-800">
            {record.category}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <FileText size={14} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción del Problema</span>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{record.description || 'Sin descripción'}</p>
        </div>
      </div>

      {/* Checklist / Procedimiento */}
      {record.tasks_checklist && record.tasks_checklist.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-2">
            <ListChecks size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procedimiento Verificado</span>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
            {record.tasks_checklist.map((task: any, idx: number) => (
              <div key={task.id || idx} className={`flex items-center gap-3 px-4 py-2.5 ${idx !== 0 ? 'border-t border-slate-100' : ''}`}>
                <div className={`p-1 rounded-full ${task.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                  {task.completed ? <CheckCircle size={14} /> : <Clock size={14} />}
                </div>
                <span className={`text-sm ${task.completed ? 'text-slate-700' : 'text-slate-500 italic'}`}>
                  {task.text}
                </span>
                {task.completed && (
                  <span className="ml-auto text-[10px] font-bold text-emerald-500 uppercase">VERIFICADO</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Taken (if exists) */}
      {record.action_taken && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Solución Aplicada</span>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">{record.action_taken}</p>
          </div>
        </div>
      )}

      {/* Completion Info */}
      {record.completed_at && (
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center gap-3 mb-4">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-emerald-700">Completado el {formatDate(record.completed_at)}</p>
          </div>
        </div>
      )}

      {/* Failure Start Info (for MTTR) */}
      {record.failure_start_time && (
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-center gap-3 mb-4">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700">Falla reportada: {formatDate(record.failure_start_time)}</p>
          </div>
        </div>
      )}

      {/* Close Button */}
      <div className="flex justify-end mt-6 pt-4 border-t border-slate-200">
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </BaseModal>
  );
};
