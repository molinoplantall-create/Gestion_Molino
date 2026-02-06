import { useState } from 'react';

interface UseModalReturn<T = any> {
    isOpen: boolean;
    data: T | null;
    open: (initialData?: T) => void;
    close: () => void;
    toggle: () => void;
}

/**
 * Hook personalizado para gestionar el estado de modales
 * @template T - Tipo de datos que el modal puede recibir
 */
export const useModal = <T = any>(): UseModalReturn<T> => {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<T | null>(null);

    const open = (initialData?: T) => {
        if (initialData !== undefined) {
            setData(initialData);
        }
        setIsOpen(true);
    };

    const close = () => {
        setIsOpen(false);
        // Limpiar datos después de la animación de cierre
        setTimeout(() => setData(null), 200);
    };

    const toggle = () => {
        setIsOpen(prev => !prev);
    };

    return { isOpen, data, open, close, toggle };
};
