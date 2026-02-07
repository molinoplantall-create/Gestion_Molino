import React from 'react';
import { FormModal } from '../ui/FormModal';
import { UserPlus, Edit, Settings } from 'lucide-react';

interface ClientFormData {
    nombre: string;
    contacto: string;
    telefono: string;
    email: string;
    ruc: string;
    direccion: string;
    zona: string;
    tipoCliente: string;
    observaciones: string;
}

interface ClientFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void | Promise<void>;
    formData: ClientFormData;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    zones: Array<{ id: string; name: string }>;
    isLoading?: boolean;
    isEditing?: boolean;
    onAddZone?: () => void;
    isAddingZone?: boolean;
    newZoneName?: string;
    onNewZoneNameChange?: (value: string) => void;
    onToggleAddZone?: () => void;
    onManageZones?: () => void;
    errors?: Record<string, string>;
}

export const ClientForm: React.FC<ClientFormProps> = ({
    isOpen,
    onClose,
    onSubmit,
    formData,
    onChange,
    zones,
    isLoading = false,
    isEditing = false,
    onAddZone,
    isAddingZone = false,
    newZoneName = '',
    onNewZoneNameChange,
    onToggleAddZone,
    onManageZones,
    errors = {}
}) => {
    const isValid = formData.nombre && formData.zona && formData.tipoCliente;

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onSubmit}
            title={isEditing ? 'Editar Cliente' : 'Registro de Nuevo Cliente'}
            icon={isEditing ? Edit : UserPlus}
            size="xl"
            submitLabel={isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}
            isLoading={isLoading}
            isValid={!!isValid}
        >
            <div className="space-y-6">
                {/* Información Básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nombre/Razón Social <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={onChange}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.nombre ? 'border-red-500 ring-red-100' : 'border-gray-300'}`}
                            placeholder="Ej: Minera Andina SA"
                            required
                        />
                        {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">RUC</label>
                        <input
                            type="text"
                            name="ruc"
                            value={formData.ruc}
                            onChange={onChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ej: 20123456789"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Contacto Principal</label>
                        <input
                            type="text"
                            name="contacto"
                            value={formData.contacto}
                            onChange={onChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ej: Juan Rodríguez"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                        <input
                            type="tel"
                            name="telefono"
                            value={formData.telefono}
                            onChange={onChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ej: 987654321"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={onChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="ejemplo@correo.com"
                        />
                    </div>

                    <div className="md:col-span-2 lg:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Dirección</label>
                        <input
                            type="text"
                            name="direccion"
                            value={formData.direccion}
                            onChange={onChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Dirección del cliente..."
                        />
                    </div>
                </div>

                {/* Detalles Adicionales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex justify-between items-center">
                            <span>Zona <span className="text-red-500">*</span></span>
                            <div className="flex space-x-2">
                                {!isEditing && onToggleAddZone && (
                                    <button
                                        type="button"
                                        onClick={onToggleAddZone}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                    >
                                        {isAddingZone ? 'Cancelar' : '+ Nueva'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onManageZones}
                                    className="text-xs text-slate-500 hover:text-indigo-600 flex items-center"
                                    title="Gestionar Zonas"
                                >
                                    <Settings size={14} className="mr-1" />
                                    Gestionar
                                </button>
                            </div>
                        </label>
                        {!isAddingZone || isEditing ? (
                            <select
                                name="zona"
                                value={formData.zona}
                                onChange={onChange}
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.zona ? 'border-red-500 ring-red-100' : 'border-gray-300'}`}
                                required
                            >
                                <option value="">Seleccionar zona</option>
                                {zones.map(z => (
                                    <option key={z.id} value={z.name}>{z.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newZoneName}
                                    onChange={(e) => onNewZoneNameChange?.(e.target.value)}
                                    placeholder="Nombre de zona"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={onAddZone}
                                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold"
                                >
                                    OK
                                </button>
                            </div>
                        )}
                        {errors.zona && <p className="text-xs text-red-500 mt-1">{errors.zona}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Tipo de Cliente <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="tipoCliente"
                            value={formData.tipoCliente}
                            onChange={onChange}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.tipoCliente ? 'border-red-500 ring-red-100' : 'border-gray-300'}`}
                            required
                        >
                            <option value="">Seleccionar tipo</option>
                            <option value="MINERO">Minero</option>
                            <option value="PALLAQUERO">Pallaquero</option>
                        </select>
                        {errors.tipoCliente && <p className="text-xs text-red-500 mt-1">{errors.tipoCliente}</p>}
                    </div>
                </div>

                {/* Observaciones */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
                    <textarea
                        name="observaciones"
                        value={formData.observaciones}
                        onChange={onChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        rows={3}
                        placeholder="Notas adicionales..."
                    />
                </div>
            </div>
        </FormModal>
    );
};
