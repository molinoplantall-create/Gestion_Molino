import React from 'react';
import { Calculator, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface ProcessSummaryProps {
    totalSacos: number;
    totalCuarzo: number;
    totalLlampo: number;
    stockRestante: {
        total: number;
        cuarzo: number;
        llampo: number;
    };
    tiempoPorMolino: number;
    horaInicio: string | null;
    horaFin: string | null;
    molinosActivos: number;
    observaciones: string;
    onObservacionesChange: (value: string) => void;
}

export const ProcessSummary: React.FC<ProcessSummaryProps> = ({
    totalSacos,
    totalCuarzo,
    totalLlampo,
    stockRestante,
    tiempoPorMolino,
    horaInicio,
    horaFin,
    molinosActivos,
    observaciones,
    onObservacionesChange
}) => {
    const formatTiempo = (totalMinutos: number): string => {
        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;
        if (horas > 0) {
            return `${horas}h ${minutos}min`;
        }
        return `${minutos}min`;
    };

    const hasStockIssues = stockRestante.total < 0 || stockRestante.cuarzo < 0 || stockRestante.llampo < 0;

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
                <Calculator size={20} strokeWidth={1.5} className="mr-2 text-indigo-600" />
                Resumen del Proceso
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Sacos */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700">Total Sacos</span>
                        <TrendingUp size={18} className="text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{totalSacos}</div>
                    <div className="text-xs text-blue-600 mt-1">
                        C: {totalCuarzo} | L: {totalLlampo}
                    </div>
                </div>

                {/* Molinos Activos */}
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-indigo-700">Molinos</span>
                        <CheckCircle size={18} className="text-indigo-600" />
                    </div>
                    <div className="text-2xl font-bold text-indigo-900">{molinosActivos}</div>
                    <div className="text-xs text-indigo-600 mt-1">Activos</div>
                </div>

                {/* Tiempo por Molino */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-700">Tiempo/Molino</span>
                        <span className="text-lg">⏱️</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                        {tiempoPorMolino > 0 ? formatTiempo(tiempoPorMolino) : '--'}
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                        {horaInicio && horaFin ? `${horaInicio} - ${horaFin}` : 'Sin horario'}
                    </div>
                </div>

                {/* Stock Restante */}
                <div className={`p-4 rounded-lg border ${hasStockIssues
                        ? 'bg-red-50 border-red-200'
                        : 'bg-green-50 border-green-200'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${hasStockIssues ? 'text-red-700' : 'text-green-700'
                            }`}>
                            Stock Restante
                        </span>
                        {hasStockIssues ? (
                            <AlertTriangle size={18} className="text-red-600" />
                        ) : (
                            <CheckCircle size={18} className="text-green-600" />
                        )}
                    </div>
                    <div className={`text-2xl font-bold ${hasStockIssues ? 'text-red-900' : 'text-green-900'
                        }`}>
                        {stockRestante.total}
                    </div>
                    <div className={`text-xs mt-1 ${hasStockIssues ? 'text-red-600' : 'text-green-600'
                        }`}>
                        C: {stockRestante.cuarzo} | L: {stockRestante.llampo}
                    </div>
                </div>
            </div>

            {/* Stock Warnings */}
            {hasStockIssues && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start">
                        <AlertTriangle size={20} className="text-red-600 mr-3 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-red-900 mb-1">⚠️ Stock Insuficiente</h4>
                            <ul className="text-sm text-red-700 space-y-1">
                                {stockRestante.total < 0 && (
                                    <li>• El total de sacos excede el stock disponible ({Math.abs(stockRestante.total)} sacos de más)</li>
                                )}
                                {stockRestante.cuarzo < 0 && (
                                    <li>• Faltan {Math.abs(stockRestante.cuarzo)} sacos de Cuarzo</li>
                                )}
                                {stockRestante.llampo < 0 && (
                                    <li>• Faltan {Math.abs(stockRestante.llampo)} sacos de Llampo</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Observaciones */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Observaciones
                </label>
                <textarea
                    value={observaciones}
                    onChange={(e) => onObservacionesChange(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={3}
                    placeholder="Notas adicionales sobre el proceso..."
                />
            </div>
        </div>
    );
};
