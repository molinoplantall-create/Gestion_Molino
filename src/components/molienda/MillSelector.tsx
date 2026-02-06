import React from 'react';
import { Factory, CheckCircle, AlertCircle } from 'lucide-react';

interface MolinoProceso {
    id: string;
    nombre: string;
    activo: boolean;
    cuarzo: number;
    llampo: number;
    total: number;
    capacidadMaxima: number;
    disponible: boolean;
    estado: string;
    tiempoEstimado: number;
    horaFin: string | null;
    current_client?: string;
    current_sacks?: number;
}

interface MillSelectorProps {
    molinos: MolinoProceso[];
    onMolinoChange: (molinoId: string, campo: string, valor: any) => void;
    onReplicate?: (sourceMolinoId: string) => void;
    disabled?: boolean;
}

export const MillSelector: React.FC<MillSelectorProps> = ({
    molinos,
    onMolinoChange,
    onReplicate,
    disabled = false
}) => {
    const formatTiempo = (totalMinutos: number): string => {
        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;
        if (horas > 0) {
            return `${horas}h ${minutos}min`;
        }
        return `${minutos}min`;
    };

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center">
                        <Factory size={20} strokeWidth={1.5} className="mr-2 text-indigo-600" />
                        Configuración de Molinos
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Configure la carga individual para cada molino activo (I, II, III, IV)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {molinos.map((molino) => {
                    const isDisabled = disabled || !molino.disponible;
                    const isBusy = !molino.disponible;

                    return (
                        <div
                            key={molino.id}
                            className={`border-2 rounded-xl p-4 transition-all ${molino.activo
                                ? 'border-indigo-500 bg-indigo-50'
                                : isBusy
                                    ? 'border-red-200 bg-red-50'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                } ${isDisabled ? 'opacity-60' : ''}`}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 shadow-inner ${molino.activo
                                            ? 'bg-indigo-600 text-white'
                                            : isBusy
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-slate-100 text-slate-700'
                                            }`}
                                    >
                                        <span className="font-black text-xs">{molino.nombre.toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 tracking-tight">{molino.nombre}</div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${isBusy ? 'text-red-600' : 'text-emerald-600'
                                            }`}>
                                            {isBusy ? 'Ocupado' : 'Disponible'}
                                        </div>
                                    </div>
                                </div>

                                {molino.disponible && (
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={molino.activo}
                                            onChange={(e) => onMolinoChange(molino.id, 'activo', e.target.checked)}
                                            disabled={isDisabled}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                )}
                            </div>

                            {/* Busy Mill Info */}
                            {isBusy && (
                                <div className="mb-3 p-3 bg-red-50/50 border border-red-100 rounded-xl">
                                    <div className="text-[10px] text-red-700 font-bold uppercase tracking-widest mb-1">En proceso</div>
                                    <div className="text-xs text-slate-600">
                                        <div className="font-bold text-slate-900 truncate">{molino.current_client || 'N/A'}</div>
                                        <div>{molino.current_sacks || 0} sacos</div>
                                    </div>
                                </div>
                            )}

                            {/* Input Fields - Only show if active */}
                            {molino.activo && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Carga Manual</span>
                                        {onReplicate && molinos.filter(m => m.activo && m.id !== molino.id).length > 0 && (
                                            <button
                                                onClick={() => onReplicate(molino.id)}
                                                className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-bold hover:bg-indigo-100 transition-colors border border-indigo-100"
                                                title="Copiar esta carga a todos los molinos activos"
                                            >
                                                REPLICAR TODOS
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                                Cuarzo
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={molino.capacidadMaxima}
                                                value={molino.cuarzo}
                                                onChange={(e) => onMolinoChange(molino.id, 'cuarzo', parseInt(e.target.value) || 0)}
                                                disabled={isDisabled}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
                                                placeholder="0"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                                Llampo
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={molino.capacidadMaxima}
                                                value={molino.llampo}
                                                onChange={(e) => onMolinoChange(molino.id, 'llampo', parseInt(e.target.value) || 0)}
                                                disabled={isDisabled}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    {/* Total and Time */}
                                    <div className="pt-3 border-t border-slate-200">
                                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg mb-3">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Carga Total</div>
                                            <div className="text-sm font-black text-slate-900">
                                                {molino.total} <span className="text-[10px] font-bold text-slate-400">SACOS</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-[11px] mb-2 px-1">
                                            <span className="text-slate-500 font-medium">Capacidad Máx:</span>
                                            <span className="text-slate-700 font-bold">{molino.capacidadMaxima}</span>
                                        </div>
                                        {molino.tiempoEstimado > 0 && (
                                            <>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-slate-600">Tiempo:</span>
                                                    <span className="text-indigo-700 font-medium">
                                                        {formatTiempo(molino.tiempoEstimado)}
                                                    </span>
                                                </div>
                                                {molino.horaFin && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-600">Hora fin:</span>
                                                        <span className="text-indigo-700 font-medium">{molino.horaFin}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Capacity Warning */}
                                    {molino.total > molino.capacidadMaxima && (
                                        <div className="flex items-center p-2 bg-red-50 border border-red-200 rounded-lg">
                                            <AlertCircle size={16} className="text-red-600 mr-2" />
                                            <span className="text-xs text-red-700 font-medium">
                                                Excede capacidad
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Inactive State */}
                            {!molino.activo && molino.disponible && (
                                <div className="text-center py-4">
                                    <p className="text-sm text-slate-500">
                                        Active el molino para configurar
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <CheckCircle size={18} className="text-green-600 mr-2" />
                        <span className="text-sm font-medium text-slate-700">
                            Molinos activos: {molinos.filter(m => m.activo).length} de {molinos.length}
                        </span>
                    </div>
                    <div className="text-sm text-slate-600">
                        Disponibles: {molinos.filter(m => m.disponible).length}
                    </div>
                </div>
            </div>
        </div>
    );
};
