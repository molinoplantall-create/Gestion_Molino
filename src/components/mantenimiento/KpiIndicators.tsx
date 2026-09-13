import React, { useMemo, useState, useEffect } from 'react';
import { Clock, CheckCircle, Calendar, DollarSign, Gauge, Wrench, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface KpiIndicatorsProps {
    maintenanceLogs: any[];
    mills: any[];
}

type PeriodOption = '30' | '60' | '90' | '365';

const PERIOD_LABELS: Record<PeriodOption, string> = {
    '30': 'Últimos 30 días',
    '60': 'Últimos 60 días',
    '90': 'Últimos 90 días',
    '365': 'Último año'
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

function calculateKPIs(logs: any[], mills: any[], periodDays: number, millingHoursMap: Record<string, number>) {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const allPeriodLogs = logs.filter(log => new Date(log.created_at) >= periodStart);
    const correctiveLogs = allPeriodLogs.filter(log => (log.type || log.tipo || '').toUpperCase() === 'CORRECTIVO' && (log.status || log.estado || '').toUpperCase() === 'COMPLETADO');

    const millKPIs = mills.map(mill => {
        const millCorrective = correctiveLogs.filter(log => (log.mill_id || log.molino_id) === mill.id);
        const failureCount = millCorrective.length;
        let totalRepairHours = 0;
        millCorrective.forEach(log => {
            if (log.failure_start_time && log.completed_at) {
                totalRepairHours += (new Date(log.completed_at).getTime() - new Date(log.failure_start_time).getTime()) / (1000 * 3600);
            } else if (log.worked_hours) {
                totalRepairHours += Number(log.worked_hours);
            }
        });

        const operativeHours = millingHoursMap[mill.id] || 0;
        const mtbf = failureCount > 0 && operativeHours > 0 ? operativeHours / failureCount : null;
        const mttr = failureCount > 0 ? totalRepairHours / failureCount : null;
        const availability = failureCount > 0 && mtbf !== null && mttr !== null ? (mtbf / (mtbf + mttr)) * 100 : 100;

        return {
            id: mill.id,
            name: mill.name || `M-${mill.id.substring(0, 4)}`,
            failureCount,
            preventiveCount: allPeriodLogs.filter(log => (log.mill_id || log.molino_id) === mill.id && (log.type || log.tipo || '').toUpperCase() === 'PREVENTIVO').length,
            totalRepairHours: Math.round(totalRepairHours),
            operativeHours: Math.round(operativeHours),
            mtbf: mtbf !== null ? Math.round(mtbf) : null,
            mttr: mttr !== null ? Math.round(mttr) : null,
            availability: Math.round(availability * 10) / 10
        };
    });

    const millsWithFailures = millKPIs.filter(m => m.failureCount > 0);
    const globalAvailability = millKPIs.length > 0 ? millKPIs.reduce((sum, m) => sum + m.availability, 0) / millKPIs.length : 100;

    return {
        mills: millKPIs.sort((a, b) => b.failureCount - a.failureCount),
        global: {
            availability: Math.round(globalAvailability * 10) / 10,
            totalFailures: correctiveLogs.length,
            totalPreventive: allPeriodLogs.filter(l => (l.type || l.tipo || '').toUpperCase() === 'PREVENTIVO').length,
            totalRepairHours: Math.round(millKPIs.reduce((sum, m) => sum + m.totalRepairHours, 0)),
            totalOperativeHours: Math.round(millKPIs.reduce((sum, m) => sum + m.operativeHours, 0)),
            totalCostPen: allPeriodLogs.reduce((sum, l) => sum + (l.cost_pen || 0) + (l.labor_cost_pen || 0), 0),
            totalCostUsd: allPeriodLogs.reduce((sum, l) => sum + (l.cost_usd || 0) + (l.labor_cost_usd || 0), 0)
        }
    };
}

function getAvailabilityColor(value: number) { return value >= 95 ? 'text-emerald-600' : value >= 85 ? 'text-amber-500' : 'text-red-600'; }
function getAvailabilityBg(value: number) { return value >= 95 ? 'bg-emerald-50' : value >= 85 ? 'bg-amber-50' : 'bg-red-50'; }

export const KpiIndicators: React.FC<KpiIndicatorsProps> = ({ maintenanceLogs, mills }) => {
    const [period, setPeriod] = useState<PeriodOption>('90');
    const [millingHoursMap, setMillingHoursMap] = useState<Record<string, number>>({});

    useEffect(() => {
        const periodStart = new Date(Date.now() - parseInt(period) * 24 * 3600 * 1000);
        fetchMillingHoursPerMill(periodStart).then(setMillingHoursMap);
    }, [period, maintenanceLogs.length]);

    const kpis = useMemo(() => calculateKPIs(maintenanceLogs, mills, parseInt(period), millingHoursMap), [maintenanceLogs, mills, period, millingHoursMap]);
    const noFailures = kpis.global.totalFailures === 0;

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

            {/* Tarjetas simples, en lenguaje llano */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-emerald-50 rounded-xl"><DollarSign className="text-emerald-600" size={18} /></div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Gasto en Mantenimiento</p>
                    </div>
                    <p className="text-xl font-black text-slate-900">S/ {kpis.global.totalCostPen.toLocaleString()}</p>
                    {kpis.global.totalCostUsd > 0 && <p className="text-sm font-bold text-slate-400 mt-0.5">$ {kpis.global.totalCostUsd.toLocaleString()}</p>}
                    <p className="text-[11px] text-slate-400 mt-1">Materiales + mano de obra, {PERIOD_LABELS[period].toLowerCase()}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-red-50 rounded-xl"><Wrench className="text-red-600" size={18} /></div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Fallas (Correctivo)</p>
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

            {/* Tabla comparativa, clara y fácil de leer */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="mb-5">
                    <h4 className="text-base font-black text-slate-900">Comparación entre Molinos</h4>
                    <p className="text-xs text-slate-400 mt-1">De mayor a menor cantidad de fallas, en el periodo seleccionado</p>
                </div>
                {noFailures ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-300">
                        <CheckCircle size={40} className="mb-3 text-emerald-200" />
                        <p className="font-bold text-slate-400">Sin fallas en este periodo</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wide border-b border-slate-100">
                                    <th className="py-2 px-2">Molino</th>
                                    <th className="py-2 px-2 text-center">N° Fallas</th>
                                    <th className="py-2 px-2 text-center">N° Preventivos</th>
                                    <th className="py-2 px-2 text-center">Horas Reparando</th>
                                    <th className="py-2 px-2 text-center">Tiempo Prom. de Reparación</th>
                                    <th className="py-2 px-2 text-center">Disponibilidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kpis.mills.map(mill => (
                                    <tr key={mill.id} className="border-b border-slate-50 last:border-0">
                                        <td className="py-3 px-2 font-bold text-slate-800">{mill.name}</td>
                                        <td className="py-3 px-2 text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-1 rounded-lg font-black text-xs ${mill.failureCount > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-400'}`}>
                                                {mill.failureCount}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-center text-slate-600 font-medium">{mill.preventiveCount}</td>
                                        <td className="py-3 px-2 text-center text-slate-600 font-medium">{mill.totalRepairHours}h</td>
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
                    <strong>Cómo leerlo:</strong> más fallas y menos disponibilidad significa que ese molino necesita más atención.
                    "Tiempo Prom. de Reparación" es cuánto tarda en promedio en arreglarse cada vez que falla — mientras más bajo, mejor.
                </p>
            </div>
        </div>
    );
};
