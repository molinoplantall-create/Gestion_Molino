import React from 'react';
import { Calendar, MapPin, Package, CheckCircle, Clock } from 'lucide-react';

interface Batch {
    id: string;
    created_at: string;
    zone: string;
    mineral_type: string;
    sub_mineral: string;
    initial_quantity: number;
    remaining_quantity: number;
}

interface ClientBatchesTableProps {
    batches: Batch[];
    loading: boolean;
}

export const ClientBatchesTable: React.FC<ClientBatchesTableProps> = ({ batches, loading }) => {
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '---';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-slate-500 font-medium">Cargando historial...</span>
            </div>
        );
    }

    if (batches.length === 0) {
        return (
            <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <Package className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-500 font-bold">No hay historial de ingresos para este cliente</p>
            </div>
        );
    }

    return (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center">
                    <Clock size={14} className="mr-2 text-indigo-500" />
                    Historial de Ingresos por Lote
                </h4>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Zona</th>
                            <th className="px-4 py-3">Mineral</th>
                            <th className="px-4 py-3 text-center">Inicial</th>
                            <th className="px-4 py-3 text-center">Restante</th>
                            <th className="px-4 py-3 text-right">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {batches.map((batch) => {
                            const isProcessed = batch.remaining_quantity === 0;
                            return (
                                <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Calendar size={12} className="mr-1.5 text-slate-400" />
                                            {formatDate(batch.created_at)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        <div className="flex items-center">
                                            <MapPin size={12} className="mr-1.5 text-slate-400" />
                                            <span className="truncate max-w-[100px]">{batch.zone || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                                                {batch.mineral_type}
                                            </span>
                                            <span className={`text-xs font-bold ${batch.sub_mineral === 'CUARZO' ? 'text-amber-600' : 'text-indigo-600'}`}>
                                                {batch.sub_mineral}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-slate-400">
                                        {batch.initial_quantity}
                                    </td>
                                    <td className="px-4 py-3 text-center font-black text-slate-900">
                                        {batch.remaining_quantity}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {isProcessed ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-slate-100 text-slate-500 border border-slate-200">
                                                <CheckCircle size={10} className="mr-1" />
                                                Procesado
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 border border-emerald-100 animate-pulse">
                                                En Stock
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
