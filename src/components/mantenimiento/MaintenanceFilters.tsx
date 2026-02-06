import React from 'react';
import { Search, Filter, Printer, FileText, MessageSquare, Mail } from 'lucide-react';

interface MaintenanceFiltersProps {
    search: string;
    setSearch: (value: string) => void;
    filterType: string;
    setFilterType: (value: string) => void;
    filterStatus: string;
    setFilterStatus: (value: string) => void;
    selectedMill: string;
    setSelectedMill: (value: string) => void;
    mills: any[];
    onApplyFilters: () => void;
    onClearFilters: () => void;
    onPrint: () => void;
    onGeneratePDF: () => void;
    onSendWhatsApp: () => void;
    onSendEmail: () => void;
}

export const MaintenanceFilters: React.FC<MaintenanceFiltersProps> = ({
    search,
    setSearch,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    selectedMill,
    setSelectedMill,
    mills,
    onApplyFilters,
    onClearFilters,
    onPrint,
    onGeneratePDF,
    onSendWhatsApp,
    onSendEmail
}) => {
    return (
        <div className="bg-white rounded-2xl p-4 md:p-6 border">
            {/* Filtros principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Búsqueda */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar ID, molino, descripción..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-4 py-2 border rounded-xl pl-10 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Filtro por tipo */}
                <div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2 border rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="PREVENTIVO">Preventivo</option>
                        <option value="CORRECTIVO">Correctivo</option>
                    </select>
                </div>

                {/* Filtro por estado */}
                <div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 border rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_PROCESO">En proceso</option>
                        <option value="COMPLETADO">Completado</option>
                    </select>
                </div>

                {/* Filtro por molino */}
                <div>
                    <select
                        value={selectedMill}
                        onChange={(e) => setSelectedMill(e.target.value)}
                        className="px-4 py-2 border rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Todos los molinos</option>
                        {mills.map((mill) => (
                            <option key={mill.id} value={mill.id}>{mill.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-wrap gap-2 mt-4">
                <button
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap hover:bg-indigo-100 transition-colors"
                    onClick={onApplyFilters}
                >
                    <Filter size={16} className="inline mr-2" />
                    Aplicar filtros
                </button>
                <button
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-gray-200 transition-colors"
                    onClick={onClearFilters}
                >
                    Limpiar filtros
                </button>
                <button
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap hover:bg-gray-200 transition-colors"
                    onClick={onPrint}
                >
                    <Printer size={16} className="inline mr-2" />
                    Imprimir
                </button>
                <button
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap hover:bg-gray-200 transition-colors"
                    onClick={onGeneratePDF}
                >
                    <FileText size={16} className="inline mr-2" />
                    Generar PDF
                </button>
                <button
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap hover:bg-green-200 transition-colors"
                    onClick={onSendWhatsApp}
                >
                    <MessageSquare size={16} className="inline mr-2" />
                    Enviar WhatsApp
                </button>
                <button
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap hover:bg-blue-200 transition-colors"
                    onClick={onSendEmail}
                >
                    <Mail size={16} className="inline mr-2" />
                    Enviar Correo
                </button>
            </div>
        </div>
    );
};
