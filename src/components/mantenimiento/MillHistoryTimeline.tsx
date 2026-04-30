import React, { useEffect, useState } from 'react';
import { BaseModal } from '../ui/BaseModal';
import { 
  History, Wrench, CheckCircle, Clock, AlertTriangle, X, 
  ChevronDown, Activity, Droplets
} from 'lucide-react';
import { useSupabaseStore } from '@/store/supabaseStore';

interface MillHistoryTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  millId: string;
  millName: string;
}

const fmtDate = (iso: string) => {
  if (!iso) return '-';
  const d = iso.split('T')[0].split('-');
  return `${d[2]}-${d[1]}-${d[0].slice(2)}`;
};

const statusConfig: Record<string, { icon: any, color: string, bg: string, label: string }> = {
  COMPLETADO: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Completado' },
  FINALIZADO: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Completado' },
  EN_PROCESO: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-500', label: 'En Proceso' },
  PENDIENTE: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500', label: 'Pendiente' },
  CANCELADO: { icon: X, color: 'text-gray-500', bg: 'bg-gray-400', label: 'Cancelado' },
};

export const MillHistoryTimeline: React.FC<MillHistoryTimelineProps> = ({
  isOpen,
  onClose,
  millId,
  millName
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, preventivo: 0, correctivo: 0, horasTotal: 0 });

  const { fetchMillMaintenanceHistory } = useSupabaseStore();

  useEffect(() => {
    if (!isOpen || !millId) return;

    const fetchHistory = async () => {
      setLoading(true);
      const data = await fetchMillMaintenanceHistory(millId);
      
      // Filter out 'ACEITE' type logs and legacy oil change logs to avoid polluting counts and view
      const visibleLogs = data.filter((l: any) => {
        const type = (l.type || '').toUpperCase();
        const desc = (l.description || '').toLowerCase();
        return type !== 'ACEITE' && !desc.includes('cambio de aceite') && !desc.includes('vida útil');
      });
      
      setLogs(visibleLogs);
      setStats({
        total: visibleLogs.length,
        preventivo: visibleLogs.filter((l: any) => l.type === 'PREVENTIVO').length,
        correctivo: visibleLogs.filter((l: any) => l.type === 'CORRECTIVO').length,
        horasTotal: visibleLogs.reduce((sum: number, l: any) => sum + (l.worked_hours || 0), 0),
      });
      setLoading(false);
    };

    fetchHistory();
  }, [isOpen, millId, fetchMillMaintenanceHistory]);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-indigo-100 rounded-xl">
          <History className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">Historial — {millName}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Últimos 50 registros de mantenimiento</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
          <p className="text-2xl font-black text-slate-800">{stats.total}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
          <p className="text-2xl font-black text-blue-700">{stats.preventivo}</p>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Preventivos</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 border border-red-100 text-center">
          <p className="text-2xl font-black text-red-700">{stats.correctivo}</p>
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Correctivos</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 text-center">
          <p className="text-2xl font-black text-purple-700">{stats.horasTotal}h</p>
          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Horas</p>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Wrench size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin registros de mantenimiento</p>
        </div>
      ) : (
        <div className="relative max-h-[50vh] overflow-y-auto pr-2">
          {/* Timeline Line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-0">
            {logs.map((log, idx) => {
              const config = statusConfig[log.status] || statusConfig.PENDIENTE;
              const StatusIcon = config.icon;

              return (
                <div key={log.id} className="relative pl-12 pb-6 group">
                  {/* Timeline Dot */}
                  <div className={`absolute left-3.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${config.bg} z-10`} />

                  {/* Card */}
                  <div className="bg-white border border-slate-100 rounded-xl p-3.5 hover:shadow-md transition-shadow group-hover:border-indigo-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-slate-500">{fmtDate(log.created_at)}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            log.type === 'CORRECTIVO' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>{log.type}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${config.color} bg-opacity-10`}
                            style={{ backgroundColor: `${config.bg.replace('bg-', '')}10` }}>
                            <StatusIcon size={10} />
                            {config.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 leading-snug">{log.description}</p>
                        {log.action_taken && (
                          <p className="text-xs text-emerald-600 mt-1.5 bg-emerald-50 rounded px-2 py-1">
                            ✅ {log.action_taken}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {log.worked_hours > 0 && (
                          <span className="text-xs font-bold text-slate-500">{log.worked_hours}h</span>
                        )}
                        {log.technician_name && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{log.technician_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Close */}
      <div className="flex justify-end mt-4 pt-4 border-t border-slate-200">
        <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
          Cerrar
        </button>
      </div>
    </BaseModal>
  );
};
