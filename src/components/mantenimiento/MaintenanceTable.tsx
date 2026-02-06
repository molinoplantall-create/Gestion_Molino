import React from 'react';
import { Eye, Edit, Trash2, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';
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
}

export const MaintenanceTable: React.FC<MaintenanceTableProps> = ({
    logs,
    loading = false,
    currentPage,
    totalPages,
    onPageChange,
    onView,
    onEdit,
    onDelete
}) => {
    const getStatusBadge = (estado: string) => {
        switch (estado) {
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
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{estado}</span>;
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
        <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Molino</th>
                            <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo/Prioridad</th>
                            <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                            <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horas</th>
                            <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                    <span className="font-mono text-xs text-gray-600">
                                        {log.id.substring(0, 8)}...
                                    </span>
                                </td>
                                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                            <span className="font-medium text-indigo-700 text-sm">
                                                {log.mills?.name?.substring(0, 2) || 'M'}
                                            </span>
                                        </div>
                                        <span className="text-gray-900 font-medium">{log.mills?.name || 'N/A'}</span>
                                    </div>
                                </td>
                                <td className="px-4 md:px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        {getTypeBadge(log.type)}
                                        {log.priority && getPriorityBadge(log.priority)}
                                    </div>
                                </td>
                                <td className="px-4 md:px-6 py-4">
                                    <div className="max-w-xs">
                                        <p className="text-sm text-gray-900 truncate" title={log.description}>
                                            {log.description}
                                        </p>
                                        {log.technician_name && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Técnico: {log.technician_name}
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(log.status)}
                                </td>
                                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-gray-900">
                                        {log.worked_hours ? `${log.worked_hours}h` : '-'}
                                    </span>
                                </td>
                                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onView(log)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Ver detalles"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => onEdit(log)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(log.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-600">
                        Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
