import React, { useState } from 'react';
import { Settings, Save, Trash2, X, Plus, Edit2 } from 'lucide-react';
import { BaseModal } from '../ui/BaseModal';
import { useSupabaseStore } from '../../store/supabaseStore';
import { useToast } from '../../hooks/useToast';
import { Zone } from '../../types';

interface ZoneManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ZoneManagerModal: React.FC<ZoneManagerModalProps> = ({ isOpen, onClose }) => {
    const { zones, updateZone, deleteZone, addZone, loading } = useSupabaseStore();
    const toast = useToast();
    const [editingZone, setEditingZone] = useState<Zone | null>(null);
    const [newName, setNewName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [addingName, setAddingName] = useState('');

    const handleUpdate = async () => {
        if (!editingZone || !newName.trim()) return;

        const success = await updateZone(editingZone.id, newName.trim());
        if (success) {
            toast.success('Zona Actualizada', 'La zona ha sido renombrada correctamente.');
            setEditingZone(null);
            setNewName('');
        } else {
            toast.error('Error', 'No se pudo actualizar la zona.');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar la zona "${name}"?`)) {
            const success = await deleteZone(id);
            if (success) {
                toast.success('Zona Eliminada', 'La zona ha sido eliminada del sistema.');
            } else {
                toast.error('Error', 'No se pudo eliminar la zona. Podría estar en uso.');
            }
        }
    };

    const handleAdd = async () => {
        if (!addingName.trim()) return;

        const success = await addZone(addingName.trim());
        if (success) {
            toast.success('Zona Agregada', 'Nueva zona registrada correctamente.');
            setAddingName('');
            setIsAdding(false);
        } else {
            toast.error('Error', 'No se pudo agregar la zona.');
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Gestionar Zonas de Procedencia"
            size="md"
        >
            <div className="space-y-6">
                {/* Agregar Nueva Zona */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {!isAdding ? (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
                        >
                            <Plus size={18} className="mr-2" />
                            Agregar Nueva Zona
                        </button>
                    ) : (
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={addingName}
                                onChange={(e) => setAddingName(e.target.value)}
                                placeholder="Nombre de la zona..."
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                autoFocus
                            />
                            <button
                                onClick={handleAdd}
                                disabled={loading || !addingName.trim()}
                                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Save size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    setIsAdding(false);
                                    setAddingName('');
                                }}
                                className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Lista de Zonas */}
                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                    {zones.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">No hay zonas registradas.</p>
                    ) : (
                        zones.map((zone) => (
                            <div
                                key={zone.id}
                                className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors group"
                            >
                                {editingZone?.id === zone.id ? (
                                    <div className="flex-1 flex space-x-2 mr-2">
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="flex-1 px-2 py-1 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleUpdate}
                                            className="text-emerald-600 hover:text-emerald-700"
                                        >
                                            <Save size={18} />
                                        </button>
                                        <button
                                            onClick={() => setEditingZone(null)}
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium text-slate-700">{zone.name}</span>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setEditingZone(zone);
                                                    setNewName(zone.name);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(zone.id, zone.name)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
