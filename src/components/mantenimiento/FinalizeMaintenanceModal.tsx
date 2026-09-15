import React, { useState, useEffect } from 'react';
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
    const [workedHours, setWorkedHours] = useState<number | ''>(record?.worked_hours || 4);
    const [completedAt, setCompletedAt] = useState(new Date().toISOString().split('T')[0]);
    const [autoCalculated, setAutoCalculated] = useState(false);

    // FIX: antes esto siempre partía de un número fijo (4) que había que
    // recordar corregir a mano. Ahora, si la orden tiene fecha real de
    // inicio de falla (failure_start_time), se calculan las horas reales
    // transcurridas desde entonces -así un molino que lleva varios días
    // parado no se cierra con un número chico por accidente-. Se puede
    // seguir ajustando a mano si hace falta.
    useEffect(() => {
        if (isOpen && record) {
            if (record.failure_start_time) {
                const elapsedHours = (Date.now() - new Date(record.failure_start_time).getTime()) / (1000 * 3600);
                setWorkedHours(Math.max(1, Math.round(elapsedHours)));
                setAutoCalculated(true);
            } else {
                setWorkedHours(record.worked_hours || 4);
                setAutoCalculated(false);
            }
            setActionTaken('');
            setCompletedAt(new Date().toISOString().split('T')[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, record?.id]);

    const handleSubmit = () => {
        onConfirm({
            action_taken: actionTaken,
            worked_hours: workedHours === '' ? 0 : workedHours,
            completed_at: `${completedAt.split('T')[0]}T12:00:00`
        });
    };

    const isValid = actionTaken.trim().length > 0 && Number(workedHours) > 0;

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
                        {autoCalculated && (
                            <p className="text-[10px] text-indigo-500 font-bold mb-1.5 ml-1">
                                Calculado automáticamente desde que se reportó la falla. Puedes ajustarlo si hace falta.
                            </p>
                        )}
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="number"
                                value={workedHours}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    setWorkedHours(raw === '' ? '' : Number(raw));
                                    setAutoCalculated(false);
                                }}
                                onBlur={(e) => {
                                    if (!e.target.value || Number(e.target.value) < 1) setWorkedHours(1);
                                }}
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
