import React from 'react';
import { FormModal } from '../ui/FormModal';
import { Wrench } from 'lucide-react';

interface MaintenanceFormData {
    molinoId: string;
    tipo: 'PREVENTIVO' | 'CORRECTIVO';
    categoria: string;
    descripcion: string;
    prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    fechaProgramada: string;
    horasEstimadas: number;
    asignadoA: string;
}

interface MaintenanceFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void | Promise<void>;
    formData: MaintenanceFormData;
    onChange: (field: keyof MaintenanceFormData, value: any) => void;
    mills: any[];
    isLoading?: boolean;
    isEditing?: boolean;
    errors?: Record<string, string>;
}

export const MaintenanceForm: React.FC<MaintenanceFormProps> = ({
    isOpen,
    onClose,
    onSubmit,
    formData,
    onChange,
    mills,
    isLoading = false,
    isEditing = false,
    errors = {}
}) => {
    const isValid = formData.molinoId && formData.descripcion && formData.asignadoA;

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onSubmit}
            title={isEditing ? 'Editar Orden de Mantenimiento' : 'Nueva Orden de Mantenimiento'}
            icon={Wrench}
            size="lg"
            submitLabel={isEditing ? 'Actualizar' : 'Crear Orden'}
            isLoading={isLoading}
            isValid={!!isValid}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Molino */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Molino <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.molinoId}
                        onChange={(e) => onChange('molinoId', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    >
                        <option value="">Seleccionar molino</option>
                        {mills.map((mill) => (
                            <option key={mill.id} value={mill.id}>
                                {mill.name}
                            </option>
                        ))}
                    </select>
                    {errors.molinoId && <p className="text-xs text-red-500 mt-1">{errors.molinoId}</p>}
                </div>

                {/* Tipo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Mantenimiento <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.tipo}
                        onChange={(e) => onChange('tipo', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="PREVENTIVO">Preventivo</option>
                        <option value="CORRECTIVO">Correctivo</option>
                    </select>
                </div>

                {/* Prioridad */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prioridad
                    </label>
                    <select
                        value={formData.prioridad}
                        onChange={(e) => onChange('prioridad', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="BAJA">Baja</option>
                        <option value="MEDIA">Media</option>
                        <option value="ALTA">Alta</option>
                        <option value="CRITICA">Crítica</option>
                    </select>
                </div>

                {/* Horas Estimadas */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horas Estimadas
                    </label>
                    <input
                        type="number"
                        value={formData.horasEstimadas}
                        onChange={(e) => onChange('horasEstimadas', Number(e.target.value))}
                        min="1"
                        max="24"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Técnico Asignado */}
                <div className="md:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Técnico Asignado <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.asignadoA}
                        onChange={(e) => onChange('asignadoA', e.target.value)}
                        placeholder="Nombre del técnico"
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.asignadoA ? 'border-red-500 ring-red-100' : 'border-gray-300'}`}
                        required
                    />
                    {errors.asignadoA && <p className="text-xs text-red-500 mt-1">{errors.asignadoA}</p>}
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción del Problema <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={formData.descripcion}
                        onChange={(e) => onChange('descripcion', e.target.value)}
                        placeholder="Describa el problema o tarea de mantenimiento..."
                        rows={4}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${errors.descripcion ? 'border-red-500 ring-red-100' : 'border-gray-300'}`}
                        required
                    />
                    {errors.descripcion && <p className="text-xs text-red-500 mt-1">{errors.descripcion}</p>}
                </div>
            </div>
        </FormModal>
    );
};
