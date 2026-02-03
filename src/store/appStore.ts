import { create } from 'zustand';

interface Notification {
  id: string;
  tipo: 'MOLIENDA' | 'MANTENIMIENTO' | 'STOCK' | 'SISTEMA';
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: Date;
}

interface AppStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'leida'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Inicialmente cerrado, se ajustará en el componente según el viewport
  sidebarOpen: false,
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // ... resto del código igual ...
}));