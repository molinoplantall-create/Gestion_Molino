import React, { useState } from 'react';
import { Bell, Menu, Search, User, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { notifications, markNotificationAsRead, sidebarOpen, setSidebarOpen } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.leida).length;

  return (
    <header className="sticky top-0 z-50 glass-effect border-b border-white/20">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Menu toggle and logo (SIN ICONO) */}
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors lg:hidden"
            >
              <Menu size={24} />
            </button>
            
            <div className="flex items-center ml-4">
              {/* QUITADO EL ICONO */}
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">Gestión de Molino</h1>
                <p className="text-xs text-gray-500">Sistema de molienda</p>
              </div>
            </div>
          </div>

          {/* Center - Search */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="search"
                placeholder="Buscar moliendas, clientes, reportes..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  <span className="absolute -top-1 -right-1 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                    <p className="text-xs text-gray-500">{unreadNotifications} sin leer</p>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.slice(0, 5).map(notification => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!notification.leida ? 'bg-blue-50' : ''}`}
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        <div className="flex items-start">
                          <div className={`p-2 rounded-lg ${
                            notification.tipo === 'MOLIENDA' ? 'bg-green-100 text-green-600' :
                            notification.tipo === 'MANTENIMIENTO' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {notification.tipo === 'MOLIENDA' ? '⚙️' : 
                             notification.tipo === 'MANTENIMIENTO' ? '🔧' : '📢'}
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="font-medium text-sm text-gray-900">{notification.titulo}</p>
                            <p className="text-sm text-gray-600 mt-1">{notification.mensaje}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button className="text-primary-600 text-sm font-medium hover:text-primary-700 w-full text-center">
                      Ver todas las notificaciones
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User size={18} className="text-primary-600" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.rol?.toLowerCase()}</p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                      user?.rol === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                      user?.rol === 'OPERADOR' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user?.rol}
                    </span>
                  </div>
                  
                  <div className="py-1">
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                      <Settings size={16} className="mr-3" />
                      Configuración
                    </button>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <LogOut size={16} className="mr-3" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;