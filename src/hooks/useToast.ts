import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastStore {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],

    addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const newToast = { ...toast, id };

        set((state) => ({
            toasts: [...state.toasts, newToast]
        }));

        // Auto-remove después de la duración especificada
        const duration = toast.duration || 5000;
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id)
            }));
        }, duration);
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }));
    },

    clearAll: () => {
        set({ toasts: [] });
    }
}));

// Hook de conveniencia para usar toasts
export const useToast = () => {
    const { addToast } = useToastStore();

    return {
        success: (title: string, message?: string, duration?: number) =>
            addToast({ type: 'success', title, message, duration }),

        error: (title: string, message?: string, duration?: number) =>
            addToast({ type: 'error', title, message, duration }),

        warning: (title: string, message?: string, duration?: number) =>
            addToast({ type: 'warning', title, message, duration }),

        info: (title: string, message?: string, duration?: number) =>
            addToast({ type: 'info', title, message, duration })
    };
};
