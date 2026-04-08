import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook para ejecutar un callback cada vez que una página se enfoca (navegación hacia ella).
 * Soluciona el problema de los useEffect con dependencias estables de Zustand 
 * que no se re-ejecutan al navegar entre rutas.
 * 
 * @param callback Función a ejecutar al enfocar la página.
 */
export function usePageFocus(callback: () => void) {
  const location = useLocation();

  useEffect(() => {
    callback();
    // location.key cambia de manera única en cada evento de navegación
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
}
