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

  notifications: [
    {
      id: '1',
      tipo: 'MANTENIMIENTO',
      titulo: 'Mantenimiento Preventivo',
      mensaje: 'El Molino III requiere cambio de aceite en 24 horas.',
      leida: false,
      createdAt: new Date()
    },
    {
      id: '2',
      tipo: 'STOCK',
      titulo: 'Stock Crítico',
      mensaje: 'El cliente Chemo tiene menos de 15 sacos en stock.',
      leida: false,
      createdAt: new Date(Date.now() - 3600000)
    },
    {
      id: '3',
      tipo: 'MOLIENDA',
      titulo: 'Molienda Finalizada',
      mensaje: 'Se completó el proceso de Soc. Camila en Molino I.',
      leida: true,
      createdAt: new Date(Date.now() - 7200000)
    }
  ],

  addNotification: (notification) => set((state) => ({
    notifications: [
      {
        ...notification,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        leida: false,
      },
      ...state.notifications,
    ],
  })),

  markNotificationAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, leida: true } : n
    ),
  })),

  clearAllNotifications: () => set({ notifications: [] }),
}));