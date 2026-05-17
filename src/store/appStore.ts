import { create } from 'zustand';

interface Notification {
  id: string;
  tipo: 'MOLIENDA' | 'MANTENIMIENTO' | 'STOCK' | 'SISTEMA';
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: Date;
  link?: string;           // ← Nueva propiedad para navegación
}

interface AppStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'leida'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  removeFakeNotifications: () => void;   // ← Nueva función
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Empezamos sin notificaciones falsas
  notifications: [],

  addNotification: (notification) => set((state) => ({
    notifications: [
      {
        ...notification,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        leida: false,
      },
      ...state.notifications,
    ].slice(0, 20), // Máximo 20 notificaciones
  })),

  markNotificationAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, leida: true } : n
    ),
  })),

  clearAllNotifications: () => set({ notifications: [] }),

  // Función para limpiar cualquier notificación falsa que quede
  removeFakeNotifications: () => set({ notifications: [] }),
}));