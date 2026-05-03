import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSupabaseStore } from '@/store/supabaseStore';

/**
 * Hook global que se ejecuta en la raíz de la aplicación (o Layout).
 * Escucha los cambios de ruta e invoca una sincronización pasiva
 * de los datos maestros para evitar "loading loops" y asegurar
 * que las vistas críticas siempre tengan datos recientes sin bloquear la UI.
 */
export function useAppInit() {
  const location = useLocation();
  const {
    fetchMills,
    fetchAllClients,
    fetchZones,
    mills,
    allClients,
    zones
  } = useSupabaseStore();

  useEffect(() => {
    // Evitar re-fetch inmediato si ya tenemos los datos básicos en el store,
    // o disparar la carga silenciosamente si faltan datos clave.
    // Esto previene que al navegar de Dashboard a Stock se disparen loaders enteros.
    
    // Disparar las peticiones maestras en background. Zustand ya las maneja con IDs
    // para evitar race conditions, y ahora con el timeout de 10s no se colgarán.
    
    // Solo forzamos fetch si no hay datos, o si estamos entrando a secciones clave
    if (mills.length === 0) fetchMills();
    if (allClients.length === 0) fetchAllClients();
    if (zones.length === 0) fetchZones();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]); 
}
