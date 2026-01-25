import { create } from 'zustand';
import { Mill, MillingSession, MaintenanceLog, Notification } from '@/types';

interface AppState {
  // Data
  mills: Mill[];
  millingSessions: MillingSession[];
  maintenanceLogs: MaintenanceLog[];
  notifications: Notification[];
  
  // UI State
  sidebarOpen: boolean;
  activeModal: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setMills: (mills: Mill[]) => void;
  addMillingSession: (session: MillingSession) => void;
  updateMillingSession: (id: string, updates: Partial<MillingSession>) => void;
  addMaintenanceLog: (log: MaintenanceLog) => void;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (id: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveModal: (modal: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed
  getActiveMills: () => Mill[];
  getMillingStats: () => {
    totalSacos: number;
    activeSessions: number;
    completedToday: number;
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  mills: [
    { id: '1', nombre: 'Molino I', estado: 'OCUPADO', sacosProcesados: 1250, horasTrabajadas: 320, createdAt: new Date() },
    { id: '2', nombre: 'Molino II', estado: 'LIBRE', sacosProcesados: 980, horasTrabajadas: 280, createdAt: new Date() },
    { id: '3', nombre: 'Molino III', estado: 'MANTENIMIENTO', sacosProcesados: 890, horasTrabajadas: 310, createdAt: new Date() },
    { id: '4', nombre: 'Molino IV', estado: 'LIBRE', sacosProcesados: 1100, horasTrabajadas: 290, createdAt: new Date() },
  ],
  
  millingSessions: [],
  maintenanceLogs: [],
  notifications: [
    { id: '1', tipo: 'MOLIENDA', titulo: 'Molino I completado', mensaje: 'El molino I ha finalizado su proceso', leida: false, userId: '1', createdAt: new Date() },
    { id: '2', tipo: 'MANTENIMIENTO', titulo: 'Mantenimiento requerido', mensaje: 'Molino III requiere mantenimiento preventivo', leida: false, userId: '1', createdAt: new Date() },
  ],
  
  sidebarOpen: true,
  activeModal: null,
  isLoading: false,
  error: null,
  
  // Actions
  setMills: (mills) => set({ mills }),
  
  addMillingSession: (session) => 
    set((state) => ({ 
      millingSessions: [session, ...state.millingSessions] 
    })),
    
  updateMillingSession: (id, updates) =>
    set((state) => ({
      millingSessions: state.millingSessions.map(session =>
        session.id === id ? { ...session, ...updates } : session
      ),
    })),
    
  addMaintenanceLog: (log) =>
    set((state) => ({
      maintenanceLogs: [log, ...state.maintenanceLogs],
    })),
    
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),
    
  markNotificationAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map(notif =>
        notif.id === id ? { ...notif, leida: true } : notif
      ),
    })),
    
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveModal: (modal) => set({ activeModal: modal }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // Computed getters
  getActiveMills: () => {
    const state = get();
    return state.mills.filter(mill => mill.estado === 'OCUPADO');
  },
  
  getMillingStats: () => {
    const state = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const completedToday = state.millingSessions.filter(session => {
      const sessionDate = new Date(session.createdAt);
      sessionDate.setHours(0, 0, 0, 0);
      return session.estado === 'FINALIZADO' && sessionDate.getTime() === today.getTime();
    }).length;
    
    return {
      totalSacos: state.mills.reduce((sum, mill) => sum + mill.sacosProcesados, 0),
      activeSessions: state.millingSessions.filter(s => s.estado === 'EN_PROCESO').length,
      completedToday,
    };
  },
}));