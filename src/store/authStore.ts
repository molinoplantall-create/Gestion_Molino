import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types';

interface AuthStore {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({
            user: {
              id: session.user.id,
              email: session.user.email!,
              role: profile.role as UserRole,
              nombre: profile.nombre,
              is_active: profile.is_active,
              created_at: profile.created_at
            }
          });
        }
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            set({
              user: {
                id: session.user.id,
                email: session.user.email!,
                role: profile.role as UserRole,
                nombre: profile.nombre,
                is_active: profile.is_active,
                created_at: profile.created_at
              }
            });
          }
        } else if (event === 'SIGNED_OUT') {
          set({ user: null });
        }
      });

    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      set({ initialized: true, loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profile) throw new Error('No se encontró el perfil del usuario');
      if (!profile.is_active) throw new Error('Esta cuenta está deshabilitada');

      const userData: User = {
        id: data.user.id,
        email: data.user.email!,
        role: profile.role as UserRole,
        nombre: profile.nombre,
        is_active: profile.is_active,
        created_at: profile.created_at
      };

      set({ user: userData, loading: false });
      return { success: true };

    } catch (error: any) {
      console.error('Login error:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  setLoading: (loading) => set({ loading })
}));