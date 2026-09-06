import { useTenantStore } from '../store/tenantStore';
import { DEV_SEED_TENANT } from '@fitcore/config';

describe('Tenant Context & Store Isolation', () => {
  beforeEach(() => {
    useTenantStore.getState().resetToDevSeed();
  });

  it('initializes with development seed tenant data', () => {
    const { tenant } = useTenantStore.getState();
    expect(tenant.organisationId).toBe(DEV_SEED_TENANT.organisationId);
    expect(tenant.organisationName).toBe('Second Wind Athletic Club');
    expect(tenant.isDevSeed).toBe(true);
  });

  it('allows dynamically switching active outlet', () => {
    const { setOutlet } = useTenantStore.getState();
    setOutlet('outlet_002', 'Fremantle');

    const updated = useTenantStore.getState().tenant;
    expect(updated.outletId).toBe('outlet_002');
    expect(updated.outletName).toBe('Fremantle');
  });

  it('supports completely replacing tenant context for new organisation onboarding', () => {
    const { setTenant } = useTenantStore.getState();
    setTenant({
      organisationId: 'org_apex_strength_099',
      organisationName: 'Apex Strength Club',
      outletId: 'outlet_apex_sydney',
      outletName: 'Sydney Central',
      userId: 'usr_owner_099',
      role: 'ORGANISATION_OWNER',
      isDevSeed: false,
    });

    const updated = useTenantStore.getState().tenant;
    expect(updated.organisationId).toBe('org_apex_strength_099');
    expect(updated.organisationName).toBe('Apex Strength Club');
    expect(updated.isDevSeed).toBe(false);
  });
});
