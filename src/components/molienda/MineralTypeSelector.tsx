import React from 'react';
import { Clock } from 'lucide-react';

interface TiemposProceso {
    oxido: {
        hora40: boolean;
        hora00: boolean;
    };
    sulfuro: {
        hora00: boolean;
        hora30: boolean;
    };
}

interface MineralTypeSelectorProps {
    mineralType: 'OXIDO' | 'SULFURO' | '';
    onMineralChange: (type: 'OXIDO' | 'SULFURO') => void;
    tiempos: TiemposProceso;
    onTiempoChange: (mineral: string, opcion: string, checked: boolean) => void;
    disabled?: boolean;
}

export const MineralTypeSelector: React.FC<MineralTypeSelectorProps> = ({
    mineralType,
    onMineralChange,
    tiempos,
    onTiempoChange,
    disabled = false
}) => {
    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
                <Clock size={20} strokeWidth={1.5} className="mr-2 text-indigo-600" />
                Tipo de Mineral y Tiempo de Proceso
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo de Mineral */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Tipo de Mineral</label>
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <button
                            type="button"
                            onClick={() => onMineralChange('OXIDO')}
                            disabled={disabled}
                            className={`px-2 py-3 md:px-4 md:py-3 rounded-lg border-2 font-medium transition-all ${mineralType === 'OXIDO'
                                ? 'bg-amber-50 border-amber-500 text-amber-900'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300'
                                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <div className="text-center">
                                <div className="text-base md:text-lg">🟡</div>
                                <div className="text-[11px] md:text-sm font-bold">ÓXIDO</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => onMineralChange('SULFURO')}
                            disabled={disabled}
                            className={`px-2 py-3 md:px-4 md:py-3 rounded-lg border-2 font-medium transition-all ${mineralType === 'SULFURO'
                                ? 'bg-slate-700 border-slate-900 text-white'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <div className="text-center">
                                <div className="text-base md:text-lg">⚫</div>
                                <div className="text-[11px] md:text-sm font-bold">SULFURO</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Tiempo de Proceso */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                        Tiempo de Proceso
                    </label>

                    {mineralType === 'OXIDO' && (
                        <div className="space-y-2 md:space-y-3">
                            <label className="flex items-center p-2 md:p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={tiempos.oxido.hora40}
                                    onChange={(e) => onTiempoChange('OXIDO', 'hora40', e.target.checked)}
                                    disabled={disabled}
                                    className="w-4 h-4 md:w-5 md:h-5 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="ml-2 md:ml-3 text-[11px] md:text-sm font-medium text-amber-900 leading-tight">
                                    1 hora 40 min (<span className="hidden sm:inline">100 min</span>)
                                </span>
                            </label>

                            <label className="flex items-center p-2 md:p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={tiempos.oxido.hora00}
                                    onChange={(e) => onTiempoChange('OXIDO', 'hora00', e.target.checked)}
                                    disabled={disabled}
                                    className="w-4 h-4 md:w-5 md:h-5 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="ml-2 md:ml-3 text-[11px] md:text-sm font-medium text-amber-900 leading-tight">
                                    1 hora (<span className="hidden sm:inline">60 min</span>)
                                </span>
                            </label>
                        </div>
                    )}

                    {mineralType === 'SULFURO' && (
                        <div className="space-y-2 md:space-y-3">
                            <label className="flex items-center p-2 md:p-3 bg-slate-100 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={tiempos.sulfuro.hora00}
                                    onChange={(e) => onTiempoChange('SULFURO', 'hora00', e.target.checked)}
                                    disabled={disabled}
                                    className="w-4 h-4 md:w-5 md:h-5 text-slate-700 rounded focus:ring-2 focus:ring-slate-500"
                                />
                                <span className="ml-2 md:ml-3 text-[11px] md:text-sm font-medium text-slate-900 leading-tight">
                                    2 horas (<span className="hidden sm:inline">120 min</span>)
                                </span>
                            </label>

                            <label className="flex items-center p-2 md:p-3 bg-slate-100 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={tiempos.sulfuro.hora30}
                                    onChange={(e) => onTiempoChange('SULFURO', 'hora30', e.target.checked)}
                                    disabled={disabled}
                                    className="w-4 h-4 md:w-5 md:h-5 text-slate-700 rounded focus:ring-2 focus:ring-slate-500"
                                />
                                <span className="ml-2 md:ml-3 text-[11px] md:text-sm font-medium text-slate-900 leading-tight">
                                    2 h 30 min (<span className="hidden sm:inline">150 min</span>)
                                </span>
                            </label>
                        </div>
                    )}

                    {!mineralType && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-xs text-slate-500 text-center italic">
                                Seleccione mineral para ver opciones de tiempo
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
