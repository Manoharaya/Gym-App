import { create } from 'zustand';

interface AppState {
  isOnline: boolean;
  isAppReady: boolean;
  themeMode: 'dark' | 'light';
  setOnline: (isOnline: boolean) => void;
  setAppReady: (isAppReady: boolean) => void;
  setThemeMode: (themeMode: 'dark' | 'light') => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  isAppReady: true,
  themeMode: 'dark',
  setOnline: (isOnline) => set({ isOnline }),
  setAppReady: (isAppReady) => set({ isAppReady }),
  setThemeMode: (themeMode) => set({ themeMode }),
}));
