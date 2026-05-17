import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSupabaseStore } from '@/store/supabaseStore';

export function useAppInit() {
  const location = useLocation();
  const initialized = useRef(false);
  const [retryCount, setRetryCount] = useState(0);

  const {
    fetchMills,
    fetchAllClients,
    fetchZones,
    millsLoading,
    mills,
    error
  } = useSupabaseStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!initialized.current) {
          await Promise.allSettled([
            fetchMills(),
            fetchAllClients(),
            fetchZones()
          ]);
          initialized.current = true;
        } else if (mills.length === 0) {
          await fetchMills();
        }
      } catch (e) {
        console.error("Error en useAppInit", e);
      }
    };

    loadData();
  }, [location.key, retryCount]);

  // Botón de reintento manual (por si se queda colgado)
  const retry = () => setRetryCount(prev => prev + 1);

  return { retry };
}
