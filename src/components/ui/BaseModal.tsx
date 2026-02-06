import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: ModalSize;
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEsc?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl'
};

export const BaseModal: React.FC<BaseModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEsc = true
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    // Manejar ESC para cerrar
    useEffect(() => {
        if (!isOpen || !closeOnEsc) return;

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, closeOnEsc, onClose]);

    // Focus trap y gestión de foco
    useEffect(() => {
        if (isOpen) {
            // Guardar elemento activo antes de abrir modal
            previousActiveElement.current = document.activeElement as HTMLElement;

            // Enfocar el modal
            modalRef.current?.focus();

            // Prevenir scroll del body
            document.body.style.overflow = 'hidden';
        } else {
            // Restaurar scroll
            document.body.style.overflow = '';

            // Restaurar foco al elemento anterior
            previousActiveElement.current?.focus();
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            <div
                ref={modalRef}
                className={`
          relative w-full ${sizeClasses[size]} 
          bg-white rounded-lg shadow-2xl
          animate-in zoom-in-95 duration-200
          max-h-[90vh] overflow-y-auto
        `}
                tabIndex={-1}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        {title && (
                            <h2 id="modal-title" className="text-xl font-semibold text-slate-900">
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                aria-label="Cerrar modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="px-6 py-4">
                    {children}
                </div>
            </div>
        </div>
    );
};
