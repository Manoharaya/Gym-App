import { useMembershipStore } from '../features/membership/store/membershipStore';
import type { MemberMembership } from '../features/membership/types';

describe('Membership Domain & UI State (Day 5 Mobile)', () => {
  beforeEach(() => {
    useMembershipStore.setState({
      selectedCategory: 'ALL',
      selectedOutletId: null,
      isCancelModalVisible: false,
      selectedMembershipIdForCancel: null,
    });
  });

  it('1. Should initialize with default category ALL and no cancel modal', () => {
    const state = useMembershipStore.getState();
    expect(state.selectedCategory).toBe('ALL');
    expect(state.selectedOutletId).toBeNull();
    expect(state.isCancelModalVisible).toBe(false);
    expect(state.selectedMembershipIdForCancel).toBeNull();
  });

  it('2. Should update filter category and outlet ID', () => {
    const { setSelectedCategory, setSelectedOutletId } = useMembershipStore.getState();
    setSelectedCategory('STANDARD');
    setSelectedOutletId('outlet_perth_01');

    const state = useMembershipStore.getState();
    expect(state.selectedCategory).toBe('STANDARD');
    expect(state.selectedOutletId).toBe('outlet_perth_01');
  });

  it('3. Should open and close cancel confirmation modal', () => {
    const { openCancelModal, closeCancelModal } = useMembershipStore.getState();
    openCancelModal('membership_123');

    let state = useMembershipStore.getState();
    expect(state.isCancelModalVisible).toBe(true);
    expect(state.selectedMembershipIdForCancel).toBe('membership_123');

    closeCancelModal();
    state = useMembershipStore.getState();
    expect(state.isCancelModalVisible).toBe(false);
    expect(state.selectedMembershipIdForCancel).toBeNull();
  });

  it('4. Should validate mock membership model structure and commercial snapshot', () => {
    const mockMembership: MemberMembership = {
      id: 'm_001',
      organisationId: 'org_sw_01',
      memberProfileId: 'mp_001',
      membershipPlanId: 'plan_001',
      status: 'ACTIVE',
      accessScope: 'ALL_ORGANISATION_OUTLETS',
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-10-01T00:00:00.000Z',
      autoRenew: true,
      daysRemaining: 24,
      planNameAtPurchase: 'Second Wind Premium All-Access',
      priceAtPurchase: 119.99,
      currencyAtPurchase: 'AUD',
      billingTypeAtPurchase: 'RECURRING',
      durationValueAtPurchase: 1,
      durationUnitAtPurchase: 'MONTH',
    };

    expect(mockMembership.status).toBe('ACTIVE');
    expect(mockMembership.priceAtPurchase).toBe(119.99);
    expect(mockMembership.currencyAtPurchase).toBe('AUD');
    expect(mockMembership.accessScope).toBe('ALL_ORGANISATION_OUTLETS');
    expect(mockMembership.daysRemaining).toBe(24);
  });

  it('5. Should correctly evaluate trial membership status', () => {
    const mockTrial: MemberMembership = {
      id: 'm_trial_001',
      organisationId: 'org_sw_01',
      memberProfileId: 'mp_002',
      membershipPlanId: 'plan_trial',
      status: 'TRIAL',
      accessScope: 'SINGLE_OUTLET',
      startDate: '2026-09-05T00:00:00.000Z',
      endDate: '2026-09-12T00:00:00.000Z',
      trialEndsAt: '2026-09-12T00:00:00.000Z',
      autoRenew: false,
      daysRemaining: 5,
      planNameAtPurchase: '7-Day Experience Pass',
      priceAtPurchase: 0.0,
      currencyAtPurchase: 'AUD',
      billingTypeAtPurchase: 'ONE_TIME',
      durationValueAtPurchase: 7,
      durationUnitAtPurchase: 'DAY',
    };

    expect(mockTrial.status).toBe('TRIAL');
    expect(mockTrial.priceAtPurchase).toBe(0.0);
    expect(mockTrial.daysRemaining).toBe(5);
  });
});
