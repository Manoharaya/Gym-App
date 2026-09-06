import { create } from 'zustand';
import type {
  MemberAccessStatusResponse,
  DynamicQRCredentialResponse,
  CheckIn,
} from '../types';

interface AccessState {
  status: MemberAccessStatusResponse | null;
  activeVisit: CheckIn | null;
  dynamicQR: DynamicQRCredentialResponse | null;
  secondsRemaining: number;
  isLoading: boolean;
  error: string | null;

  setStatus: (status: MemberAccessStatusResponse | null) => void;
  setActiveVisit: (visit: CheckIn | null) => void;
  setDynamicQR: (qr: DynamicQRCredentialResponse | null) => void;
  decrementTimer: () => void;
  resetTimer: (seconds?: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAll: () => void;
}

export const useAccessStore = create<AccessState>((set) => ({
  status: null,
  activeVisit: null,
  dynamicQR: null,
  secondsRemaining: 60,
  isLoading: false,
  error: null,

  setStatus: (status) => set({ status }),
  setActiveVisit: (activeVisit) => set({ activeVisit }),
  setDynamicQR: (dynamicQR) =>
    set({
      dynamicQR,
      secondsRemaining: dynamicQR?.refreshIntervalSeconds || 60,
    }),
  decrementTimer: () =>
    set((state) => ({
      secondsRemaining: Math.max(0, state.secondsRemaining - 1),
    })),
  resetTimer: (seconds = 60) => set({ secondsRemaining: seconds }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearAll: () =>
    set({
      status: null,
      activeVisit: null,
      dynamicQR: null,
      secondsRemaining: 60,
      isLoading: false,
      error: null,
    }),
}));
