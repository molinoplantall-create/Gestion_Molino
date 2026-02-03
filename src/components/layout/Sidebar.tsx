import { Link, useLocation } from 'react-router-dom';
import {
  Home, Factory, Package, FileText, Wrench,
  Users, UserCircle, LogOut, ChevronLeft,
  ChevronRight, PlusCircle, Menu, X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems = [
    { path: '/dashboard', icon: <Home size={20} strokeWidth={1.5} />, label: 'Dashboard' },
    { path: '/moliendas', icon: <Factory size={20} strokeWidth={1.5} />, label: 'Moliendas' },
    { path: '/registro-molienda', icon: <PlusCircle size={20} strokeWidth={1.5} />, label: 'Nueva Molienda' },
    { path: '/stock', icon: <Package size={20} strokeWidth={1.5} />, label: 'Stock' },
    { path: '/clientes', icon: <UserCircle size={20} strokeWidth={1.5} />, label: 'Clientes' },
    { path: '/reportes', icon: <FileText size={20} strokeWidth={1.5} />, label: 'Reportes' },
    { path: '/mantenimiento', icon: <Wrench size={20} strokeWidth={1.5} />, label: 'Mantenimiento' },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ path: '/usuarios', icon: <Users size={20} strokeWidth={1.5} />, label: 'Usuarios' });
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <>
      {/* Botón hamburguesa para móvil */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg md:hidden"
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {sidebarOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
        </button>
      )}

      {/* Overlay para móvil */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar principal */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen z-40
          bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800
          transition-all duration-300 ease-in-out
          ${isMobile
            ? sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full'
            : sidebarOpen ? 'w-64' : 'w-20'
          }
        `}
      >
        {/* Header del Sidebar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className={`flex items-center ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="bg-indigo-600/20 p-2 rounded-lg text-indigo-400">
              <Factory size={22} strokeWidth={1.5} />
            </div>
            {sidebarOpen && (
              <h1 className="text-white font-bold ml-3 text-base whitespace-nowrap tracking-wide">
                Gestión Molino
              </h1>
            )}
          </div>
        </div>

        {/* Toggle Button Desktop - Floating */}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-20 bg-slate-800 text-slate-400 border border-slate-700 p-1 rounded-full hover:bg-slate-700 hover:text-white transition-colors shadow-sm z-50"
          >
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {/* Menú de navegación */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={`
                  flex items-center ${sidebarOpen ? 'px-3' : 'justify-center px-2'} 
                  py-2.5 rounded-lg transition-all duration-200 group
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
                title={!sidebarOpen ? item.label : ''}
              >
                <div className={`flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                  {item.icon}
                </div>
                {sidebarOpen && (
                  <span className={`ml-3 text-sm font-medium whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className={`
              flex items-center ${sidebarOpen ? 'px-3' : 'justify-center px-2'} 
              w-full py-2.5 rounded-lg text-slate-400 
              hover:bg-red-500/10 hover:text-red-400 transition-colors
              group
            `}
            title={!sidebarOpen ? "Cerrar sesión" : ""}
          >
            <LogOut size={20} strokeWidth={1.5} className="group-hover:text-red-400" />
            {sidebarOpen && <span className="ml-3 text-sm font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;