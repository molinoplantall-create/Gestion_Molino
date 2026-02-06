import React from 'react';
import { BaseModal, ModalSize } from './BaseModal';
import { Loader2, LucideIcon } from 'lucide-react';

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
            <form onSubmit={handleSubmit}>
                {/* Header con ícono */}
                <div className="flex items-center gap-3 mb-6">
                    {Icon && (
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Icon className="w-6 h-6 text-indigo-600" />
                        </div>
                    )}
                    <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                </div>

                {/* Contenido del formulario */}
                <div className="space-y-4">
                    {children}
                </div>

                {/* Footer con botones */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !isValid}
                        className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {submitLabel}
                    </button>
                </div>
            </form>
        </BaseModal>
    );
};
