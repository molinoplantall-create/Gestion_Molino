import React, { useState } from 'react';
import { FormModal } from '../ui/FormModal';
import { CheckCircle, Clock, Wrench } from 'lucide-react';

interface FinalizeMaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { action_taken: string, worked_hours: number, completed_at: string }) => void;
    record: any;
    isLoading?: boolean;
}

export const FinalizeMaintenanceModal: React.FC<FinalizeMaintenanceModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    record,
    isLoading = false
}) => {
    const [actionTaken, setActionTaken] = useState('');
    const [workedHours, setWorkedHours] = useState<number>(record?.worked_hours || 4);
    const [completedAt, setCompletedAt] = useState(new Date().toISOString().split('T')[0]);

    const handleSubmit = () => {
        onConfirm({
            action_taken: actionTaken,
            worked_hours: workedHours,
            completed_at: new Date(completedAt).toISOString()
        });
    };

    const isValid = actionTaken.trim().length > 0 && workedHours > 0;

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title="Finalizar Mantenimiento"
            icon={CheckCircle}
            submitLabel="Confirmar Cierre"
            isLoading={isLoading}
            isValid={isValid}
            size="md"
        >
            <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4">
                    <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">REGISTRO</p>
                    <p className="text-sm font-bold text-slate-700">{record?.mills?.name || 'Molino'} - {record?.description}</p>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                        Solución y Trabajo Realizado <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={actionTaken}
                        onChange={(e) => setActionTaken(e.target.value)}
                        placeholder="Describa cómo se solucionó, qué parte se cambió, etc."
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm min-h-[120px] resize-none"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                            Horas Trabajadas <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="number"
                                value={workedHours}
                                onChange={(e) => setWorkedHours(Number(e.target.value))}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
                                min="1"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                            Fecha de Cierre <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={completedAt}
                            onChange={(e) => setCompletedAt(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
                            required
                        />
                    </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-3 mt-2">
                    <Wrench className="text-amber-500 shrink-0" size={18} />
                    <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
                        Al confirmar, el molino volverá automáticamente a estado <span className="font-bold">LIBRE</span> y el registro se marcará como <span className="font-bold">COMPLETADO</span>.
                    </p>
                </div>
            </div>
        </FormModal>
    );
};
