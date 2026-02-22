import React from 'react';
import { BaseModal } from './BaseModal';
import { AlertCircle, HelpCircle, Info, Loader2, CheckCircle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'danger' | 'warning' | 'success' | 'info';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'primary',
    isLoading = false,
    icon
}) => {
    const handleConfirm = async () => {
        if (!isLoading) {
            await onConfirm();
        }
    };

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    bg: 'bg-red-100',
                    iconColor: 'text-red-600',
                    button: 'bg-red-600 hover:bg-red-700',
                    defaultIcon: <AlertCircle className="w-6 h-6 text-red-600" />
                };
            case 'warning':
                return {
                    bg: 'bg-amber-100',
                    iconColor: 'text-amber-600',
                    button: 'bg-amber-600 hover:bg-amber-700',
                    defaultIcon: <AlertCircle className="w-6 h-6 text-amber-600" />
                };
            case 'success':
                return {
                    bg: 'bg-emerald-100',
                    iconColor: 'text-emerald-600',
                    button: 'bg-emerald-600 hover:bg-emerald-700',
                    defaultIcon: <CheckCircle className="w-6 h-6 text-emerald-600" />
                };
            case 'info':
                return {
                    bg: 'bg-blue-100',
                    iconColor: 'text-blue-600',
                    button: 'bg-blue-600 hover:bg-blue-700',
                    defaultIcon: <Info className="w-6 h-6 text-blue-600" />
                };
            default:
                return {
                    bg: 'bg-indigo-100',
                    iconColor: 'text-indigo-600',
                    button: 'bg-indigo-600 hover:bg-indigo-700',
                    defaultIcon: <HelpCircle className="w-6 h-6 text-indigo-600" />
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            closeOnOverlayClick={!isLoading}
            closeOnEsc={!isLoading}
        >
            <div className="text-center">
                {/* Ícono */}
                <div className={`mx-auto flex items-center justify-center w-12 h-12 ${styles.bg} rounded-full mb-4`}>
                    {icon || styles.defaultIcon}
                </div>

                {/* Título */}
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {title}
                </h3>

                {/* Mensaje */}
                <div className="text-sm text-slate-600 mb-6 px-2">
                    {message}
                </div>

                {/* Botones */}
                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2.5 text-sm font-bold text-white ${styles.button} rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2`}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
