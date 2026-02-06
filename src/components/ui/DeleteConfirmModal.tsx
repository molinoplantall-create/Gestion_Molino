import React from 'react';
import { BaseModal } from './BaseModal';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title?: string;
    itemName: string;
    message?: string;
    isLoading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = '¿Confirmar eliminación?',
    itemName,
    message,
    isLoading = false
}) => {
    const handleConfirm = async () => {
        if (!isLoading) {
            await onConfirm();
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            closeOnOverlayClick={!isLoading}
            closeOnEsc={!isLoading}
        >
            <div className="text-center">
                {/* Ícono de advertencia */}
                <div className="mx-auto flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>

                {/* Título */}
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {title}
                </h3>

                {/* Mensaje */}
                <div className="text-slate-600 mb-6">
                    {message || (
                        <>
                            ¿Estás seguro de que deseas eliminar{' '}
                            <span className="font-semibold text-slate-900">{itemName}</span>?
                            <br />
                            Esta acción no se puede deshacer.
                        </>
                    )}
                </div>

                {/* Botones */}
                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Eliminar
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
