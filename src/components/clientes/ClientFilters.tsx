import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

interface ClientFiltersProps {
    search: string;
    setSearch: (value: string) => void;
    filterStatus: string;
    setFilterStatus: (value: string) => void;
    filterZone: string;
    setFilterZone: (value: string) => void;
    zones: Array<{ id: string; name: string }>;
    onClear: () => void;
}

export const ClientFilters: React.FC<ClientFiltersProps> = ({
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    filterZone,
    setFilterZone,
    zones,
    onClear
}) => {
    return (
        <div className="bg-white rounded-2xl p-6 border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Búsqueda */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente o contacto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Filtro por estado */}
                <div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="ACTIVO">Activos</option>
                        <option value="INACTIVO">Inactivos</option>
                    </select>
                </div>

                {/* Filtro por zona */}
                <div>
                    <select
                        value={filterZone}
                        onChange={(e) => setFilterZone(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Todas las zonas</option>
                        {zones.map(z => (
                            <option key={z.id} value={z.name}>{z.name}</option>
                        ))}
                    </select>
                </div>

                {/* Botón limpiar */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onClear}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <RefreshCw size={18} className="mr-2" />
                        Limpiar filtros
                    </button>
                </div>
            </div>
        </div>
    );
};
