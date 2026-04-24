import React, { useState } from 'react';
import { Bell, Menu, Search, User, LogOut, Settings, ChevronDown, Wrench, Package, Truck, X, Factory } from 'lucide-react';
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
  const clearAllNotifications = useAppStore(state => state.clearAllNotifications);
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
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 shadow-lg w-full transition-all duration-500">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 w-full">
            {/* Left side - Menu toggle y título */}
            <div className="flex items-center flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors md:hidden mr-3"
                title={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
              >
                <Menu size={24} />
              </button>

              <div className="flex flex-col">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">Molino Planta Saramarca II</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">Sistema de Molienda</p>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 relative transition-colors"
                >
                  <Bell size={22} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-slate-900 animate-pulse">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Notificaciones</h3>
                      <button 
                        onClick={() => clearAllNotifications()}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        Limpiar todo
                      </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            onClick={() => {
                              markNotificationAsRead(notif.id);
                              setShowNotifications(false);
                              if (notif.tipo === 'MANTENIMIENTO' || notif.titulo?.includes('Mantenimiento') || notif.mensaje?.includes('requiere')) {
                                navigate('/mantenimiento');
                              }
                            }}
                            className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer relative ${!notif.leida ? 'bg-indigo-50/30' : ''}`}
                          >
                            {!notif.leida && <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-500 rounded-full"></div>}
                            <div className="flex gap-3">
                              <div className={`p-2 rounded-xl shrink-0 ${
                                notif.tipo === 'MANTENIMIENTO' ? 'bg-amber-100 text-amber-600' :
                                notif.tipo === 'STOCK' ? 'bg-rose-100 text-rose-600' :
                                'bg-indigo-100 text-indigo-600'
                              }`}>
                                {notif.tipo === 'MANTENIMIENTO' ? <Wrench size={16} /> : 
                                 notif.tipo === 'STOCK' ? <Package size={16} /> : 
                                 <Factory size={16} />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 mb-0.5">{notif.titulo}</p>
                                <p className="text-[11px] text-slate-500 leading-relaxed">{notif.mensaje}</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-tighter">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell size={32} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-xs font-bold text-slate-400">No hay notificaciones</p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                      <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
                        Ver todo el historial
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-800 transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <User size={18} className="text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-bold text-white leading-none">{user?.nombre}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-tighter">{user?.role}</p>
                  </div>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
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