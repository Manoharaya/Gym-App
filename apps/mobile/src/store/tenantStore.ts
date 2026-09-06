import { create } from 'zustand';
import type { TenantContext, UserRole } from '@fitcore/types';
import { DEV_SEED_TENANT } from '@fitcore/config';

interface TenantState {
  tenant: TenantContext;
  setTenant: (tenant: TenantContext) => void;
  setOutlet: (outletId: string, outletName?: string) => void;
  setRole: (role: UserRole) => void;
  resetToDevSeed: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: DEV_SEED_TENANT,
  setTenant: (tenant) => set({ tenant }),
  setOutlet: (outletId, outletName) =>
    set((state) => ({
      tenant: {
        ...state.tenant,
        outletId,
        outletName: outletName ?? state.tenant.outletName,
      },
    })),
  setRole: (role) =>
    set((state) => ({
      tenant: {
        ...state.tenant,
        role,
      },
    })),
  resetToDevSeed: () => set({ tenant: DEV_SEED_TENANT }),
}));
