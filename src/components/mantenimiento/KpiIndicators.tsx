import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend
} from 'recharts';
import { Activity, Clock, CheckCircle, TrendingUp, Calendar, Gauge, Timer, DollarSign, Info } from 'lucide-react';
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

const BAR_COLORS = {
    mtbf: '#6366f1',  // indigo
    mttr: '#f59e0b',  // amber
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
            name: mill.name || `M-${mill.id.substring(0,4)}`,
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
    const globalAvailability = millsWithFailures.length > 0 ? millKPIs.reduce((sum, m) => sum + m.availability, 0) / millKPIs.length : 100;

    return {
        mills: millKPIs,
        global: {
            mtbf: millsWithFailures.length > 0 ? Math.round(millKPIs.reduce((sum, m) => sum + (m.mtbf || 0), 0) / millsWithFailures.length) : null,
            mttr: millsWithFailures.length > 0 ? Math.round(millKPIs.reduce((sum, m) => sum + (m.mttr || 0), 0) / millsWithFailures.length) : null,
            availability: Math.round(globalAvailability * 10) / 10,
            totalFailures: correctiveLogs.length,
            totalPreventive: allPeriodLogs.filter(l => (l.type || l.tipo || '').toUpperCase() === 'PREVENTIVO').length,
            totalRepairHours: Math.round(millKPIs.reduce((sum, m) => sum + m.totalRepairHours, 0)),
            totalOperativeHours: Math.round(millKPIs.reduce((sum, m) => sum + m.operativeHours, 0)),
            totalCostPen: allPeriodLogs.reduce((sum, l) => sum + (l.cost_pen || 0), 0),
            totalCostUsd: allPeriodLogs.reduce((sum, l) => sum + (l.cost_usd || 0), 0)
        }
    };
}

function getAvailabilityColor(value: number) { return value >= 95 ? 'text-emerald-600' : value >= 85 ? 'text-amber-500' : 'text-red-600'; }
function getAvailabilityBg(value: number) { return value >= 95 ? 'bg-emerald-100' : value >= 85 ? 'bg-amber-100' : 'bg-red-100'; }
function getAvailabilityBarBgColor(value: number) { return value >= 95 ? '#10b981' : value >= 85 ? '#f59e0b' : '#ef4444'; }

export const KpiIndicators: React.FC<KpiIndicatorsProps> = ({ maintenanceLogs, mills }) => {
    const [period, setPeriod] = useState<PeriodOption>('90');
    const [millingHoursMap, setMillingHoursMap] = useState<Record<string, number>>({});

    useEffect(() => {
        const periodStart = new Date(Date.now() - parseInt(period) * 24 * 3600 * 1000);
        fetchMillingHoursPerMill(periodStart).then(setMillingHoursMap);
    }, [period, maintenanceLogs.length]);

    const kpis = useMemo(() => calculateKPIs(maintenanceLogs, mills, parseInt(period), millingHoursMap), [maintenanceLogs, mills, period, millingHoursMap]);
    const chartData = useMemo(() => kpis.mills.map(m => ({ name: m.name, MTBF: m.mtbf || 0, MTTR: m.mttr || 0, 'Hrs Operativas': m.operativeHours })), [kpis]);
    const noFailures = kpis.global.totalFailures === 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                        <Activity size={20} className="mr-2 text-indigo-600" />
                        Indicadores KPIs
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">Gestión de confiabilidad y disponibilidad en tiempo real</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodOption)} className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500">
                        {Object.entries(PERIOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Costo */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-emerald-100 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-emerald-100/50 rounded-xl mr-3"><DollarSign className="text-emerald-600" size={20} /></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Inversión</p><p className="text-[10px] text-slate-400 mt-1">Gasto Periodo</p></div>
                    </div>
                    <p className="text-xl font-black text-slate-900">S/ {kpis.global.totalCostPen.toLocaleString()}</p>
                    <p className="text-xs font-bold text-blue-500/80 mt-1">$ {kpis.global.totalCostUsd.toLocaleString()}</p>
                </div>

                {/* MTBF */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-indigo-100 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-indigo-100/50 rounded-xl mr-3"><TrendingUp className="text-indigo-600" size={20} /></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">MTBF</p><p className="text-[10px] text-slate-400 mt-1">T. Medio Fallas</p></div>
                    </div>
                    <div className="flex items-center gap-1">
                        <p className="text-2xl font-black text-slate-900">{kpis.global.mtbf || '∞'}<span className="text-xs ml-1">h</span></p>
                        <div className="group relative">
                            <Info size={12} className="text-slate-300 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                <strong>MTBF (Confiabilidad):</strong> Tiempo promedio que el equipo opera sin fallas. Cuanto más alto, mejor.
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">{kpis.global.totalFailures} incidentes</p>
                </div>

                {/* MTTR */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-amber-100 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-amber-100/50 rounded-xl mr-3"><Clock className="text-amber-600" size={20} /></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">MTTR</p><p className="text-[10px] text-slate-400 mt-1">T. Reparación</p></div>
                    </div>
                    <div className="flex items-center gap-1">
                        <p className="text-2xl font-black text-slate-900">{kpis.global.mttr || '0'}<span className="text-xs ml-1">h</span></p>
                        <div className="group relative">
                            <Info size={12} className="text-slate-300 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                <strong>MTTR (Mantenibilidad):</strong> Tiempo promedio de reparación. Cuanto más bajo, más rápido se recupera el equipo.
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-amber-500 font-bold uppercase mt-1">{kpis.global.totalRepairHours}h downtime</p>
                </div>

                {/* Disponibilidad */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center mb-4">
                        <div className={`p-3 ${getAvailabilityBg(kpis.global.availability)} rounded-xl mr-3`}><Gauge className={getAvailabilityColor(kpis.global.availability)} size={20} /></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Disponibilidad</p><p className="text-[10px] text-slate-400 mt-1">Ratio Operativo</p></div>
                    </div>
                    <p className={`text-3xl font-black ${getAvailabilityColor(kpis.global.availability)}`}>{kpis.global.availability}%</p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full transition-all duration-1000" style={{ width: `${kpis.global.availability}%`, backgroundColor: getAvailabilityBarBgColor(kpis.global.availability) }}></div>
                    </div>
                </div>

                {/* Utilización */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-violet-100 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-violet-100/50 rounded-xl mr-3"><Timer className="text-violet-600" size={20} /></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Utilización</p><p className="text-[10px] text-slate-400 mt-1">Horas Reales</p></div>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{kpis.global.totalOperativeHours}<span className="text-xs ml-1">h</span></p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{kpis.global.totalPreventive} Preventivos</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="mb-6"><h4 className="text-base font-black text-slate-900">Comparativa por Activo</h4><p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">Métricas de rendimiento por molino</p></div>
                {noFailures ? (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-300"><CheckCircle size={48} className="mb-4 text-emerald-200" /><p className="font-bold">Sin fallas en periodo</p></div>
                ) : (
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }} 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }} 
                                    formatter={(value: any, name: string) => {
                                        if (name === 'Óptimo (h)') return [value, 'Horas Operativas Totales'];
                                        return [value, name];
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="MTBF" fill={BAR_COLORS.mtbf} radius={[0, 4, 4, 0]} name="MTBF (h)" barSize={10} />
                                <Bar dataKey="MTTR" fill={BAR_COLORS.mttr} radius={[0, 4, 4, 0]} name="MTTR (h)" barSize={10} />
                                <Bar dataKey="Hrs Operativas" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Óptimo (h)" barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
                
                <div className="mt-8 overflow-x-auto">
                    <table className="w-full text-[11px]">
                        <thead><tr className="border-b border-slate-100"><th className="text-left pb-4 font-black text-slate-400 uppercase tracking-widest">Activo</th><th className="text-center pb-4 font-black text-slate-400 uppercase tracking-widest">Disponibilidad</th><th className="text-center pb-4 font-black text-slate-400 uppercase tracking-widest">MTBF</th><th className="text-center pb-4 font-black text-slate-400 uppercase tracking-widest">MTTR</th><th className="text-center pb-4 font-black text-slate-400 uppercase tracking-widest">Correctivos</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">{kpis.mills.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/50 transition-colors"><td className="py-3 font-black text-slate-700">{m.name}</td><td className={`py-3 text-center font-black ${getAvailabilityColor(m.availability)}`}>{m.availability}%</td><td className="py-3 text-center font-bold text-slate-600">{m.mtbf || '∞'}h</td><td className="py-3 text-center font-bold text-slate-600">{m.mttr || '0'}h</td><td className="py-3 text-center font-bold text-slate-400">{m.failureCount}</td></tr>
                        ))}</tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default KpiIndicators;
