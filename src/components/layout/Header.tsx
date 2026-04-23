import React, { useState } from 'react';
import { Bell, Menu, Search, User, LogOut, Settings, ChevronDown, Wrench, Package, Truck, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { useSupabaseStore } from '@/store/supabaseStore';
import { supabase } from '@/lib/supabase';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { LogOut as LogOutIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const notifications = useAppStore(state => state.notifications);
  const markNotificationAsRead = useAppStore(state => state.markNotificationAsRead);
  const sidebarOpen = useAppStore(state => state.sidebarOpen);
  const setSidebarOpen = useAppStore(state => state.setSidebarOpen);
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    clients: any[],
    mills: any[],
    maintenance: any[]
  }>({ clients: [], mills: [], maintenance: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const unreadNotifications = notifications?.filter(n => !n.leida).length || 0;

  const handleLogout = () => {
    logout();
    setShowLogoutModal(false);
  };

  // Search Logic
  const performSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults({ clients: [], mills: [], maintenance: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchTerms = query.trim().split(/\s+/);
      const formattedQuery = `%${searchTerms.join('%')}%`;

      const [clientsRes, millsRes, maintRes] = await Promise.all([
        supabase.from('clients').select('id, name').ilike('name', formattedQuery).limit(5),
        supabase.from('mills').select('id, name').ilike('name', formattedQuery).limit(5),
        supabase.from('maintenance_logs').select('id, description, mill_id, technician_name, mills(name)').or(`description.ilike.${formattedQuery},action_taken.ilike.${formattedQuery},technician_name.ilike.${formattedQuery}`).limit(5)
      ]);

      setSearchResults({
        clients: clientsRes.data || [],
        mills: millsRes.data || [],
        maintenance: maintRes.data || []
      });
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.length >= 2) {
      setShowSearchResults(true);
      performSearch(val);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleResultClick = (type: 'client' | 'mill' | 'maintenance', id: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    
    if (type === 'client') navigate(`/clientes?id=${id}`);
    if (type === 'mill') navigate(`/dashboard?millId=${id}`);
    if (type === 'maintenance') navigate(`/mantenimiento?id=${id}`);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 w-full">
            {/* Left side - Menu toggle y título */}
            <div className="flex items-center flex-1">
              {/* Botón menú SOLO móvil */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors md:hidden mr-3"
                title={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
              >
                <Menu size={24} />
              </button>

              {/* Título - Siempre visible */}
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold text-gray-900">Gestión de Molino</h1>
                <p className="text-xs text-gray-500">Sistema de molienda</p>
              </div>
            </div>

            {/* Center - Search (oculto en móvil) */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-4 relative">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  placeholder="Buscar clientes, molinos, órdenes..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-[400px] overflow-y-auto p-2">
                    {isSearching ? (
                      <div className="p-4 text-center text-gray-400 text-sm">Buscando...</div>
                    ) : (
                      <>
                        {searchResults.clients.length === 0 && searchResults.mills.length === 0 && searchResults.maintenance.length === 0 ? (
                          <div className="p-4 text-center text-gray-400 text-sm italic">No se encontraron resultados para "{searchQuery}"</div>
                        ) : (
                          <>
                            {/* Clients Section */}
                            {searchResults.clients.length > 0 && (
                              <div className="mb-2">
                                <p className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 rounded-lg">Clientes</p>
                                {searchResults.clients.map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => handleResultClick('client', c.id)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 rounded-xl transition-colors text-left group"
                                  >
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                      <Truck size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{c.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Mills Section */}
                            {searchResults.mills.length > 0 && (
                              <div className="mb-2">
                                <p className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 rounded-lg">Molinos</p>
                                {searchResults.mills.map(m => (
                                  <button
                                    key={m.id}
                                    onClick={() => handleResultClick('mill', m.id)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-amber-50 rounded-xl transition-colors text-left group"
                                  >
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-all">
                                      <Package size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{m.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Maintenance Section */}
                            {searchResults.maintenance.length > 0 && (
                              <div className="mb-2">
                                <p className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 rounded-lg">Órdenes de Mantenimiento</p>
                                {searchResults.maintenance.map(m => (
                                  <button
                                    key={m.id}
                                    onClick={() => handleResultClick('maintenance', m.id)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-rose-50 rounded-xl transition-colors text-left group"
                                  >
                                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-all">
                                      <Wrench size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-gray-700 line-clamp-1">{m.description}</span>
                                      <span className="text-[10px] text-gray-400 font-bold uppercase">{m.mills?.name || 'Molino'}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 relative transition-colors"
                >
                  <Bell size={22} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User size={18} className="text-blue-600" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg py-1 border border-gray-100 ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => setShowUserMenu(false)}
                        className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 items-center"
                      >
                        <User size={16} className="mr-2 text-gray-400" />
                        Mi Perfil
                      </button>

                    </div>

                    <div className="py-1 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowLogoutModal(true);
                        }}
                        className="flex w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 items-center"
                      >
                        <LogOut size={16} className="mr-2" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="¿Cerrar Sesión?"
        message="¿Estás seguro que deseas salir del sistema? Tendrás que iniciar sesión nuevamente para acceder."
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        variant="danger"
        icon={<LogOutIcon size={24} className="text-red-600" />}
      />
    </>
  );
};

export default Header;