import React from 'react';
import { User, Package } from 'lucide-react';

interface Client {
    id: string;
    name: string;
    client_type?: string;
    stock_cuarzo?: number;
    stock_llampo?: number;
}

interface ClientSelectorProps {
    clients: Client[];
    selectedClientId: string;
    onClientChange: (clientId: string) => void;
    stockInfo?: {
        total: number;
        cuarzo: number;
        llampo: number;
    };
    disabled?: boolean;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
    clients,
    selectedClientId,
    onClientChange,
    stockInfo,
    disabled = false
}) => {
    const selectedClient = clients.find(c => c.id === selectedClientId);

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
                <User size={20} strokeWidth={1.5} className="mr-2 text-indigo-600" />
                Información del Cliente
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                {/* Cliente Selector */}
                <div className="lg:col-span-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Cliente</label>
                    <select
                        value={selectedClientId}
                        onChange={(e) => onClientChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={disabled}
                    >
                        <option value="">Seleccione Cliente ({clients.length} disponibles)</option>
                        {clients.map(cliente => (
                            <option key={cliente.id} value={cliente.id}>
                                {cliente.name} - {cliente.client_type}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Tipo de Cliente */}
                {selectedClient && (
                    <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                        <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
                            {selectedClient.client_type || 'N/A'}
                        </div>
                    </div>
                )}

                {/* Stock Display */}
                {stockInfo && stockInfo.total > 0 && (
                    <div className="lg:col-span-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                            <Package size={16} className="mr-1" />
                            Stock Disponible
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                <div className="text-xs text-blue-600 font-medium">Total</div>
                                <div className="text-lg font-bold text-blue-900">{stockInfo.total}</div>
                            </div>
                            <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                                <div className="text-xs text-amber-600 font-medium">Cuarzo</div>
                                <div className="text-lg font-bold text-amber-900">{stockInfo.cuarzo}</div>
                            </div>
                            <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-center">
                                <div className="text-xs text-purple-600 font-medium">Llampo</div>
                                <div className="text-lg font-bold text-purple-900">{stockInfo.llampo}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* No client selected message */}
            {!selectedClientId && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-600 text-center">
                        Seleccione un cliente para ver su stock disponible
                    </p>
                </div>
            )}

            {/* No stock warning */}
            {selectedClientId && stockInfo && stockInfo.total === 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 text-center font-medium">
                        ⚠️ Este cliente no tiene stock disponible
                    </p>
                </div>
            )}
        </div>
    );
};
