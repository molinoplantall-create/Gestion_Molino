import React, { useState } from 'react';
import { Users, UserPlus, Mail, Shield, Edit, Trash2, CheckCircle, XCircle, Search, Filter, Key, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '@/types';
import { USER_ROLES } from '@/constants';

interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  isActive: boolean;
  createdAt: Date;
  lastLogin: Date;
}

const Usuarios: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'OPERADOR' as UserRole,
    password: '',
    confirmPassword: '',
    isActive: true,
  });

  // Mock users data
  const [mockUsers, setMockUsers] = useState<User[]>([
    {
      id: '1',
      nombre: 'Juan Pérez',
      email: 'juan@molino.com',
      rol: 'ADMIN' as UserRole,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date('2024-01-15'),
    },
    {
      id: '2',
      nombre: 'María González',
      email: 'maria@molino.com',
      rol: 'OPERADOR' as UserRole,
      isActive: true,
      createdAt: new Date('2024-01-05'),
      lastLogin: new Date('2024-01-16'),
    },
    {
      id: '3',
      nombre: 'Carlos López',
      email: 'carlos@molino.com',
      rol: 'GERENCIA' as UserRole,
      isActive: true,
      createdAt: new Date('2024-01-10'),
      lastLogin: new Date('2024-01-14'),
    },
    {
      id: '4',
      nombre: 'Ana Rodríguez',
      email: 'ana@molino.com',
      rol: 'OPERADOR' as UserRole,
      isActive: false,
      createdAt: new Date('2024-01-12'),
      lastLogin: new Date('2024-01-13'),
    },
    {
      id: '5',
      nombre: 'Pedro Sánchez',
      email: 'pedro@molino.com',
      rol: 'OPERADOR' as UserRole,
      isActive: true,
      createdAt: new Date('2024-01-15'),
      lastLogin: new Date('2024-01-16'),
    },
  ]);

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.nombre.toLowerCase().includes(search.toLowerCase()) ||
                         user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.rol === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (rol: UserRole) => {
    const roleConfig = USER_ROLES.find(r => r.value === rol);
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${roleConfig?.color || 'bg-gray-100'}`}>
        {roleConfig?.label || rol}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center w-fit">
        <CheckCircle size={12} className="mr-1" />
        Activo
      </span>
    ) : (
      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center w-fit">
        <XCircle size={12} className="mr-1" />
        Inactivo
      </span>
    );
  };

  const handleNewUser = () => {
    setFormData({
      nombre: '',
      email: '',
      rol: 'OPERADOR',
      password: '',
      confirmPassword: '',
      isActive: true,
    });
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      password: '',
      confirmPassword: '',
      isActive: user.isActive,
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setFormData({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      password: '',
      confirmPassword: '',
      isActive: user.isActive,
    });
    setShowPasswordModal(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      setMockUsers(prev => prev.filter(user => user.id !== selectedUser.id));
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
  };

  const handleSubmit = () => {
    if (modalMode === 'create') {
      // Validar contraseña para creación
      if (formData.password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
      }

      const newUser: User = {
        id: (mockUsers.length + 1).toString(),
        nombre: formData.nombre,
        email: formData.email,
        rol: formData.rol,
        isActive: formData.isActive,
        createdAt: new Date(),
        lastLogin: new Date(),
      };
      setMockUsers(prev => [...prev, newUser]);
    } else if (selectedUser) {
      // En modo edición, solo actualizar si hay cambios
      setMockUsers(prev => prev.map(user => 
        user.id === selectedUser.id 
          ? { 
              ...user, 
              nombre: formData.nombre,
              email: formData.email,
              rol: formData.rol,
              isActive: formData.isActive
            } 
          : user
      ));
    }
    setShowModal(false);
    resetForm();
  };

  const handlePasswordChange = () => {
    if (!formData.password || formData.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    alert(`Contraseña cambiada para ${selectedUser?.nombre}`);
    setShowPasswordModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      rol: 'OPERADOR',
      password: '',
      confirmPassword: '',
      isActive: true,
    });
    setSelectedUser(null);
    setShowPassword(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-1">Administración de usuarios y permisos</p>
        </div>
        <button 
          onClick={handleNewUser}
          className="btn-primary mt-4 sm:mt-0 flex items-center hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={18} className="mr-2" />
          Nuevo Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{mockUsers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {mockUsers.filter(u => u.isActive).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl mr-4">
              <Shield className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Administradores</p>
              <p className="text-2xl font-bold text-gray-900">
                {mockUsers.filter(u => u.rol === 'ADMIN').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
              className="input-field"
            >
              <option value="all">Todos los roles</option>
              <option value="ADMIN">Administrador</option>
              <option value="OPERADOR">Operador</option>
              <option value="GERENCIA">Gerencia</option>
            </select>
          </div>

          <div>
            <select className="input-field">
              <option>Todos los estados</option>
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Acceso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-primary-600 font-medium">
                          {user.nombre.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.nombre}</div>
                        <div className="text-sm text-gray-500">
                          Registrado: {user.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-gray-900">
                      <Mail size={16} className="mr-2 text-gray-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.rol)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.isActive)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">
                      {user.lastLogin.toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.lastLogin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleChangePassword(user)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                        title="Cambiar contraseña"
                      >
                        <Key size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permissions */}
      <div className="bg-white rounded-2xl p-6 border">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Permisos por Rol</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {USER_ROLES.map((role) => (
            <div key={role.value} className="border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`px-3 py-1 rounded-full ${role.color}`}>
                  <span className="font-medium">{role.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {mockUsers.filter(u => u.rol === role.value).length}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-sm text-gray-600">Permisos:</div>
                <ul className="space-y-2">
                  {role.value === 'ADMIN' && (
                    <>
                      <li className="flex items-center text-sm">
                        <CheckCircle size={16} className="text-green-500 mr-2" />
                        Acceso completo al sistema
                      </li>
                      <li className="flex items-center text-sm">
                        <CheckCircle size={16} className="text-green-500 mr-2" />
                        Gestión de usuarios
                      </li>
                      <li className="flex items-center text-sm">
                        <CheckCircle size={16} className="text-green-500 mr-2" />
                        Configuración del sistema
                      </li>
                    </>
                  )}
                  {role.value === 'OPERADOR' && (
                    <>
                      <li className="flex items-center text-sm">
                        <CheckCircle size={16} className="text-green-500 mr-2" />
                        Registrar moliendas
                      </li>
                      <li className="flex items-center text-sm">
                        <CheckCircle size={16} className="text-green-500 mr-2" />
                        Registrar mantenimiento
                      </li>
                      <li className="flex items-center text-sm">
                        <CheckCircle size={16} className="text-green-500 mr-2" />
                        Ver estado de molinos
                      </li>
                    </>
                  )}
                  {role.value === 'GERENCIA' && (
                    <>
                      <li className="flex items-center text-sm">
                        <CheckCircle size={16} className="text-green-500 mr-2" />
                        Ver reportes y estadísticas
                      </li>
                      <li className="flex items-center text-sm">
                        <CheckCircle size={16} className="text-green-500 mr-2" />
                        Exportar datos
                      </li>
                      <li className="flex items-center text-sm">
                        <CheckCircle size={16} className="text-green-500 mr-2" />
                        Ver dashboard
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para crear/editar usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {modalMode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="input-field w-full"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input-field w-full"
                    placeholder="ejemplo@molino.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({...formData, rol: e.target.value as UserRole})}
                    className="input-field w-full"
                  >
                    <option value="OPERADOR">Operador</option>
                    <option value="GERENCIA">Gerencia</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                {modalMode === 'create' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="input-field w-full pr-10"
                          placeholder="Mínimo 6 caracteres"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirmar Contraseña
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        className="input-field w-full"
                        placeholder="Repite la contraseña"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Usuario activo
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                >
                  {modalMode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar contraseña */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Cambiar Contraseña
              </h2>
              <p className="text-gray-600 mb-6">
                Estás cambiando la contraseña de <strong>{selectedUser.nombre}</strong>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="input-field w-full pr-10"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="input-field w-full"
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePasswordChange}
                  className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-lg"
                >
                  Cambiar Contraseña
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para confirmar eliminación */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  ¿Eliminar usuario?
                </h2>
                <p className="text-gray-600 mb-6">
                  Estás a punto de eliminar a <strong>{selectedUser.nombre}</strong>. 
                  Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;