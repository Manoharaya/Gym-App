import { useAccessStore } from '../features/access/store/accessStore';
import type {
  MemberAccessStatusResponse,
  DynamicQRCredentialResponse,
  CheckIn,
} from '../features/access/types';

describe('Physical Access & Dynamic QR State (Day 7 Mobile)', () => {
  beforeEach(() => {
    useAccessStore.getState().clearAll();
  });

  it('1. Should initialize with default clean access state', () => {
    const state = useAccessStore.getState();
    expect(state.status).toBeNull();
    expect(state.activeVisit).toBeNull();
    expect(state.dynamicQR).toBeNull();
    expect(state.secondsRemaining).toBe(60);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('2. Should store member access status with authorized outlets', () => {
    const mockStatus: MemberAccessStatusResponse = {
      memberProfileId: 'mp_001',
      canAccessCurrentOutlet: true,
      currentOutlet: {
        id: 'outlet_perth_01',
        name: 'Second Wind Perth CBD',
        code: 'SW-PERTH-CBD',
      },
      activeMembership: {
        id: 'mm_001',
        planName: 'Second Wind Premium All-Access',
        status: 'ACTIVE',
        accessScope: 'ALL_ORGANISATION_OUTLETS',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-10-01T00:00:00.000Z',
      },
      authorizedOutlets: [
        {
          id: 'outlet_perth_01',
          name: 'Second Wind Perth CBD',
          code: 'SW-PERTH-CBD',
        },
        {
          id: 'outlet_freo_02',
          name: 'Second Wind Fremantle',
          code: 'SW-FREMANTLE',
        },
      ],
      userFacingMessage: 'Access Granted: Active Membership',
    };

    useAccessStore.getState().setStatus(mockStatus);

    const state = useAccessStore.getState();
    expect(state.status).not.toBeNull();
    expect(state.status?.canAccessCurrentOutlet).toBe(true);
    expect(state.status?.authorizedOutlets).toHaveLength(2);
    expect(state.status?.activeMembership?.planName).toBe('Second Wind Premium All-Access');
    expect(state.status!.authorizedOutlets[0]?.code).toBe('SW-PERTH-CBD');
  });

  it('3. Should track dynamic QR rotation and countdown timer', () => {
    const mockQR: DynamicQRCredentialResponse = {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_qr_token',
      displayIdentifier: 'QR-PASS-1234',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      refreshIntervalSeconds: 45,
    };

    useAccessStore.getState().setDynamicQR(mockQR);

    let state = useAccessStore.getState();
    expect(state.dynamicQR).not.toBeNull();
    expect(state.dynamicQR?.displayIdentifier).toBe('QR-PASS-1234');
    expect(state.secondsRemaining).toBe(45);

    // Decrement timer
    useAccessStore.getState().decrementTimer();
    state = useAccessStore.getState();
    expect(state.secondsRemaining).toBe(44);

    // Reset timer to custom interval
    useAccessStore.getState().resetTimer(60);
    state = useAccessStore.getState();
    expect(state.secondsRemaining).toBe(60);

    // Decrement cannot drop below 0
    useAccessStore.getState().resetTimer(0);
    useAccessStore.getState().decrementTimer();
    state = useAccessStore.getState();
    expect(state.secondsRemaining).toBe(0);
  });

  it('4. Should track active workout visit and duration calculation', () => {
    const checkedInAt = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 mins ago
    const mockVisit: CheckIn = {
      id: 'visit_001',
      organisationId: 'org_sw_01',
      outletId: 'outlet_perth_01',
      memberProfileId: 'mp_001',
      memberMembershipId: 'mm_001',
      status: 'SUCCESS',
      method: 'QR',
      source: 'MOBILE',
      checkedInAt,
      createdAt: checkedInAt,
      updatedAt: checkedInAt,
    };

    useAccessStore.getState().setActiveVisit(mockVisit);

    const state = useAccessStore.getState();
    expect(state.activeVisit).not.toBeNull();
    expect(state.activeVisit?.status).toBe('SUCCESS');
    expect(state.activeVisit?.outletId).toBe('outlet_perth_01');
    expect(state.activeVisit?.method).toBe('QR');
  });

  it('5. Should handle loading and error states properly', () => {
    useAccessStore.getState().setLoading(true);
    expect(useAccessStore.getState().isLoading).toBe(true);

    useAccessStore.getState().setError('Turnstile offline. Please see reception.');
    expect(useAccessStore.getState().error).toBe('Turnstile offline. Please see reception.');

    useAccessStore.getState().setLoading(false);
    expect(useAccessStore.getState().isLoading).toBe(false);
  });

  it('6. Should reset all state on clearAll', () => {
    useAccessStore.getState().setError('Some error');
    useAccessStore.getState().clearAll();

    const state = useAccessStore.getState();
    expect(state.error).toBeNull();
    expect(state.status).toBeNull();
    expect(state.activeVisit).toBeNull();
    expect(state.dynamicQR).toBeNull();
    expect(state.secondsRemaining).toBe(60);
  });
});
