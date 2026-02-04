import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types';

interface UserStore {
    users: User[];
    loading: boolean;
    error: string | null;

    fetchUsers: () => Promise<void>;
    updateUserRole: (id: string, role: UserRole) => Promise<boolean>;
    toggleUserStatus: (id: string, active: boolean) => Promise<boolean>;
    updateUserNombre: (id: string, nombre: string) => Promise<boolean>;
}

export const useUserStore = create<UserStore>((set, get) => ({
    users: [],
    loading: false,
    error: null,

    fetchUsers: async () => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            set({ users: data as User[], loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    updateUserRole: async (id, role) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ role })
                .eq('id', id);

            if (error) throw error;

            get().fetchUsers();
            return true;
        } catch (error: any) {
            console.error('Error updating role:', error);
            return false;
        }
    },

    toggleUserStatus: async (id, active) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ is_active: active })
                .eq('id', id);

            if (error) throw error;

            get().fetchUsers();
            return true;
        } catch (error: any) {
            console.error('Error toggling status:', error);
            return false;
        }
    },

    updateUserNombre: async (id, nombre) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ nombre })
                .eq('id', id);

            if (error) throw error;

            get().fetchUsers();
            return true;
        } catch (error: any) {
            console.error('Error updating name:', error);
            return false;
        }
    }
}));
