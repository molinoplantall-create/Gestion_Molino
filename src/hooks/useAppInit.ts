import { useEffect } from 'react';
import { useSupabaseStore } from '@/store/supabaseStore';

export function useAppInit() {
  const {
    fetchMills,
    fetchAllClients,
    fetchZones,
  } = useSupabaseStore();

  useEffect(() => {
    fetchMills();
    fetchAllClients();
    fetchZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
