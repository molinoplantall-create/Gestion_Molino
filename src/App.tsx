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

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />
        
        {/* Rutas protegidas con Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/moliendas" element={<Moliendas />} />
          <Route path="/registro-molienda" element={<RegistroMolienda />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/mantenimiento" element={<Mantenimiento />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>
        
        {/* Redirecciones */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;