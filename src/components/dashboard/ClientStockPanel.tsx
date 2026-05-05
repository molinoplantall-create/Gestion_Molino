import React from 'react';
import { Package, TrendingUp, AlertCircle, ChevronRight } from 'lucide-react';
import { Client } from '@/types';
import { formatNumber } from '@/utils/formatters';

interface ClientStockPanelProps {
  clients: Client[];
  loading?: boolean;
}

const ClientStockPanel: React.FC<ClientStockPanelProps> = ({ clients, loading }) => {
  // Filter clients with stock and sort by total stock descending
  const clientsWithStock = React.useMemo(() => {
    return clients
      .map(c => ({
        ...c,
        totalStock: (c.stock_cuarzo || 0) + (c.stock_llampo || 0)
      }))
      .filter(c => c.totalStock > 0)
      .sort((a, b) => b.totalStock - a.totalStock)
      .slice(0, 8); // Top 8 to fit nicely in the panel
  }, [clients]);

  // Calculate total stock across all clients
  const totalStockSum = React.useMemo(() => {
    return clients.reduce((acc, c) => acc + (c.stock_cuarzo || 0) + (c.stock_llampo || 0), 0);
  }, [clients]);

  if (loading) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm h-full flex flex-col relative z-0 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="h-6 w-16 bg-slate-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm h-full flex flex-col relative z-0 overflow-hidden group">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-50 to-transparent rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Stock Listo para Molienda
            </h2>
            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black border border-emerald-200 shadow-sm shadow-emerald-100">
              {formatNumber(totalStockSum)} sacos
            </div>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
            Top Clientes con Material
          </p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 hidden sm:block">
          <Package size={20} strokeWidth={2.5} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 relative z-10 custom-scrollbar">
        {clientsWithStock.length > 0 ? (
          clientsWithStock.map((client, index) => {
            // Determine highlight level
            const isVeryHigh = client.totalStock > 1000;
            const isHigh = client.totalStock > 500 && client.totalStock <= 1000;
            
            let badgeColors = "bg-slate-100 text-slate-700 border-slate-200";
            let iconColors = "bg-slate-100 text-slate-500";
            
            if (isVeryHigh) {
              badgeColors = "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20";
              iconColors = "bg-emerald-100 text-emerald-600 shadow-sm shadow-emerald-200/50";
            } else if (isHigh) {
              badgeColors = "bg-amber-50 text-amber-700 border-amber-200";
              iconColors = "bg-amber-100 text-amber-600";
            }

            return (
              <div 
                key={client.id} 
                className="group/item flex items-center justify-between p-4 bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl transition-all duration-300 hover:shadow-md hover:shadow-slate-200/20"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${iconColors}`}>
                    <span className="font-black text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover/item:text-indigo-600 transition-colors">
                      {client.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        {client.client_type || 'Minero'}
                      </span>
                      {isVeryHigh && (
                        <span className="flex items-center text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          <TrendingUp size={10} className="mr-1" /> Prioridad
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className={`px-3 py-1.5 rounded-lg border font-black text-sm transition-all duration-300 ${badgeColors}`}>
                    {formatNumber(client.totalStock)}
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 mr-1">
                    Sacos
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-3xl">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Package className="text-slate-300" size={32} />
            </div>
            <p className="text-sm font-bold text-slate-600">No hay stock registrado</p>
            <p className="text-xs font-medium text-slate-400 mt-1">
              No se encontraron clientes con sacos disponibles en inventario.
            </p>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 4px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
};

export default ClientStockPanel;
