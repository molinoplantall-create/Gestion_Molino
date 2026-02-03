import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '../../store/authStore';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

const Layout = () => {
  const { user, loading } = useAuthStore();
  const { sidebarOpen } = useAppStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Ahora tiene su propio scroll handleado internamente */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <Header />

        {/* Main content - Scrollable area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 relative scroll-smooth">
          <div className="max-w-7xl mx-auto pb-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;