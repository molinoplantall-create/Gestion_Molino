import React, { useMemo, useState, useEffect } from 'react';
import { Clock, CheckCircle, Calendar, DollarSign, Gauge, Wrench, ShieldCheck, X, AlertOctagon, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface KpiIndicatorsProps {
    maintenanceLogs: any[];
    mills: any[];
}

type PeriodOption = '30' | '60' | '90' | '365';
type TipoKey = 'PREVENTIVO' | 'CORRECTIVO' | 'PREDICTIVO' | 'EMERGENCIA';

const PERIOD_LABELS: Record<PeriodOption, string> = {
    '30': 'Últimos 30 días',
    '60': 'Últimos 60 días',
    '90': 'Últimos 90 días',
    '365': 'Último año'
};

const TIPO_LABELS: Record<TipoKey, string> = {
    PREVENTIVO: 'Preventivo',
    CORRECTIVO: 'Correctivo',
    PREDICTIVO: 'Predictivo',
    EMERGENCIA: 'Emergencia'
};

const TIPO_COLORS: Record<TipoKey, string> = {
    PREVENTIVO: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    CORRECTIVO: 'bg-red-50 text-red-700 hover:bg-red-100',
    PREDICTIVO: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
    EMERGENCIA: 'bg-orange-50 text-orange-700 hover:bg-orange-100'
};

async function fetchMillingHoursPerMill(periodStart: Date): Promise<Record<string, number>> {
    const hoursMap: Record<string, number> = {};
    try {
        const { data: millingLogs, error } = await supabase
            .from('milling_logs')
            .select('mills_used, mineral_type, total_sacks, created_at, status')
            .gte('created_at', periodStart.toISOString());

        if (error || !millingLogs) return hoursMap;

        millingLogs.forEach((log: any) => {
            const millsUsed = log.mills_used || [];
            const mineralType = (log.mineral_type || '').toUpperCase();
            let sessionHours = mineralType === 'SULFURO' ? 2.25 : 1.67;
            millsUsed.forEach((m: any) => {
                const millId = m.id || m.mill_id;
                if (millId) hoursMap[millId] = (hoursMap[millId] || 0) + sessionHours;
            });
        });
    } catch (e) {
        console.error('Error in fetchMillingHoursPerMill:', e);
    }
    return hoursMap;
}

function getTipo(log: any): TipoKey {
    const t = (log.type || log.tipo || '').toUpperCase();
    if (t === 'CORRECTIVO' || t === 'PREDICTIVO' || t === 'EMERGENCIA') return t as TipoKey;
    return 'PREVENTIVO';
}

function getEstado(log: any): string {
    return (log.status || log.estado || '').toUpperCase();
}

function calculateKPIs(logs: any[], mills: any[], periodDays: number, millingHoursMap: Record<string, number>, nowTick: number) {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // FIX: el conteo por tipo ya NO exige que esté 'COMPLETADO' — una falla
    // cuenta como falla desde que se reporta, esté o no resuelta todavía.
    // Esto es justo lo que antes generaba números distintos entre esta
    // tabla y "¿Qué Molino Falla Más?": criterios de conteo distintos.
    const allPeriodLogs = logs.filter(log => new Date(log.created_at) >= periodStart);

    // Solo para calcular horas de reparación (MTTR) sí hace falta que esté
    // completado, porque recién ahí se sabe cuánto tardó en arreglarse.
    const completedCorrective = allPeriodLogs.filter(log =>
        (getTipo(log) === 'CORRECTIVO' || getTipo(log) === 'EMERGENCIA') && getEstado(log) === 'COMPLETADO'
    );

    // Fallas TODAVÍA ABIERTAS (en curso) — para el aviso de tiempo en vivo
    const openFailures = allPeriodLogs.filter(log =>
        (getTipo(log) === 'CORRECTIVO' || getTipo(log) === 'EMERGENCIA') && getEstado(log) !== 'COMPLETADO'
    );

    const millKPIs = mills.map(mill => {
        const millLogs = allPeriodLogs.filter(log => (log.mill_id || log.molino_id) === mill.id);
        const byTipo: Record<TipoKey, any[]> = { PREVENTIVO: [], CORRECTIVO: [], PREDICTIVO: [], EMERGENCIA: [] };
        millLogs.forEach(log => byTipo[getTipo(log)].push(log));

        const millCorrective = completedCorrective.filter(log => (log.mill_id || log.molino_id) === mill.id);
        const failureCount = byTipo.CORRECTIVO.length + byTipo.EMERGENCIA.length;

        let totalRepairHours = 0;
        millCorrective.forEach(log => {
            if (log.failure_start_time && log.completed_at) {
                totalRepairHours += (new Date(log.completed_at).getTime() - new Date(log.failure_start_time).getTime()) / (1000 * 3600);
            } else if (log.worked_hours) {
                totalRepairHours += Number(log.worked_hours);
            }
        });

        const operativeHours = millingHoursMap[mill.id] || 0;
        const mtbf = millCorrective.length > 0 && operativeHours > 0 ? operativeHours / millCorrective.length : null;
        const mttr = millCorrective.length > 0 ? totalRepairHours / millCorrective.length : null;
        const availability = millCorrective.length > 0 && mtbf !== null && mttr !== null ? (mtbf / (mtbf + mttr)) * 100 : 100;

        // Falla actualmente en curso en este molino (si hay) — tiempo en VIVO
        const ongoing = openFailures.find(log => (log.mill_id || log.molino_id) === mill.id && log.failure_start_time);
        let ongoingHours: number | null = null;
        if (ongoing) {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            nowTick; // fuerza recálculo cada vez que el tick cambia (tiempo real)
            ongoingHours = (Date.now() - new Date(ongoing.failure_start_time).getTime()) / (1000 * 3600);
        }

        return {
            id: mill.id,
            name: mill.name || `M-${mill.id.substring(0, 4)}`,
            byTipo,
            failureCount,
            totalRepairHours: Math.round(totalRepairHours),
            mtbf: mtbf !== null ? Math.round(mtbf) : null,
            mttr: mttr !== null ? Math.round(mttr) : null,
            availability: Math.round(availability * 10) / 10,
            ongoing: ongoing ? { hours: ongoingHours, since: ongoing.failure_start_time, description: ongoing.description } : null
        };
    });

    const globalAvailability = millKPIs.length > 0 ? millKPIs.reduce((sum, m) => sum + m.availability, 0) / millKPIs.length : 100;

    return {
        mills: millKPIs.sort((a, b) => b.failureCount - a.failureCount),
        global: {
            availability: Math.round(globalAvailability * 10) / 10,
            totalFailures: completedCorrective.length + openFailures.length,
            totalPreventive: allPeriodLogs.filter(l => getTipo(l) === 'PREVENTIVO').length,
            totalRepairHours: Math.round(millKPIs.reduce((sum, m) => sum + m.totalRepairHours, 0)),
            totalCostPen: allPeriodLogs.reduce((sum, l) => sum + (l.cost_pen || 0) + (l.labor_cost_pen || 0), 0),
            totalCostUsd: allPeriodLogs.reduce((sum, l) => sum + (l.cost_usd || 0) + (l.labor_cost_usd || 0), 0)
        }
    };
}

function getAvailabilityColor(value: number) { return value >= 95 ? 'text-emerald-600' : value >= 85 ? 'text-amber-500' : 'text-red-600'; }
function getAvailabilityBg(value: number) { return value >= 95 ? 'bg-emerald-50' : value >= 85 ? 'bg-amber-50' : 'bg-red-50'; }

function formatFecha(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const KpiIndicators: React.FC<KpiIndicatorsProps> = ({ maintenanceLogs, mills }) => {
    const [period, setPeriod] = useState<PeriodOption>('90');
    const [millingHoursMap, setMillingHoursMap] = useState<Record<string, number>>({});
    const [detailModal, setDetailModal] = useState<{ millName: string; tipo: TipoKey; logs: any[] } | null>(null);

    // Tick cada minuto para que el tiempo de reparación en curso se vea "en vivo"
    const [nowTick, setNowTick] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNowTick(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const periodStart = new Date(Date.now() - parseInt(period) * 24 * 3600 * 1000);
        fetchMillingHoursPerMill(periodStart).then(setMillingHoursMap);
    }, [period, maintenanceLogs.length]);

    const kpis = useMemo(() => calculateKPIs(maintenanceLogs, mills, parseInt(period), millingHoursMap, nowTick), [maintenanceLogs, mills, period, millingHoursMap, nowTick]);
    const noData = maintenanceLogs.length === 0;
    const ongoingList = kpis.mills.filter(m => m.ongoing);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Gauge size={20} className="text-indigo-600" />
                        Rendimiento y Costos
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">Qué tan bien están funcionando tus molinos y cuánto ha costado mantenerlos</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodOption)} className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500">
                        {Object.entries(PERIOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
            </div>

            {/* Aviso en vivo: molinos con una falla todavía sin resolver */}
            {ongoingList.length > 0 && (
                <div className="space-y-2">
                    {ongoingList.map(m => (
                        <div key={m.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3">
                            <AlertOctagon className="text-red-500 shrink-0 animate-pulse" size={20} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-red-800">{m.name} sigue en reparación</p>
                                <p className="text-xs text-red-600 font-medium truncate">{m.ongoing?.description || 'Sin descripción'} — desde el {m.ongoing?.since ? formatFecha(m.ongoing.since) : ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-lg font-black text-red-700">{m.ongoing?.hours !== null ? Math.floor(m.ongoing!.hours!) : 0}h</p>
                                <p className="text-[10px] font-bold text-red-400 uppercase">y contando</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tarjetas simples, en lenguaje llano */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-emerald-50 rounded-xl"><DollarSign className="text-emerald-600" size={18} /></div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Gasto en Mantenimiento</p>
                    </div>
                    <p className="text-xl font-black text-slate-900">S/ {kpis.global.totalCostPen.toLocaleString('es-PE')}</p>
                    {kpis.global.totalCostUsd > 0 && <p className="text-sm font-bold text-slate-400 mt-0.5">$ {kpis.global.totalCostUsd.toLocaleString('es-PE')}</p>}
                    <p className="text-[11px] text-slate-400 mt-1">Materiales + mano de obra, {PERIOD_LABELS[period].toLowerCase()}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-red-50 rounded-xl"><Wrench className="text-red-600" size={18} /></div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Fallas (Correctivo + Emergencia)</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{kpis.global.totalFailures}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{kpis.global.totalRepairHours}h reparando en total</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-blue-50 rounded-xl"><ShieldCheck className="text-blue-600" size={18} /></div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Mantenimientos Preventivos</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{kpis.global.totalPreventive}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Hechos antes de que fallara algo</p>
                </div>

                <div className={`rounded-2xl p-5 border shadow-sm ${getAvailabilityBg(kpis.global.availability)} border-current/10`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-white/60 rounded-xl"><Clock className={getAvailabilityColor(kpis.global.availability)} size={18} /></div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Disponibilidad</p>
                    </div>
                    <p className={`text-2xl font-black ${getAvailabilityColor(kpis.global.availability)}`}>{kpis.global.availability}%</p>
                    <p className="text-[11px] text-slate-500 mt-1">% del tiempo que estuvieron funcionando bien</p>
                </div>
            </div>

            {/* Tabla comparativa con desglose por tipo, cada número es clicable */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="mb-5">
                    <h4 className="text-base font-black text-slate-900">Comparación entre Molinos</h4>
                    <p className="text-xs text-slate-400 mt-1">De mayor a menor cantidad de fallas · Haz clic en cualquier número para ver el detalle</p>
                </div>
                {noData ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-300">
                        <CheckCircle size={40} className="mb-3 text-emerald-200" />
                        <p className="font-bold text-slate-400">Sin datos en este periodo</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wide border-b border-slate-100">
                                    <th className="py-2 px-2">Molino</th>
                                    <th className="py-2 px-2 text-center">Preventivo</th>
                                    <th className="py-2 px-2 text-center">Correctivo</th>
                                    <th className="py-2 px-2 text-center">Predictivo</th>
                                    <th className="py-2 px-2 text-center">Emergencia</th>
                                    <th className="py-2 px-2 text-center">Tiempo Prom. de Reparación</th>
                                    <th className="py-2 px-2 text-center">Disponibilidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kpis.mills.map(mill => (
                                    <tr key={mill.id} className="border-b border-slate-50 last:border-0">
                                        <td className="py-3 px-2 font-bold text-slate-800">
                                            {mill.name}
                                            {mill.ongoing && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Falla en curso" />}
                                        </td>
                                        {(['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'EMERGENCIA'] as TipoKey[]).map(tipo => {
                                            const count = mill.byTipo[tipo].length;
                                            return (
                                                <td key={tipo} className="py-3 px-2 text-center">
                                                    <button
                                                        onClick={() => count > 0 && setDetailModal({ millName: mill.name, tipo, logs: mill.byTipo[tipo] })}
                                                        disabled={count === 0}
                                                        className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-1 rounded-lg font-black text-xs transition-colors ${count > 0 ? TIPO_COLORS[tipo] + ' cursor-pointer' : 'bg-slate-50 text-slate-300 cursor-default'}`}
                                                    >
                                                        {count}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                        <td className="py-3 px-2 text-center text-slate-600 font-medium">{mill.mttr !== null ? `${mill.mttr}h por falla` : '—'}</td>
                                        <td className="py-3 px-2 text-center">
                                            <span className={`font-black ${getAvailabilityColor(mill.availability)}`}>{mill.availability}%</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <p className="text-[11px] text-slate-400 mt-4 bg-slate-50 rounded-lg p-3">
                    <strong>Cómo leerlo:</strong> más Correctivo/Emergencia y menos disponibilidad significa que ese molino necesita más atención.
                    Un número en un círculo de color se puede tocar para ver el detalle de esos registros.
                </p>
            </div>

            {/* Modal de detalle al hacer clic en un número */}
            {detailModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailModal(null)}>
                    <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div>
                                <h4 className="font-black text-slate-900">{detailModal.millName} — {TIPO_LABELS[detailModal.tipo]}</h4>
                                <p className="text-xs text-slate-400 font-medium">{detailModal.logs.length} registro{detailModal.logs.length !== 1 ? 's' : ''} en este periodo</p>
                            </div>
                            <button onClick={() => setDetailModal(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X size={18} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-5 space-y-3">
                            {detailModal.logs
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .map((log, idx) => (
                                <div key={idx} className="bg-slate-50 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-black text-slate-500">{formatFecha(log.created_at)}</span>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getEstado(log) === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {getEstado(log) === 'COMPLETADO' ? 'Completado' : 'En curso'}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">{log.description || 'Sin descripción'}</p>
                                    {log.technician_name && (
                                        <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                                            <User size={11} /> {log.technician_name}
                                        </p>
                                    )}
                                    {log.worked_hours > 0 && <p className="text-xs text-slate-400 font-medium mt-0.5">{log.worked_hours}h trabajadas</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
