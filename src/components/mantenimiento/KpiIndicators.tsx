import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend
} from 'recharts';
import { Activity, Clock, CheckCircle, TrendingUp, Calendar, Gauge, Timer } from 'lucide-react';
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

/**
 * Calcula horas operativas reales por molino a partir de milling_logs
 * Cada milling_log tiene mills_used: [{id, cuarzo, llampo}]
 * y tiempos estimados por tipo de mineral
 */
async function fetchMillingHoursPerMill(periodStart: Date): Promise<Record<string, number>> {
    const hoursMap: Record<string, number> = {};

    try {
        const { data: millingLogs, error } = await supabase
            .from('milling_logs')
            .select('mills_used, mineral_type, total_sacks, created_at, status')
            .gte('created_at', periodStart.toISOString())
            .order('created_at', { ascending: false });

        if (error || !millingLogs) {
            console.error('Error fetching milling_logs for KPI:', error);
            return hoursMap;
        }

        millingLogs.forEach((log: any) => {
            const millsUsed = log.mills_used || [];
            const mineralType = (log.mineral_type || '').toUpperCase();

            // Duración por sesión de molienda según tipo de mineral
            // OXIDO: ~1.67 horas (100 min), SULFURO: ~2-2.5 horas (120-150 min)
            let sessionHours = 1.67; // default OXIDO
            if (mineralType === 'SULFURO') {
                sessionHours = 2.25; // promedio 135 min
            }

            // Distribuir las horas entre los molinos usados
            const millCount = millsUsed.length || 1;
            const hoursPerMill = sessionHours; // Cada molino trabaja la sesión completa

            millsUsed.forEach((m: any) => {
                const millId = m.id || m.mill_id;
                if (millId) {
                    hoursMap[millId] = (hoursMap[millId] || 0) + hoursPerMill;
                }
            });
        });
    } catch (e) {
        console.error('Error in fetchMillingHoursPerMill:', e);
    }

    return hoursMap;
}

/**
 * Calcula los KPIs de mantenimiento industrial (MTBF, MTTR, Disponibilidad)
 */
function calculateKPIs(
    logs: any[],
    mills: any[],
    periodDays: number,
    millingHoursMap: Record<string, number>
) {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Filtrar solo CORRECTIVOS completados dentro del período
    const correctiveLogs = logs.filter(log => {
        const logType = (log.type || log.tipo || '').toUpperCase();
        const logStatus = (log.status || log.estado || '').toUpperCase();
        const logDate = new Date(log.failure_start_time || log.created_at);
        return logType === 'CORRECTIVO' && logStatus === 'COMPLETADO' && logDate >= periodStart;
    });

    // Contar todos los mantenimientos del período (preventivos + correctivos)
    const allPeriodLogs = logs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= periodStart;
    });

    // KPIs por molino
    const millKPIs = mills.map(mill => {
        const millCorrectiveLogs = correctiveLogs.filter(log => {
            const logMillId = log.mill_id || log.molino_id;
            return logMillId === mill.id;
        });

        const failureCount = millCorrectiveLogs.length;

        // Calcular horas totales de reparación (downtime)
        let totalRepairHours = 0;
        millCorrectiveLogs.forEach(log => {
            if (log.failure_start_time && log.completed_at) {
                const start = new Date(log.failure_start_time).getTime();
                const end = new Date(log.completed_at).getTime();
                const hours = (end - start) / (1000 * 60 * 60);
                if (hours > 0 && hours < 720) {
                    totalRepairHours += hours;
                }
            } else if (log.worked_hours) {
                totalRepairHours += Number(log.worked_hours);
            }
        });

        // Horas operativas REALES desde milling_logs
        const realMillingHours = millingHoursMap[mill.id] || 0;

        // Horas operativas totales = horas de molienda + horas en standby (libre)
        // MTBF usa las horas operativas reales de funcionamiento
        const operativeHours = realMillingHours;

        // Cálculos KPIs
        const mtbf = failureCount > 0 && operativeHours > 0 ? operativeHours / failureCount : null;
        const mttr = failureCount > 0 ? totalRepairHours / failureCount : null;
        const availability = failureCount > 0 && mtbf !== null && mttr !== null
            ? (mtbf / (mtbf + mttr)) * 100
            : 100;

        // Mantenimientos preventivos del molino en el período
        const preventiveCount = allPeriodLogs.filter(log => {
            const logMillId = log.mill_id || log.molino_id;
            const logType = (log.type || log.tipo || '').toUpperCase();
            return logMillId === mill.id && logType === 'PREVENTIVO';
        }).length;

        return {
            id: mill.id,
            name: mill.name || `Molino ${mill.id?.substring(0, 4)}`,
            failureCount,
            preventiveCount,
            totalRepairHours: Math.round(totalRepairHours * 10) / 10,
            operativeHours: Math.round(realMillingHours * 10) / 10,
            totalHoursWorked: mill.total_hours_worked || mill.horas_trabajadas || mill.horasTrabajadas || 0,
            mtbf: mtbf !== null ? Math.round(mtbf * 10) / 10 : null,
            mttr: mttr !== null ? Math.round(mttr * 10) / 10 : null,
            availability: Math.round(availability * 10) / 10
        };
    });

    // Promedios globales
    const millsWithFailures = millKPIs.filter(m => m.failureCount > 0);
    const totalFailures = millKPIs.reduce((sum, m) => sum + m.failureCount, 0);
    const totalRepairH = millKPIs.reduce((sum, m) => sum + m.totalRepairHours, 0);
    const totalOperativeH = millKPIs.reduce((sum, m) => sum + m.operativeHours, 0);
    const totalPreventive = millKPIs.reduce((sum, m) => sum + m.preventiveCount, 0);

    const globalMtbf = millsWithFailures.length > 0
        ? millsWithFailures.reduce((sum, m) => sum + (m.mtbf || 0), 0) / millsWithFailures.length
        : null;

    const globalMttr = millsWithFailures.length > 0
        ? millsWithFailures.reduce((sum, m) => sum + (m.mttr || 0), 0) / millsWithFailures.length
        : null;

    const globalAvailability = millsWithFailures.length > 0
        ? millKPIs.reduce((sum, m) => sum + m.availability, 0) / millKPIs.length
        : 100;

    return {
        mills: millKPIs,
        global: {
            mtbf: globalMtbf !== null ? Math.round(globalMtbf * 10) / 10 : null,
            mttr: globalMttr !== null ? Math.round(globalMttr * 10) / 10 : null,
            availability: Math.round(globalAvailability * 10) / 10,
            totalFailures,
            totalPreventive,
            totalRepairHours: Math.round(totalRepairH * 10) / 10,
            totalOperativeHours: Math.round(totalOperativeH * 10) / 10
        }
    };
}

function getAvailabilityColor(value: number): string {
    if (value >= 95) return 'text-emerald-600';
    if (value >= 85) return 'text-amber-500';
    return 'text-red-600';
}

function getAvailabilityBg(value: number): string {
    if (value >= 95) return 'bg-emerald-100';
    if (value >= 85) return 'bg-amber-100';
    return 'bg-red-100';
}

function getAvailabilityBarBgColor(value: number): string {
    if (value >= 95) return '#10b981';
    if (value >= 85) return '#f59e0b';
    return '#ef4444';
}

export const KpiIndicators: React.FC<KpiIndicatorsProps> = ({ maintenanceLogs, mills }) => {
    const [period, setPeriod] = useState<PeriodOption>('90');
    const [millingHoursMap, setMillingHoursMap] = useState<Record<string, number>>({});

    // Fetch real milling hours when period changes
    useEffect(() => {
        const periodDays = parseInt(period);
        const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

        fetchMillingHoursPerMill(periodStart).then(map => {
            setMillingHoursMap(map);
        });
    }, [period, maintenanceLogs.length]);

    const kpis = useMemo(() => {
        return calculateKPIs(maintenanceLogs, mills, parseInt(period), millingHoursMap);
    }, [maintenanceLogs, mills, period, millingHoursMap]);

    // Preparar datos para el gráfico comparativo
    const chartData = useMemo(() => {
        return kpis.mills.map(m => ({
            name: m.name,
            MTBF: m.mtbf || 0,
            MTTR: m.mttr || 0,
            'Hrs Operativas': m.operativeHours
        }));
    }, [kpis]);

    const noFailures = kpis.global.totalFailures === 0;

    return (
        <div className="space-y-6">
            {/* Header con selector de período */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                        <Activity size={20} className="mr-2 text-indigo-600" />
                        Indicadores de Confiabilidad (KPIs)
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        MTBF · MTTR · Disponibilidad — Basado en datos reales de molienda y mantenimiento
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as PeriodOption)}
                        className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                        {Object.entries(PERIOD_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tarjetas KPI Principales — 2 filas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* MTBF */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                        <div className="p-2.5 bg-indigo-100 rounded-xl mr-3">
                            <TrendingUp className="text-indigo-600" size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MTBF</p>
                            <p className="text-[10px] text-gray-400">T. Medio Entre Fallas</p>
                        </div>
                    </div>
                    {noFailures ? (
                        <div>
                            <p className="text-2xl font-black text-emerald-600">∞</p>
                            <p className="text-xs text-emerald-500 font-medium mt-1">Sin fallas correctivas</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-2xl font-black text-gray-900">
                                {kpis.global.mtbf}<span className="text-sm font-bold text-gray-400 ml-1">hrs</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {kpis.global.totalFailures} falla{kpis.global.totalFailures !== 1 ? 's' : ''} correctiva{kpis.global.totalFailures !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>

                {/* MTTR */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                        <div className="p-2.5 bg-amber-100 rounded-xl mr-3">
                            <Clock className="text-amber-600" size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MTTR</p>
                            <p className="text-[10px] text-gray-400">T. Medio de Reparación</p>
                        </div>
                    </div>
                    {noFailures ? (
                        <div>
                            <p className="text-2xl font-black text-emerald-600">0<span className="text-sm font-bold text-gray-400 ml-1">hrs</span></p>
                            <p className="text-xs text-emerald-500 font-medium mt-1">Sin paradas correctivas</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-2xl font-black text-gray-900">
                                {kpis.global.mttr}<span className="text-sm font-bold text-gray-400 ml-1">hrs</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {kpis.global.totalRepairHours}h totales de downtime
                            </p>
                        </div>
                    )}
                </div>

                {/* Disponibilidad */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                        <div className={`p-2.5 ${getAvailabilityBg(kpis.global.availability)} rounded-xl mr-3`}>
                            <Gauge className={getAvailabilityColor(kpis.global.availability)} size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DISPONIBILIDAD</p>
                            <p className="text-[10px] text-gray-400">MTBF / (MTBF + MTTR)</p>
                        </div>
                    </div>
                    <p className={`text-3xl font-black ${getAvailabilityColor(kpis.global.availability)}`}>
                        {kpis.global.availability}<span className="text-sm font-bold ml-0.5">%</span>
                    </p>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                        <div
                            className="h-2 rounded-full transition-all duration-700"
                            style={{
                                width: `${kpis.global.availability}%`,
                                backgroundColor: getAvailabilityBarBgColor(kpis.global.availability)
                            }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        {kpis.global.availability >= 95 ? 'Excelente' : kpis.global.availability >= 85 ? 'Aceptable' : 'Requiere atención'}
                    </p>
                </div>

                {/* Horas Operativas (de molienda real) */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                        <div className="p-2.5 bg-violet-100 rounded-xl mr-3">
                            <Timer className="text-violet-600" size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">HRS OPERATIVAS</p>
                            <p className="text-[10px] text-gray-400">Molienda en período</p>
                        </div>
                    </div>
                    <p className="text-2xl font-black text-gray-900">
                        {kpis.global.totalOperativeHours}<span className="text-sm font-bold text-gray-400 ml-1">hrs</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {kpis.global.totalPreventive} preventivo{kpis.global.totalPreventive !== 1 ? 's' : ''} · {PERIOD_LABELS[period].toLowerCase()}
                    </p>
                </div>
            </div>

            {/* Gráfico Comparativo por Molino */}
            {mills.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-base font-bold text-gray-900">Comparativa por Molino</h4>
                            <p className="text-xs text-gray-500">MTBF vs MTTR y Horas Operativas — {PERIOD_LABELS[period]}</p>
                        </div>
                    </div>

                    {noFailures ? (
                        <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                            <CheckCircle size={40} className="mb-3 text-emerald-300" />
                            <p className="text-sm font-bold">Sin fallas correctivas en este período</p>
                            <p className="text-xs mt-1">Todos los molinos operan con 100% de disponibilidad</p>
                        </div>
                    ) : (
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    layout="vertical"
                                    margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={90}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                            fontWeight: 'bold',
                                            fontSize: '12px'
                                        }}
                                        formatter={(value: number, name: string) => [`${value} hrs`, name]}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '11px', fontWeight: 700 }}
                                    />
                                    <Bar dataKey="MTBF" fill={BAR_COLORS.mtbf} radius={[0, 6, 6, 0]} barSize={12} name="MTBF (hrs)" />
                                    <Bar dataKey="MTTR" fill={BAR_COLORS.mttr} radius={[0, 6, 6, 0]} barSize={12} name="MTTR (hrs)" />
                                    <Bar dataKey="Hrs Operativas" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={12} name="Hrs Operativas" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Tabla resumen por molino — siempre visible */}
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-2 px-3 font-bold text-gray-400 uppercase tracking-wider">Molino</th>
                                    <th className="text-center py-2 px-3 font-bold text-violet-500 uppercase tracking-wider">Hrs Molienda</th>
                                    <th className="text-center py-2 px-3 font-bold text-gray-400 uppercase tracking-wider">Correctivos</th>
                                    <th className="text-center py-2 px-3 font-bold text-gray-400 uppercase tracking-wider">Preventivos</th>
                                    <th className="text-center py-2 px-3 font-bold text-indigo-500 uppercase tracking-wider">MTBF (h)</th>
                                    <th className="text-center py-2 px-3 font-bold text-amber-500 uppercase tracking-wider">MTTR (h)</th>
                                    <th className="text-center py-2 px-3 font-bold text-gray-400 uppercase tracking-wider">Disponib.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kpis.mills.map((m, i) => (
                                    <tr key={m.id} className={`${i % 2 === 0 ? 'bg-gray-50/50' : ''} hover:bg-indigo-50/30 transition-colors`}>
                                        <td className="py-2.5 px-3 font-bold text-gray-800">{m.name}</td>
                                        <td className="py-2.5 px-3 text-center font-black text-violet-600">{m.operativeHours}</td>
                                        <td className="py-2.5 px-3 text-center font-medium text-gray-600">{m.failureCount}</td>
                                        <td className="py-2.5 px-3 text-center font-medium text-gray-600">{m.preventiveCount}</td>
                                        <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{m.mtbf ?? '∞'}</td>
                                        <td className="py-2.5 px-3 text-center font-bold text-amber-600">{m.mttr ?? '0'}</td>
                                        <td className={`py-2.5 px-3 text-center font-black ${getAvailabilityColor(m.availability)}`}>
                                            {m.availability}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KpiIndicators;
