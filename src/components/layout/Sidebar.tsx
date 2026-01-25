import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Factory, 
  Package, 
  FileText, 
  Wrench,
  Users,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect } from 'react';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detectar si estamos en móvil
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // En móvil: siempre oculto por defecto
      if (mobile) {
        setCollapsed(true);
        setMobileMenuOpen(false);
      } else {
        // En desktop: restaurar el estado guardado o usar por defecto abierto
        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState) {
          setCollapsed(savedState === 'true');
        } else {
          setCollapsed(false); // Por defecto abierto en desktop
        }
        setMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Guardar el estado del sidebar cuando cambia (solo en desktop)
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebar-collapsed', collapsed.toString());
    }
  }, [collapsed, isMobile]);

  const menuItems = [
    { path: '/dashboard', icon: <Home size={24} />, label: 'Dashboard' },
    { path: '/moliendas', icon: <Factory size={24} />, label: 'Moliendas' },
    { path: '/registro-molienda', icon: <PlusCircle size={24} />, label: 'Nueva Molienda' },
    { path: '/stock', icon: <Package size={24} />, label: 'Stock' },
    { path: '/clientes', icon: <UserCircle size={24} />, label: 'Clientes' },
    { path: '/reportes', icon: <FileText size={24} />, label: 'Reportes' },
    { path: '/mantenimiento', icon: <Wrench size={24} />, label: 'Mantenimiento' },
  ];

  // Solo admin ve usuarios
  if (user?.role === 'admin') {
    menuItems.push(
      { path: '/usuarios', icon: <Users size={24} />, label: 'Usuarios' }
    );
  }

  // Manejar toggle en desktop
  const handleDesktopToggle = () => {
    setCollapsed(!collapsed);
  };

  // Manejar toggle en móvil
  const handleMobileToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Cerrar menú móvil al hacer clic en un enlace
  const handleLinkClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Botón de menú hamburguesa para móvil - SIEMPRE VISIBLE EN MÓVIL */}
      {isMobile && (
        <button
          onClick={handleMobileToggle}
          className="fixed top-4 left-4 z-50 p-3 bg-gray-900 text-white rounded-lg shadow-lg md:hidden"
          title={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Overlay para móvil cuando el menú está abierto */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:relative
          top-0 left-0 h-full
          bg-gray-900 text-white flex flex-col
          transition-all duration-300 ease-in-out z-40
          ${isMobile
            ? mobileMenuOpen 
              ? 'w-64 translate-x-0' 
              : '-translate-x-full w-64'
            : collapsed 
              ? 'w-16' 
              : 'w-64'
          }
        `}
      >
        {/* Header del Sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {/* Logo - visible según estado */}
          {(!collapsed || isMobile) ? (
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg">
                <Factory size={24} />
              </div>
              {(!collapsed || (isMobile && mobileMenuOpen)) && (
                <h1 className="text-lg font-bold">Gestión Molino</h1>
              )}
            </div>
          ) : (
            <div className="mx-auto bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg">
              <Factory size={24} />
            </div>
          )}
          
          {/* Botón para contraer/expandir - SOLO EN DESKTOP */}
          {!isMobile && (
            <button
              onClick={handleDesktopToggle}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
              title={collapsed ? "Expandir menú" : "Contraer menú"}
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          )}
          
          {/* Botón para cerrar - SOLO EN MÓVIL CUANDO EL MENÚ ESTÁ ABIERTO */}
          {isMobile && mobileMenuOpen && (
            <button
              onClick={handleMobileToggle}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors md:hidden"
              title="Cerrar menú"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        {/* Menú de navegación */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const showLabels = !collapsed || isMobile;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`
                  flex items-center 
                  ${showLabels ? 'space-x-3' : 'justify-center'} 
                  p-3 rounded-lg transition-colors min-h-[44px]
                  ${isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
                title={!showLabels ? item.label : ''}
              >
                <div className="flex-shrink-0">
                  {item.icon}
                </div>
                {showLabels && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
        
        {/* Footer con usuario y logout */}
        <div className="border-t border-gray-800 p-4">
          {/* Info del usuario - solo visible cuando el sidebar está expandido */}
          {((!collapsed && !isMobile) || (isMobile && mobileMenuOpen)) && user && (
            <div className="mb-3 p-2 bg-gray-800 rounded-lg">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          )}
          
          {/* Botón de logout */}
          <button
            onClick={() => {
              handleLinkClick();
              logout();
            }}
            className={`
              flex items-center 
              ${(!collapsed || isMobile) ? 'space-x-3' : 'justify-center'} 
              w-full p-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white 
              transition-colors min-h-[44px]
            `}
            title={(!collapsed || isMobile) ? "" : "Cerrar sesión"}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {(!collapsed || (isMobile && mobileMenuOpen)) && (
              <span className="font-medium">Cerrar Sesión</span>
            )}
          </button>
        </div>
      </div>

      {/* Tooltips para iconos cuando el sidebar está colapsado en desktop */}
      {!isMobile && collapsed && (
        <div className="hidden md:block">
          {menuItems.map((item) => (
            <div
              key={item.path}
              className="fixed left-16 ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none"
              style={{ top: 'auto' }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Sidebar;