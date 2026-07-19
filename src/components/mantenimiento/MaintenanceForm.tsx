import React from 'react';
import { FormModal } from '../ui/FormModal';
import { Wrench, Plus, X } from 'lucide-react';

export interface MaintenanceFormData {
    molinoId: string;
    tipo: 'PREVENTIVO' | 'CORRECTIVO' | 'PREDICTIVO' | 'EMERGENCIA';
    categoria: string;
    descripcion: string;
    prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';
    fechaProgramada: string;
    horasEstimadas: number;
    asignadoA: string;
    cost_pen?: number;
    cost_usd?: number;
    labor_cost?: number;
    currency?: 'PEN' | 'USD';
    tasks_checklist?: { id: string, text: string, completed: boolean }[];
    action_taken?: string;
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
    const isIncidentMode = formData.tipo === 'CORRECTIVO' || formData.estado === 'COMPLETADO';
    const currency = formData.currency || 'PEN';
    const currencySymbol = currency === 'PEN' ? 'S/' : '$';

    const handleAddTask = () => {
        const newTask = { id: crypto.randomUUID(), text: '', completed: false };
        onChange('tasks_checklist', [...(formData.tasks_checklist || []), newTask]);
    };

    const handleRemoveTask = (id: string) => {
        onChange('tasks_checklist', (formData.tasks_checklist || []).filter(t => t.id !== id));
    };

    const handleUpdateTask = (id: string, text: string) => {
        onChange('tasks_checklist', (formData.tasks_checklist || []).map(t =>
            t.id === id ? { ...t, text } : t
        ));
    };

    const handleToggleTask = (id: string) => {
        onChange('tasks_checklist', (formData.tasks_checklist || []).map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        ));
    };

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Molino */}
                <div className="sm:col-span-1">
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
                <div className="sm:col-span-1">
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
                        <option value="PREDICTIVO">Predictivo</option>
                        <option value="EMERGENCIA">Emergencia (Rotura/Falla)</option>
                    </select>
                </div>

                {/* Prioridad */}
                <div className="sm:col-span-1">
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

                {/* Estado */}
                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estado
                    </label>
                    <select
                        value={formData.estado}
                        onChange={(e) => onChange('estado', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_PROCESO">En Proceso</option>
                        <option value="COMPLETADO">Realizado (Completado)</option>
                        <option value="CANCELADO">Cancelado</option>
                    </select>
                </div>

                {/* Horas Estimadas / Inoperativas */}
                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isIncidentMode ? 'Tiempo Inoperativo (Horas)' : 'Horas Estimadas'}
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

                {/* Fecha */}
                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isIncidentMode ? 'Fecha del Incidente / Intervención' : 'Fecha'} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={formData.fechaProgramada}
                        onChange={(e) => onChange('fechaProgramada', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.fechaProgramada ? 'border-red-500 ring-red-100' : 'border-gray-300'}`}
                        required
                    />
                    {errors.fechaProgramada && <p className="text-xs text-red-500 mt-1">{errors.fechaProgramada}</p>}
                </div>

                {/* Técnico Asignado */}
                <div className="sm:col-span-2 lg:col-span-3">
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
                <div className="sm:col-span-2 lg:col-span-3">
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

                {/* Evidencia / Diagnóstico (Solo en modo incidente) */}
                {isIncidentMode && (
                    <div className="sm:col-span-2 lg:col-span-3 pt-4 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Solución, Diagnóstico Acertado
                        </label>
                        <textarea
                            value={formData.action_taken || ''}
                            onChange={(e) => onChange('action_taken', e.target.value)}
                            placeholder="Ej. Se encontró el cardán interno roto por fatiga de material. Se procedió al cambio..."
                            rows={3}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none border-amber-200 bg-amber-50/30`}
                        />
                    </div>
                )}

                {/* Sección de Costos */}
                <div className="sm:col-span-2 lg:col-span-3 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Presupuesto y Costos (Opcional)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                        {/* Selector de moneda */}
                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
                            <select
                                value={currency}
                                onChange={(e) => onChange('currency', e.target.value as 'PEN' | 'USD')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="PEN">S/ — Soles (PEN)</option>
                                <option value="USD">$ — Dólares (USD)</option>
                            </select>
                        </div>

                        {/* Costo de materiales / insumos */}
                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Costo ({currencySymbol})</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold pointer-events-none">
                                    {currencySymbol}
                                </span>
                                <input
                                    type="number"
                                    value={currency === 'PEN' ? (formData.cost_pen || '') : (formData.cost_usd || '')}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (currency === 'PEN') {
                                            onChange('cost_pen', val);
                                        } else {
                                            onChange('cost_usd', val);
                                        }
                                    }}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Mano de Obra */}
                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mano de Obra ({currencySymbol})</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold pointer-events-none">
                                    {currencySymbol}
                                </span>
                                <input
                                    type="number"
                                    value={formData.labor_cost || ''}
                                    onChange={(e) => onChange('labor_cost', parseFloat(e.target.value))}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Checklist de Tareas */}
                <div className="sm:col-span-2 lg:col-span-3 pt-4 border-t border-gray-100">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {isIncidentMode ? 'Procedimiento / Repuestos Cambiados' : 'Procedimiento / Checklist'}
                        </h4>
                        <span className="text-[10px] text-indigo-500 font-medium italic hidden sm:inline">
                            (Ej: Cambio de rodamientos, Engrase, Inspección de motor...)
                        </span>
                        <button
                            type="button"
                            onClick={handleAddTask}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                            <Plus size={14} /> Agregar Tarea
                        </button>
                    </div>

                    <div className="space-y-2">
                        {(formData.tasks_checklist || []).length === 0 && (
                            <p className="text-xs text-gray-400 italic py-2 text-center bg-gray-50 rounded-lg border border-dashed">
                                No hay tareas añadidas al procedimiento
                            </p>
                        )}
                        {(formData.tasks_checklist || []).map((task) => (
                            <div key={task.id} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={task.completed}
                                    onChange={() => handleToggleTask(task.id)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 flex-shrink-0"
                                />
                                <input
                                    type="text"
                                    value={task.text}
                                    onChange={(e) => handleUpdateTask(task.id, e.target.value)}
                                    placeholder="Nombre de la tarea..."
                                    className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTask(task.id)}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </FormModal>
    );
};
