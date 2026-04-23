import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    ChevronRight,
    TrendingUp,
    Map,
    Users,
    Package,
    PieChart as PieIcon,
    BarChart3
} from 'lucide-react';
import { useSupabaseStore } from '../store/supabaseStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatNumber } from '../utils/formatters';

const COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

const Analitica: React.FC = () => {
    const { clients, clientsLoading } = useSupabaseStore();

    // Normalización de zonas para agrupar errores de escritura comunes
    const ZONES_MAPPING: Record<string, string> = {
        'CARMAGO': 'CAMARGO',
        'CAMAGO': 'CAMARGO',
        'CAMARGO': 'CAMARGO'
    };

    // Data Aggregation
    const stats = useMemo(() => {
        const zoneData: Record<string, number> = {};
        const typeData: Record<string, number> = { 'MINERO': 0, 'PALLAQUERO': 0 };

        let totalSacks = 0;

        clients.forEach(c => {
            const volume = (c.cumulative_cuarzo || 0) + (c.cumulative_llampo || 0);
            totalSacks += volume;

            // By Zone
            let rawZone = (c.zone || 'SIN ZONA').trim().toUpperCase();
            const zone = ZONES_MAPPING[rawZone] || rawZone;
            
            zoneData[zone] = (zoneData[zone] || 0) + volume;

            // By Type
            if (c.client_type === 'MINERO') typeData['MINERO'] += volume;
            else if (c.client_type === 'PALLAQUERO') typeData['PALLAQUERO'] += volume;
        });

        const chartZoneData = Object.entries(zoneData)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const chartTypeData = Object.entries(typeData)
            .map(([name, value]) => ({ name, value }));

        return {
            chartZoneData,
            chartTypeData,
            totalSacks,
            topZone: chartZoneData[0]?.name || '---',
            topZoneValue: chartZoneData[0]?.value || 0,
            clientCount: clients.length
        };
    }, [clients]);

    if (clientsLoading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <LoadingSpinner text="Generando análisis de datos..." />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10 max-w-[1600px] mx-auto">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Business Intelligence</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Analítica de Producción</h1>
                <p className="text-slate-500 font-medium flex items-center mt-1">
                    <BarChart3 size={16} className="mr-2 text-indigo-500" />
                    Métricas de volumen por zonas, tipos de cliente y rendimiento historico
                </p>
            </div>

            {/* KPI Overlays */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'VOLUMEN HISTÓRICO', value: formatNumber(stats.totalSacks), sub: 'Sacos totales ingresados', icon: Package, color: 'indigo' },
                    { label: 'CLIENTES REGISTRADOS', value: formatNumber(stats.clientCount), sub: 'Base de datos activa', icon: Users, color: 'violet' },
                    { label: 'ZONA LÍDER', value: stats.topZone, sub: `${formatNumber(stats.topZoneValue)} sacos aportados`, icon: Map, color: 'amber' },
                    { label: 'TENENCIA VOLUMÉTRICA', value: 'ALTA', sub: 'Tendencia de ingreso mensual', icon: TrendingUp, color: 'emerald' },
                ].map((kpi) => (
                    <div key={kpi.label} className="kpi-card relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                            <kpi.icon size={80} strokeWidth={1} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                        <h3 className="text-2xl font-black text-slate-900 mb-1">{kpi.value}</h3>
                        <p className="text-xs font-bold text-slate-500">{kpi.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sacks by Zone */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Volumen por Zonas</h3>
                            <p className="text-sm text-slate-500">¿Qué zona está trayendo más mineral?</p>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-2xl">
                            <Map className="text-indigo-600" size={24} />
                        </div>
                    </div>

                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.chartZoneData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                                    width={100}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={30}>
                                    {stats.chartZoneData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Client Type Distribution */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Tipo de Clientes</h3>
                            <p className="text-sm text-slate-500">Distribución del volumen (Minero vs Pallaquero)</p>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-2xl">
                            <PieIcon className="text-indigo-600" size={24} />
                        </div>
                    </div>

                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.chartTypeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={100}
                                    outerRadius={140}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.chartTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    align="center"
                                    iconType="circle"
                                    formatter={(value) => <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detail Table for Zones */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
                <h4 className="text-lg font-black mb-6 uppercase tracking-widest flex items-center">
                    <ChevronRight className="mr-2 text-indigo-400" /> Desglose por Lotes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stats.chartZoneData.map((zone) => (
                        <div key={zone.name} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                            <span className="font-bold text-slate-400">{zone.name}</span>
                            <span className="text-xl font-black text-white">{formatNumber(zone.value)} <small className="text-[10px] opacity-40">SACOS</small></span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Analitica;
