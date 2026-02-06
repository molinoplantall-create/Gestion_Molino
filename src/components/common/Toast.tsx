import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, Toast as ToastType } from '@/hooks/useToast';

const iconMap = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
};

const colorMap = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
};

const iconColorMap = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
};

interface ToastItemProps {
    toast: ToastType;
    onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
    const Icon = iconMap[toast.type];

    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, toast.duration || 5000);

        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onRemove]);

    return (
        <div
            className={`
        ${colorMap[toast.type]}
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        animate-in slide-in-from-right duration-300
        max-w-md w-full
      `}
            role="alert"
        >
            <Icon className={`w-5 h-5 ${iconColorMap[toast.type]} flex-shrink-0 mt-0.5`} />

            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                    {toast.title}
                </p>
                {toast.message && (
                    <p className="text-sm mt-1 opacity-90">
                        {toast.message}
                    </p>
                )}
            </div>

            <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 p-1 hover:bg-black/5 rounded transition-colors"
                aria-label="Cerrar notificación"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            <div className="flex flex-col gap-2 pointer-events-auto">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </div>
    );
};
