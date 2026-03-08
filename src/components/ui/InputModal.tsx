import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { LucideIcon } from 'lucide-react';

interface InputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    message: string;
    icon?: LucideIcon;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'number' | 'text';
    min?: number;
}

export const InputModal: React.FC<InputModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    icon: Icon,
    defaultValue = '',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'text',
    min
}) => {
    const [value, setValue] = useState(defaultValue);

    // Reset value when modal opens
    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(value);
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
            <form onSubmit={handleSubmit} className="text-center p-2">
                {Icon && (
                    <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-indigo-600" />
                    </div>
                )}

                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 mb-6">{message}</p>

                <div className="mb-6 text-left">
                    <input
                        type={type}
                        min={min}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg font-bold"
                        required
                        autoFocus
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        {confirmText}
                    </button>
                </div>
            </form>
        </BaseModal>
    );
};
