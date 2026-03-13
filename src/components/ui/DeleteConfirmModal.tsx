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
                {/* Ícono de advertencia con fondo suave */}
                <div className="mx-auto flex items-center justify-center w-20 h-20 bg-red-50 rounded-[2rem] mb-6 border border-red-100 shadow-inner">
                    <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>

                {/* Título estilo industrial */}
                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight uppercase">
                    {title}
                </h3>

                {/* Mensaje descriptivo */}
                <div className="text-slate-500 font-medium mb-8 text-sm leading-relaxed px-4">
                    {message || (
                        <>
                            ¿Estás seguro de que deseas eliminar{' '}
                            <span className="font-bold text-slate-900 border-b-2 border-red-200">{itemName}</span>?
                            <br />
                            <span className="inline-block mt-3 px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg">
                                Esta acción es irreversible
                            </span>
                        </>
                    )}
                </div>

                {/* Botones de acción premium */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full sm:flex-1 px-6 py-4 text-slate-400 bg-white border-2 border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-slate-600 hover:border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50 active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="w-full sm:flex-[1.5] px-6 py-4 text-white bg-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <AlertTriangle className="w-4 h-4" />
                        )}
                        Confirmar Eliminación
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
