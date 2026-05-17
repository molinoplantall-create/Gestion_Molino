import { useEffect } from 'react';
import { useSupabaseStore } from '@/store/supabaseStore';

export function useAppInit() {
  const {
    fetchMills,
    fetchAllClients,
    fetchZones,
    fetchClients,
    fetchMillingLogs,
    resetLoadingStates,
  } = useSupabaseStore();

  useEffect(() => {
    // Forzar reset de cualquier loading previo bloqueado
    resetLoadingStates();

    // Carga inicial completa
    fetchMills();
    fetchAllClients();
    fetchZones();
    fetchClients();
    fetchMillingLogs({ pageSize: 1000 });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
