import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSupabaseStore } from '@/store/supabaseStore';

export function useAppInit() {
  const location = useLocation();
  const initialized = useRef(false);

  const {
    fetchMills,
    fetchAllClients,
    fetchZones,
    mills,
    allClients,
    zones
  } = useSupabaseStore();

  useEffect(() => {
    // Solo cargar datos maestros la primera vez o si realmente no hay datos
    if (!initialized.current) {
      if (mills.length === 0) fetchMills();
      if (allClients.length === 0) fetchAllClients();
      if (zones.length === 0) fetchZones();
      
      initialized.current = true;
    } 
    // En navegaciones posteriores, solo refrescar molinos si ya pasaron más de 30 segundos
    else if (mills.length === 0) {
      fetchMills();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Opcional: refresco suave cada 30 segundos solo de molinos
  useEffect(() => {
    const interval = setInterval(() => {
      if (mills.length > 0) {
        fetchMills();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [mills.length, fetchMills]);
}
