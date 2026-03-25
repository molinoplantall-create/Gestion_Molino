import React from 'react';

export const MaintenanceSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
                    <div className="h-4 w-64 bg-slate-100 rounded-lg"></div>
                </div>
                <div className="h-10 w-40 bg-slate-200 rounded-xl"></div>
            </div>

            {/* KPI Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-32 bg-slate-100/50 border border-slate-100 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                            <div className="space-y-1">
                                <div className="h-2 w-16 bg-slate-200 rounded"></div>
                                <div className="h-2 w-12 bg-slate-100 rounded"></div>
                            </div>
                        </div>
                        <div className="h-6 w-24 bg-slate-200 rounded-lg"></div>
                    </div>
                ))}
            </div>

            {/* Table Skeleton */}
            <div className="bg-white/50 border border-slate-200 rounded-2xl overflow-hidden">
                <div className="h-12 bg-slate-50 border-b border-slate-100"></div>
                <div className="divide-y divide-slate-100">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-6 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 w-1/4">
                                <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-3/4 bg-slate-200 rounded"></div>
                                    <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                                </div>
                            </div>
                            <div className="h-3 w-20 bg-slate-100 rounded"></div>
                            <div className="h-5 w-24 bg-slate-200 rounded-full"></div>
                            <div className="h-3 w-16 bg-slate-100 rounded"></div>
                            <div className="flex gap-2">
                                <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                                <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Analysis Skeleton */}
            <div className="h-48 bg-slate-50 border border-slate-200 rounded-2xl"></div>
        </div>
    );
};
