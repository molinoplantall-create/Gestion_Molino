import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Moliendas from './pages/Moliendas';
import RegistroMolienda from './pages/RegistroMolienda';
import Stock from './pages/Stock';
import Usuarios from './pages/Usuarios';
import Mantenimiento from './pages/Mantenimiento';
import Clientes from './pages/Clientes';
import Reportes from './pages/Reportes';
import { useAuthStore } from './store/authStore';
import { ToastContainer } from './components/common/Toast';
import { useSupabaseStore } from './store/supabaseStore';

function App() {
  const { user, initialized, loading: authLoading, initialize } = useAuthStore();
  const { mills, checkAndLiberateMills } = useSupabaseStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Global polling for auto-liberation of mills
  useEffect(() => {
    if (!user || mills.length === 0) return;

    // Check immediately on mount/update
    checkAndLiberateMills(mills);

    const intervalId = setInterval(() => {
      checkAndLiberateMills(useSupabaseStore.getState().mills);
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [user, mills.length]);

  if (!initialized || authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium italic">Autenticando...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ToastContainer />
      <Routes>
        {/* Ruta pública */}
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <Login />}
        />

        {/* Rutas protegidas con Layout */}
        <Route element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/moliendas" element={<Moliendas />} />
          <Route path="/registro-molienda" element={<RegistroMolienda />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/mantenimiento" element={<Mantenimiento />} />
          <Route path="/clientes" element={<Clientes />} />
{/* <Route path="/reportes" element={<Reportes />} /> */}
          <Route path="/usuarios" element={user?.role === 'ADMIN' ? <Usuarios /> : <Navigate to="/dashboard" />} />
        </Route>

        {/* Redirecciones */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;