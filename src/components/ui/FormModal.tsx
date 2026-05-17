import React from 'react';
import { BaseModal, ModalSize } from './BaseModal';
import { Loader2, LucideIcon, X } from 'lucide-react';

interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void | Promise<void>;
    title: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    size?: ModalSize;
    submitLabel?: string;
    cancelLabel?: string;
    isLoading?: boolean;
    isValid?: boolean;
}

export const FormModal: React.FC<FormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    title,
    icon: Icon,
    children,
    size = 'md',
    submitLabel = 'Guardar',
    cancelLabel = 'Cancelar',
    isLoading = false,
    isValid = true
}) => {
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoading && isValid) {
            await onSubmit();
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            size={size}
            closeOnOverlayClick={!isLoading}
            closeOnEsc={!isLoading}
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                {/* ── Header compacto ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                                <Icon className="w-5 h-5 text-indigo-600" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-base font-black text-slate-900 leading-tight">{title}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Complete los datos del formulario
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Cerrar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Contenido ── */}
                <div className="px-6 py-4 overflow-y-auto flex-1 custom-scrollbar">
                    {children}
                </div>

                {/* ── Footer con botones ── */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !isValid}
                        className="px-5 py-2 text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm shadow-indigo-200"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {submitLabel}
                    </button>
                </div>
            </form>
        </BaseModal>
    );
};
