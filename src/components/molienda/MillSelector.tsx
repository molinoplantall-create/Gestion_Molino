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
    onSeed?: () => void;
    disabled?: boolean;
    loading?: boolean;
}

export const MillSelector: React.FC<MillSelectorProps> = ({
    molinos,
    onMolinoChange,
    onReplicate,
    onSeed,
    disabled = false,
    loading = false
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
                {molinos.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">No se encontraron molinos</h3>
                        <p className="text-sm text-slate-500 mb-6 text-center max-w-md px-4">
                            La base de datos de molinos parece estar vacía. Haga clic en el botón de abajo para inicializar los 4 molinos principales.
                        </p>
                        <button
                            onClick={onSeed}
                            disabled={loading || disabled}
                            className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 disabled:opacity-50"
                        >
                            {loading ? 'Inicializando...' : 'Inicializar Molinos (I, II, III, IV)'}
                        </button>
                    </div>
                ) : molinos.map((molino) => {
                    const isDisabled = disabled || !molino.disponible;
                    const isBusy = !molino.disponible;

                    return (
                        <div
                            key={molino.id}
                            className={`border-2 rounded-xl p-4 transition-all ${molino.activo
                                ? 'border-indigo-500 bg-indigo-100/50 shadow-sm'
                                : isBusy
                                    ? 'border-red-100 bg-red-50/50'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                } ${isDisabled && !isBusy ? 'opacity-60' : ''}`}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center overflow-hidden">
                                    <div
                                        className={`w-10 h-10 min-w-[40px] rounded-xl flex items-center justify-center mr-3 shadow-inner ${molino.activo
                                            ? 'bg-indigo-600 text-white'
                                            : isBusy
                                                ? 'bg-red-500 text-white'
                                                : 'bg-slate-100 text-slate-700'
                                            }`}
                                    >
                                        <span className="font-black text-xs">{molino.nombre.split(' ')[1] || 'M'}</span>
                                    </div>
                                    <div className="truncate">
                                        <div className="font-bold text-slate-900 tracking-tight truncate">{molino.nombre}</div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${isBusy ? 'text-red-600' : 'text-emerald-600'
                                            }`}>
                                            {isBusy ? 'En Mantenimiento/Uso' : 'Libre'}
                                        </div>
                                    </div>
                                </div>

                                {molino.disponible && (
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={molino.activo}
                                            onChange={(e) => onMolinoChange(molino.id, 'activo', e.target.checked)}
                                            disabled={isDisabled}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                )}
                            </div>

                            {/* Busy Mill Info */}
                            {isBusy && (
                                <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded-lg">
                                    <div className="text-[9px] text-red-700 font-black uppercase tracking-widest mb-1">Estado: {molino.estado}</div>
                                    <div className="text-[11px] text-slate-600 leading-snug">
                                        {molino.current_client && (
                                            <div className="font-bold text-slate-800 truncate">S: {molino.current_client}</div>
                                        )}
                                        {molino.current_sacks !== undefined && (
                                            <div className="font-medium">{molino.current_sacks} sacos</div>
                                        )}
                                        {!molino.current_client && !molino.current_sacks && (
                                            <div className="italic opacity-60">No disponible</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Input Fields - Show if available */}
                            {molino.disponible && (
                                <div className="space-y-3 mt-3 pt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Carga Mineral</span>
                                        {onReplicate && molino.activo && molinos.filter(m => m.activo && m.id !== molino.id).length > 0 && (
                                            <button
                                                onClick={() => onReplicate(molino.id)}
                                                className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-black hover:bg-indigo-100 transition-colors border border-indigo-100"
                                            >
                                                REPLICAR
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cuarzo</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={molino.capacidadMaxima}
                                                value={molino.cuarzo}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    onMolinoChange(molino.id, 'cuarzo', val);
                                                    if (val > 0 && !molino.activo) onMolinoChange(molino.id, 'activo', true);
                                                }}
                                                disabled={isDisabled}
                                                className={`w-full px-2 py-1.5 border rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${molino.activo ? 'bg-white border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Llampo</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={molino.capacidadMaxima}
                                                value={molino.llampo}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    onMolinoChange(molino.id, 'llampo', val);
                                                    if (val > 0 && !molino.activo) onMolinoChange(molino.id, 'activo', true);
                                                }}
                                                disabled={isDisabled}
                                                className={`w-full px-2 py-1.5 border rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${molino.activo ? 'bg-white border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    {/* Total and Time */}
                                    <div className="pt-2">
                                        <div className={`flex items-center justify-between p-1.5 rounded-lg mb-2 ${molino.activo ? 'bg-indigo-100/50' : 'bg-slate-50'}`}>
                                            <div className="text-[9px] font-black text-slate-400 uppercase">Carga Total</div>
                                            <div className="text-[13px] font-black text-slate-900">
                                                {molino.total} <span className="text-[9px] font-bold text-slate-400">S.</span>
                                            </div>
                                        </div>

                                        {molino.activo && molino.tiempoEstimado > 0 && (
                                            <div className="space-y-0.5 px-0.5">
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-slate-500 uppercase font-bold tracking-tighter">Tiempo:</span>
                                                    <span className="text-indigo-700 font-black">{formatTiempo(molino.tiempoEstimado)}</span>
                                                </div>
                                                {molino.horaFin && (
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className="text-slate-500 uppercase font-bold tracking-tighter">Fin:</span>
                                                        <span className="text-indigo-700 font-black">{molino.horaFin}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Capacity Warning */}
                                    {molino.total > molino.capacidadMaxima && (
                                        <div className="flex items-center p-1.5 bg-red-50 border border-red-200 rounded-lg">
                                            <AlertCircle size={14} className="text-red-600 mr-2 shrink-0" />
                                            <span className="text-[10px] text-red-700 font-black uppercase">Excede Capacidad</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Inactive State */}
                            {!molino.activo && molino.disponible && (
                                <div className="text-center py-2">
                                    <p className="text-[11px] text-slate-400 font-medium italic">
                                        Inactivo
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
