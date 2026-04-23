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
    const [searchTerm, setSearchTerm] = React.useState('');
    const [showDropdown, setShowDropdown] = React.useState(false);

    const selectedClient = React.useMemo(() => 
        clients.find(c => c.id === selectedClientId),
    [clients, selectedClientId]);

    const filteredClients = React.useMemo(() => {
        if (!searchTerm) return clients.slice(0, 50); // Limit initial view
        const term = searchTerm.toLowerCase();
        return clients.filter(c => 
            c.name.toLowerCase().includes(term) || 
            (c.client_type && c.client_type.toLowerCase().includes(term))
        );
    }, [clients, searchTerm]);

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
                <User size={20} strokeWidth={1.5} className="mr-2 text-indigo-600" />
                Información del Cliente
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                {/* Cliente Selector con Búsqueda */}
                <div className="lg:col-span-5 relative">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Cliente</label>
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="🔍 Buscar cliente por nombre..."
                            value={selectedClient ? selectedClient.name : searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (selectedClientId) onClientChange(''); // Reset if typing
                            }}
                            onFocus={() => setShowDropdown(true)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all"
                            disabled={disabled}
                        />
                        {showDropdown && !disabled && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                {filteredClients.length > 0 ? (
                                    filteredClients.map(cliente => (
                                        <button
                                            key={cliente.id}
                                            onClick={() => {
                                                onClientChange(cliente.id);
                                                setSearchTerm('');
                                                setShowDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center group"
                                        >
                                            <div>
                                                <p className="font-bold text-slate-900 group-hover:text-indigo-700">{cliente.name}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cliente.client_type}</p>
                                            </div>
                                            {selectedClientId === cliente.id && (
                                                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-slate-500 text-sm italic">
                                        No se encontraron resultados
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Backdrop to close dropdown */}
                        {showDropdown && (
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setShowDropdown(false)}
                            ></div>
                        )}
                    </div>
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
                {stockInfo && (
                    <div className="lg:col-span-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                            <Package size={16} className="mr-1" />
                            Stock Disponible
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="px-2 py-2 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                <div className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">Total</div>
                                <div className="text-base md:text-lg font-black text-blue-900 leading-tight">{stockInfo.total}</div>
                            </div>
                            <div className="px-2 py-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                                <div className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">Cuarzo</div>
                                <div className="text-base md:text-lg font-black text-amber-900 leading-tight">{stockInfo.cuarzo}</div>
                            </div>
                            <div className="px-2 py-2 bg-purple-50 border border-purple-200 rounded-lg text-center">
                                <div className="text-[10px] text-purple-600 font-bold uppercase tracking-tight">Llampo</div>
                                <div className="text-base md:text-lg font-black text-purple-900 leading-tight">{stockInfo.llampo}</div>
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
