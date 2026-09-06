import React, { createContext, useContext } from 'react';
import type { TenantContext, UserRole } from '@fitcore/types';
import { useTenantStore } from '../store/tenantStore';

interface TenantContextValue {
  tenant: TenantContext;
  organisationId: string;
  organisationName: string;
  outletId?: string;
  outletName?: string;
  userId: string;
  role: UserRole;
  isDevSeed: boolean;
  setTenant: (tenant: TenantContext) => void;
  setOutlet: (outletId: string, outletName?: string) => void;
  setRole: (role: UserRole) => void;
}

const TenantReactContext = createContext<TenantContextValue | null>(null);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant, setTenant, setOutlet, setRole } = useTenantStore();

  const value: TenantContextValue = {
    tenant,
    organisationId: tenant.organisationId,
    organisationName: tenant.organisationName,
    outletId: tenant.outletId,
    outletName: tenant.outletName,
    userId: tenant.userId,
    role: tenant.role,
    isDevSeed: !!tenant.isDevSeed,
    setTenant,
    setOutlet,
    setRole,
  };

  return <TenantReactContext.Provider value={value}>{children}</TenantReactContext.Provider>;
};

export function useTenant(): TenantContextValue {
  const context = useContext(TenantReactContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
