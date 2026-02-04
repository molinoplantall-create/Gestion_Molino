import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Moliendas from './pages/Moliendas';
import RegistroMolienda from './pages/RegistroMolienda';
import Stock from './pages/Stock';
import Reportes from './pages/Reportes';
import Mantenimiento from './pages/Mantenimiento';
import Clientes from './pages/Clientes';
import Usuarios from './pages/Usuarios';
import { useAuthStore } from './store/authStore';

function App() {
  const { user, initialized, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized || loading) {
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
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/mantenimiento" element={<Mantenimiento />} />
          <Route path="/clientes" element={<Clientes />} />
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