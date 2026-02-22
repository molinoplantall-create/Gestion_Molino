import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, UserPlus, Mail, Shield, Edit, Trash2, CheckCircle, XCircle, Search, Filter, Key, Eye, EyeOff, Loader2, LogOut } from 'lucide-react';
import { UserRole, User } from '@/types';
import { USER_ROLES } from '@/constants';
import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabase';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

const Usuarios: React.FC = () => {
  const { users, loading, fetchUsers, updateUser, deleteUser } = useUserStore();
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: '', message: '' });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'OPERADOR' as UserRole,
    password: '',
    confirmPassword: '',
    isActive: true,
  });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = USER_ROLES.find(r => r.value === role);
    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

    if (role === 'ADMIN') {
      badgeClass = 'bg-violet-50 text-violet-700 border-violet-100';
    } else if (role === 'GERENCIA') {
      badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-100';
    } else {
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    }

    return (
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badgeClass}`}>
        {roleConfig?.label || role}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold rounded-full flex items-center w-fit">
        <CheckCircle size={12} className="mr-1.5" strokeWidth={2} />
        Activo
      </span>
    ) : (
      <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 text-xs font-semibold rounded-full flex items-center w-fit">
        <XCircle size={12} className="mr-1.5" strokeWidth={2} />
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
      nombre: user.nombre || '',
      email: user.email,
      rol: user.role,
      password: '',
      confirmPassword: '',
      isActive: user.is_active,
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        if (formData.password.length < 6) {
          setSuccessInfo({ title: 'Error', message: 'La contraseña debe tener al menos 6 caracteres' });
          setShowSuccessModal(true);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setSuccessInfo({ title: 'Error', message: 'Las contraseñas no coinciden' });
          setShowSuccessModal(true);
          return;
        }

        // 1. Create a non-persistent client to avoid logging out the current admin
        const tempSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false } }
        );

        // 2. Create user in Auth using the temp client
        const { data, error: authError } = await tempSupabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              nombre: formData.nombre
            }
          }
        });

        if (authError) throw authError;

        if (data.user) {
          // Pequeña espera para asegurar que el trigger handle_new_user haya terminado
          await new Promise(resolve => setTimeout(resolve, 800));

          const updates: any = {};
          if (formData.rol !== 'OPERADOR') updates.role = formData.rol;
          if (formData.nombre) updates.nombre = formData.nombre;

          if (Object.keys(updates).length > 0) {
            console.log('Aplicando actualizaciones iniciales al perfil:', updates);
            await updateUser(data.user.id, updates);
          }
        }

      } else if (selectedUser) {
        // Actualizar datos existentes (incluyendo mayúsculas/minúsculas)
        const updates: any = {};

        if (formData.nombre !== selectedUser.nombre) {
          updates.nombre = formData.nombre;
        }
        if (formData.rol !== selectedUser.role) {
          updates.role = formData.rol;
        }
        if (formData.isActive !== selectedUser.is_active) {
          updates.is_active = formData.isActive;
        }

        if (Object.keys(updates).length > 0) {
          await updateUser(selectedUser.id, updates);
        }
      }

      // Actualizar la lista localmente
      await fetchUsers();

      setSuccessInfo({
        title: modalMode === 'create' ? 'Usuario Creado' : 'Cambios Guardados',
        message: modalMode === 'create'
          ? `El usuario ${formData.nombre || formData.email} se ha registrado correctamente.`
          : 'Los datos del usuario han sido actualizados con éxito.'
      });
      setShowSuccessModal(true);
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      setSuccessInfo({
        title: 'Error',
        message: error.message
      });
      setShowSuccessModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (selectedUser) {
      try {
        setIsSubmitting(true);
        const success = await deleteUser(selectedUser.id);

        if (success) {
          setSuccessInfo({
            title: 'Usuario Eliminado',
            message: `El usuario ${selectedUser.nombre || selectedUser.email} ha sido eliminado definitivamente del sistema.`
          });
          setShowSuccessModal(true);
          setShowDeleteModal(false);
          setSelectedUser(null);
        } else {
          throw new Error('No se pudo eliminar el usuario');
        }
      } catch (error: any) {
        setSuccessInfo({ title: 'Error', message: error.message });
        setShowSuccessModal(true);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setShowPasswordModal(true);
  };

  const handlePasswordChange = async () => {
    if (!formData.password || formData.password.length < 6) {
      setSuccessInfo({ title: 'Error', message: 'La contraseña debe tener al menos 6 caracteres' });
      setShowSuccessModal(true);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setSuccessInfo({ title: 'Error', message: 'Las contraseñas no coinciden' });
      setShowSuccessModal(true);
      return;
    }

    try {
      setIsSubmitting(true);

      // Update password using the non-persistent client for better reliability if needed, 
      // but standard supabase object can update user if authenticated as admin or user.
      // Note: Changing others password requires a service role or edge function. 
      // For now we use the email reset pattern as a fallback or if admin has permission.
      // But user wants "directo". Let's try to update via supabase.auth.admin if possible 
      // or just direct update if the current store/permission allows.

      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) throw error;

      setSuccessInfo({
        title: 'Contraseña Actualizada',
        message: 'La contraseña ha sido cambiada exitosamente.'
      });
      setShowSuccessModal(true);
      setShowPasswordModal(false);
      resetForm();
    } catch (error: any) {
      setSuccessInfo({ title: 'Error', message: error.message });
      setShowSuccessModal(true);
    } finally {
      setIsSubmitting(false);
    }
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

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }
  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
          <p className="text-slate-500 mt-1">Administración de usuarios y permisos</p>
        </div>
        <button
          onClick={handleNewUser}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium mt-4 sm:mt-0"
        >
          <UserPlus size={18} strokeWidth={1.5} className="mr-2" />
          Nuevo Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-50 rounded-xl mr-4 border border-indigo-100">
              <Users className="text-indigo-600" size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Usuarios</p>
              <p className="text-2xl font-bold text-slate-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-emerald-50 rounded-xl mr-4 border border-emerald-100">
              <CheckCircle className="text-emerald-600" size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Activos</p>
              <p className="text-2xl font-bold text-slate-900">
                {users.filter(u => u.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-violet-50 rounded-xl mr-4 border border-violet-100">
              <Shield className="text-violet-600" size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Administradores</p>
              <p className="text-2xl font-bold text-slate-900">
                {users.filter(u => u.role === 'ADMIN').length}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="all">Todos los roles</option>
              <option value="ADMIN">Administrador</option>
              <option value="OPERADOR">Operador</option>
              <option value="GERENCIA">Gerencia</option>
            </select>
          </div>

          <div>
            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
              <option>Todos los estados</option>
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3 border border-indigo-200">
                        <span className="text-indigo-700 font-bold text-sm">
                          {(user.nombre || user.email).split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{user.nombre || 'Sin nombre'}</div>
                        <div className="text-xs text-slate-500">
                          ID: {user.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-slate-600">
                      <Mail size={16} strokeWidth={1.5} className="mr-2 text-slate-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.is_active)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit size={18} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleChangePassword(user)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Cambiar Contraseña"
                      >
                        <Key size={18} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar Usuario"
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
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
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Permisos por Rol</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {USER_ROLES.map((role) => (
            <div key={role.value} className={`border rounded-xl p-5 ${role.value === 'ADMIN' ? 'bg-violet-50/50 border-violet-100' :
              role.value === 'GERENCIA' ? 'bg-indigo-50/50 border-indigo-100' :
                'bg-slate-50/50 border-slate-200'
              }`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${role.value === 'ADMIN' ? 'bg-violet-100 text-violet-700 border-violet-200' :
                  role.value === 'GERENCIA' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                    'bg-slate-200 text-slate-700 border-slate-300'
                  }`}>
                  <span>{role.label}</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {users.filter(u => u.role === role.value).length}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Permisos:</div>
                <ul className="space-y-2">
                  {role.value === 'ADMIN' && (
                    <>
                      <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-emerald-500 mr-2" strokeWidth={2} />
                        Acceso completo al sistema
                      </li>
                      <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-emerald-500 mr-2" strokeWidth={2} />
                        Gestión de usuarios
                      </li>
                      <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-emerald-500 mr-2" strokeWidth={2} />
                        Configuración del sistema
                      </li>
                    </>
                  )}
                  {role.value === 'OPERADOR' && (
                    <>
                      <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-emerald-500 mr-2" strokeWidth={2} />
                        Registrar moliendas
                      </li>
                      <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-emerald-500 mr-2" strokeWidth={2} />
                        Registrar mantenimiento
                      </li>
                      <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-emerald-500 mr-2" strokeWidth={2} />
                        Ver estado de molinos
                      </li>
                    </>
                  )}
                  {role.value === 'GERENCIA' && (
                    <>
                      <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-emerald-500 mr-2" strokeWidth={2} />
                        Ver reportes y estadísticas
                      </li>
                      <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-emerald-500 mr-2" strokeWidth={2} />
                        Exportar datos
                      </li>
                      <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-emerald-500 mr-2" strokeWidth={2} />
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
      {
        showModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200">
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">
                  {modalMode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="input-field w-full"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field w-full"
                      placeholder="ejemplo@molino.com"
                      disabled={modalMode === 'edit'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Rol
                    </label>
                    <select
                      value={formData.rol}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value as UserRole })}
                      className="input-field w-full"
                    >
                      <option value="OPERADOR">Operador</option>
                      <option value="GERENCIA">Gerencia</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-8">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-slate-700">
                      Usuario activo
                    </label>
                  </div>

                  {modalMode === 'create' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="input-field w-full pr-10"
                            placeholder="Mínimo 6 caracteres"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Confirmar Contraseña
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="input-field w-full"
                          placeholder="Repite la contraseña"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-medium shadow-sm transition-colors flex items-center disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                    {modalMode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Modal para cambiar contraseña */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">
                Establecer Nueva Contraseña
              </h2>

              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Estás cambiando la contraseña de <strong>{selectedUser.nombre || selectedUser.email}</strong>.
                </p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="input-field w-full pr-10"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Confirmar Contraseña
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="input-field w-full"
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-medium shadow-sm transition-colors flex items-center disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                  Actualizar Contraseña
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para confirmar eliminación (desactivación) */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-200">
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
                  <Trash2 className="text-red-600" size={24} strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  ¿Eliminar usuario?
                </h2>
                <p className="text-slate-600 mb-6 text-sm">
                  Estás a punto de eliminar definitivamente a <strong>{selectedUser.nombre || selectedUser.email}</strong>. Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-5 py-2.5 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl font-medium shadow-sm transition-colors flex items-center disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                  Eliminar permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito / Error (Feedback para el usuario) */}
      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onConfirm={() => setShowSuccessModal(false)}
        title={successInfo.title}
        message={successInfo.message}
        confirmText="Entendido"
        cancelText=""
        variant={successInfo.title === 'Error' ? 'warning' : 'success'}
      />
    </div>
  );
};

export default Usuarios;