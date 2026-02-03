import React from 'react';
import Modal from './Modal';
import { AlertTriangle, LogOut, Trash2 } from 'lucide-react';

type ConfirmType = 'danger' | 'warning' | 'info';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    type?: ConfirmType;
    icon?: 'trash' | 'logout' | 'alert';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    showCancel = true,
    type = 'danger',
    icon = 'alert'
}) => {

    const getColors = () => {
        switch (type) {
            case 'danger': return 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-200';
            case 'warning': return 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border-orange-200';
            case 'info': return 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-200';
            default: return 'bg-gray-50 text-gray-600 hover:bg-gray-600 hover:text-white border-gray-200';
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'danger': return 'bg-red-600 hover:bg-red-700';
            case 'warning': return 'bg-orange-600 hover:bg-orange-700';
            case 'info': return 'bg-blue-600 hover:bg-blue-700';
            default: return 'bg-gray-900 hover:bg-gray-800';
        }
    };

    const renderIcon = () => {
        const className = `p-3 rounded-full ${type === 'danger' ? 'bg-red-100 text-red-600' : type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'} mb-4`;

        switch (icon) {
            case 'trash': return <div className={className}><Trash2 size={24} /></div>;
            case 'logout': return <div className={className}><LogOut size={24} /></div>;
            default: return <div className={className}><AlertTriangle size={24} /></div>;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" showCloseButton={false} width="max-w-sm">
            <div className="flex flex-col items-center text-center">
                {renderIcon()}

                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 mb-6">{message}</p>

                <div className="flex space-x-3 w-full">
                    {showCancel && (
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-4 py-2 text-white rounded-xl font-medium transition-colors ${getButtonColor()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;
