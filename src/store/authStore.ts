import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  email: string;
  role: 'admin' | 'operator';
  nombre?: string;
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      
      login: async (email: string, password: string) => {
        set({ loading: true });
        
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('Intento de login con:', email, password);
        
        // Credenciales hardcodeadas
        const validCredentials = [
          { email: 'admin@molino.com', password: 'admin123', role: 'admin' as const },
          { email: 'operador@molino.com', password: 'operador123', role: 'operator' as const }
        ];

        const userCredential = validCredentials.find(
          cred => cred.email === email && cred.password === password
        );

        console.log('Credencial encontrada:', userCredential);

        if (userCredential) {
          const userData: User = {
            email: userCredential.email,
            role: userCredential.role,
            nombre: userCredential.email.split('@')[0]
          };
          
          console.log('Usuario logueado:', userData);
          set({ user: userData, loading: false });
          return true;
        }

        console.log('Credenciales incorrectas');
        set({ loading: false });
        return false;
      },
      
      logout: () => {
        console.log('Cerrando sesión');
        set({ user: null });
      },
      
      setLoading: (loading: boolean) => {
        set({ loading });
      }
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoading(false);
        }
      }
    }
  )
);