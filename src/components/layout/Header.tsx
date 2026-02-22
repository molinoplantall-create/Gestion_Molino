import React, { useState } from 'react';
import { Bell, Menu, Search, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const notifications = useAppStore(state => state.notifications);
  const markNotificationAsRead = useAppStore(state => state.markNotificationAsRead);
  const sidebarOpen = useAppStore(state => state.sidebarOpen);
  const setSidebarOpen = useAppStore(state => state.setSidebarOpen);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const unreadNotifications = notifications?.filter(n => !n.leida).length || 0;

  const handleLogout = () => {
    logout();
    setShowLogoutModal(false);
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
            <div className="hidden md:flex flex-1 max-w-2xl mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="search"
                  placeholder="Buscar moliendas, clientes, reportes..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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
        type="danger"
        icon="logout"
      />
    </>
  );
};

export default Header;