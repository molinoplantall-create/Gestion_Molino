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
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                    <Calculator size={20} strokeWidth={1.5} className="mr-2 text-indigo-600" />
                    Resumen del Proceso
                </h2>
                {(totalSacos > 0 || totalCuarzo > 0 || totalLlampo > 0) && (
                    <span className="flex items-center text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-1.5"></span>
                        CÁLCULO EN VIVO
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                {/* Total Sacos */}
                <div className="p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg group hover:bg-blue-100 transition-colors">
                    <div className="flex items-center justify-between mb-1 md:mb-2 text-blue-700">
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-tight">Total Sacos</span>
                        <TrendingUp size={16} className={totalSacos > 0 ? 'animate-bounce' : ''} />
                    </div>
                    <div className="text-xl md:text-2xl font-black text-blue-900 leading-tight">
                        {totalSacos} <span className="text-xs font-bold text-blue-500 ml-0.5">UNDS</span>
                    </div>
                    <div className="text-[10px] text-blue-600 mt-1 font-bold">
                        C: {totalCuarzo} | L: {totalLlampo}
                    </div>
                </div>

                {/* Molinos Activos */}
                <div className="p-3 md:p-4 bg-indigo-50 border border-indigo-200 rounded-lg group hover:bg-indigo-100 transition-colors">
                    <div className="flex items-center justify-between mb-1 md:mb-2 text-indigo-700">
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-tight">Molinos</span>
                        <CheckCircle size={16} />
                    </div>
                    <div className="text-xl md:text-2xl font-black text-indigo-900 leading-tight">
                        {molinosActivos} <span className="text-xs font-bold text-indigo-500 ml-0.5">ACTIVOS</span>
                    </div>
                    <div className="text-[10px] text-indigo-600 mt-1 font-bold italic uppercase tracking-tighter">En proceso</div>
                </div>

                {/* Tiempo por Molino */}
                <div className="p-3 md:p-4 bg-purple-50 border border-purple-200 rounded-lg group hover:bg-purple-100 transition-colors">
                    <div className="flex items-center justify-between mb-1 md:mb-2 text-purple-700">
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-tight">Tiempo</span>
                        <span className="text-sm md:text-lg">⏱️</span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-purple-900 leading-tight">
                        {tiempoPorMolino > 0 ? formatTiempo(tiempoPorMolino) : '--'}
                    </div>
                    <div className="text-[10px] text-purple-600 mt-1 font-bold truncate uppercase tracking-tighter">
                        {horaInicio && horaFin ? `${horaInicio} - ${horaFin}` : 'SIN HORARIO'}
                    </div>
                </div>

                {/* Stock Restante */}
                <div className={`p-3 md:p-4 rounded-lg border group transition-colors ${hasStockIssues
                    ? 'bg-red-50 border-red-200 hover:bg-red-100'
                    : 'bg-green-50 border-green-200 hover:bg-green-100'
                    }`}>
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                        <span className={`text-[10px] md:text-sm font-black uppercase tracking-tight ${hasStockIssues ? 'text-red-700' : 'text-green-700'
                            }`}>
                            Stock Final
                        </span>
                        {hasStockIssues ? (
                            <AlertTriangle size={16} className="text-red-600 animate-pulse" />
                        ) : (
                            <CheckCircle size={16} className="text-green-600" />
                        )}
                    </div>
                    <div className={`text-xl md:text-2xl font-black leading-tight ${hasStockIssues ? 'text-red-900' : 'text-green-900'
                        }`}>
                        {stockRestante.total} <span className="text-xs font-bold opacity-60 ml-0.5">RESTAN</span>
                    </div>
                    <div className={`text-[10px] mt-1 font-bold ${hasStockIssues ? 'text-red-600' : 'text-green-600'
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
