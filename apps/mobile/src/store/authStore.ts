import { create } from 'zustand';
import type { UserRole } from '@fitcore/types';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  role: UserRole | null;
  isLoading: boolean;
  setSession: (userId: string, role: UserRole) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId: null,
  role: null,
  isLoading: false,
  setSession: (userId, role) => set({ isAuthenticated: true, userId, role, isLoading: false }),
  clearSession: () => set({ isAuthenticated: false, userId: null, role: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
