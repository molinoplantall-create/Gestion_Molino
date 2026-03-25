import React from 'react';
import { Eye, Edit, Trash2, CheckCircle, Clock, AlertTriangle, X, Wrench, Calendar, User, AlertCircle, ChevronRight, MoreVertical, History, Check, Copy } from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

interface MaintenanceRecord {
    id: string;
    mill_id: string;
    type: string;
    status: string;
    priority?: string;
    category?: string;
    description: string;
    action_taken?: string;
    worked_hours?: number;
    technician_name?: string;
    created_at: string;
    mills?: {
        name: string;
    };
}

interface MaintenanceTableProps {
    logs: MaintenanceRecord[];
    loading?: boolean;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onView: (record: MaintenanceRecord) => void;
    onEdit: (record: MaintenanceRecord) => void;
    onDelete: (id: string) => void;
    onViewHistory: (molinoId: string) => void;
    onFinalize?: (id: string, millId: string) => void;
    onDuplicate?: (record: MaintenanceRecord) => void;
}

export const MaintenanceTable: React.FC<MaintenanceTableProps> = ({
    logs,
    loading = false,
    currentPage,
    totalPages,
    onPageChange,
    onView,
    onEdit,
    onDelete,
    onViewHistory,
    onFinalize,
    onDuplicate
}) => {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETADO':
            case 'FINALIZADO':
                return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center w-fit"><CheckCircle size={12} className="mr-1" /> Completado</span>;
            case 'EN_PROCESO':
                return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center w-fit"><Clock size={12} className="mr-1" /> En Proceso</span>;
            case 'PENDIENTE':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center w-fit"><AlertTriangle size={12} className="mr-1" /> Pendiente</span>;
            case 'ESPERA_REPUESTO':
                return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center w-fit"><Clock size={12} className="mr-1" /> Espera Repuesto</span>;
            case 'CANCELADO':
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full flex items-center w-fit"><X size={12} className="mr-1" /> Cancelado</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{status}</span>;
        }
    };

    const getTypeBadge = (tipo: string) => {
        const styles = {
            PREVENTIVO: 'bg-blue-100 text-blue-800',
            CORRECTIVO: 'bg-red-100 text-red-800',
            PREDICTIVO: 'bg-green-100 text-green-800',
            EMERGENCIA: 'bg-orange-100 text-orange-800'
        };

        return (
            <span className={`px-2 py-1 text-xs rounded-full ${styles[tipo as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {tipo}
            </span>
        );
    };

    const getPriorityBadge = (prioridad?: string) => {
        if (!prioridad) return null;

        const styles = {
            BAJA: 'bg-gray-100 text-gray-800',
            MEDIA: 'bg-yellow-100 text-yellow-800',
            ALTA: 'bg-orange-100 text-orange-800',
            CRITICA: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`px-2 py-1 text-xs rounded-full ${styles[prioridad as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {prioridad}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border overflow-hidden">
                <LoadingSpinner size="lg" text="Cargando registros..." className="py-12" />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="bg-white rounded-2xl border overflow-hidden">
                <EmptyState
                    title="No hay registros de mantenimiento"
                    description="No se encontraron registros con los filtros aplicados. Intenta ajustar los criterios de búsqueda."
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Desktop Table Vie - Hidden on Mobile */}
            <div className="hidden md:block bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/50 backdrop-blur-sm">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Molino</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo/Prioridad</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.map((log) => (
                                <tr key={log.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900 font-bold">
                                            {(() => { const d = log.created_at.split('T')[0].split('-'); return `${d[2]}-${d[1]}-${d[0].slice(2)}`; })()}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            #{log.id.substring(0, 8)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mr-3 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                                <span className="font-black text-indigo-600 text-[10px] group-hover:text-white">
                                                    {log.mills?.name?.substring(0, 2) || 'M'}
                                                </span>
                                            </div>
                                            <span className="text-slate-700 font-bold text-sm tracking-tight">{log.mills?.name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            {getTypeBadge(log.type)}
                                            {log.priority && getPriorityBadge(log.priority)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-xs">
                                            <p className="text-sm text-slate-600 line-clamp-1 group-hover:line-clamp-none transition-all" title={log.description}>
                                                {log.description}
                                            </p>
                                            {log.technician_name && (
                                                <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-400">
                                                    <User size={10} />
                                                    {log.technician_name}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {getStatusBadge(log.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-0.5">
                                            {(log as any).cost_pen > 0 && <span className="text-emerald-600 font-black text-xs">S/ {(log as any).cost_pen.toLocaleString('es-PE')}</span>}
                                            {(log as any).cost_usd > 0 && <span className="text-blue-600 font-black text-xs">$ {(log as any).cost_usd.toLocaleString('en-US')}</span>}
                                            {!(log as any).cost_pen && !(log as any).cost_usd && <span className="text-slate-300 text-[10px]">Sin costo</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                                            <Clock size={14} className="text-slate-300" />
                                            {log.worked_hours ? `${log.worked_hours}h` : '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                                            <button
                                                onClick={() => onViewHistory(log.mill_id)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
                                                title="Ver historial"
                                            >
                                                <History size={16} />
                                            </button>

                                            {log.status !== 'COMPLETADO' && log.status !== 'FINALIZADO' && onFinalize && (
                                                <button
                                                    onClick={() => onFinalize(log.id, log.mill_id)}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
                                                    title="Finalizar"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onView(log)}
                                                className="p-2 text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
                                                title="Detalles"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => onEdit(log)}
                                                className="p-2 text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(log.id)}
                                                className="p-2 text-red-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            {onDuplicate && (
                                                <button
                                                    onClick={() => onDuplicate(log)}
                                                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
                                                    title="Duplicar"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View - Shown only on small screens */}
            <div className="grid grid-cols-1 gap-4 md:hidden pb-4">
                {logs.map((log) => (
                    <div key={log.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm active:scale-[0.98] transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                                    <span className="font-black text-indigo-600 text-xs">{log.mills?.name?.substring(0, 2) || 'M'}</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 leading-none">{log.mills?.name || 'N/A'}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">
                                        {(() => { const d = log.created_at.split('T')[0].split('-'); return `${d[2]}-${d[1]}-${d[0].slice(2)}`; })()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                                {getStatusBadge(log.status)}
                                {getTypeBadge(log.type)}
                            </div>
                        </div>

                        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 mb-4">
                            <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed italic">"{log.description}"</p>
                            <div className="flex items-center justify-between mt-3 text-[10px] font-bold text-slate-400 uppercase">
                                <div className="flex items-center gap-1">
                                    <User size={12} />
                                    <span>{log.technician_name || 'Sin técnico'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock size={12} />
                                    <span>{log.worked_hours || 0}h estimadas</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                            <div className="flex flex-col">
                                {(log as any).cost_pen > 0 && <span className="text-emerald-700 font-bold text-xs">S/ {(log as any).cost_pen}</span>}
                                {(log as any).cost_usd > 0 && <span className="text-blue-700 font-bold text-xs">$ {(log as any).cost_usd}</span>}
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => onView(log)} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl shadow-sm"><Eye size={18} /></button>
                                <button onClick={() => onEdit(log)} className="p-2.5 bg-slate-100 text-indigo-600 rounded-xl shadow-sm"><Edit size={18} /></button>
                                {log.status !== 'COMPLETADO' && onFinalize && (
                                    <button onClick={() => onFinalize(log.id, log.mill_id)} className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shadow-sm"><Check size={18} /></button>
                                )}
                                <button onClick={() => onDelete(log.id)} className="p-2.5 bg-red-100 text-red-600 rounded-xl shadow-sm"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Paginación Adaptativa */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 backdrop-blur-md rounded-b-2xl gap-4">
                    <div className="text-sm text-slate-500 font-medium">
                        Página <span className="text-slate-900 font-bold">{currentPage}</span> de <span className="text-slate-900 font-bold">{totalPages}</span> 
                        <span className="hidden sm:inline text-slate-300 mx-2">|</span> 
                        <span className="block sm:inline font-bold text-indigo-600">{logs.length} registros cargados</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="flex-1 sm:flex-none px-5 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="flex-1 sm:flex-none px-5 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
