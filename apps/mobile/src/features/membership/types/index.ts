/**
 * FitCore Membership & Subscriptions Types
 */

export type MembershipUIStatus =
  | 'ACTIVE'
  | 'TRIAL'
  | 'EXPIRING_SOON'
  | 'PAUSED'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'NO_MEMBERSHIP';

export type MembershipAccessScope =
  | 'SINGLE_OUTLET'
  | 'MULTI_OUTLET'
  | 'ALL_ORGANISATION_OUTLETS';

export interface MembershipEntitlement {
  id: string;
  type: string;
  name: string;
  description?: string;
  value?: number;
  metadata?: Record<string, any>;
}

export interface MembershipPlanOutlet {
  id: string;
  membershipPlanId: string;
  outletId: string;
  outlet?: {
    id: string;
    name: string;
    slug: string;
    code: string;
  };
}

export interface MembershipPlan {
  id: string;
  organisationId: string;
  name: string;
  description?: string;
  code: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  membershipType: string;
  billingType: 'ONE_TIME' | 'RECURRING';
  durationValue: number;
  durationUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  price: number;
  currency: string;
  trialDuration?: number;
  isPublic: boolean;
  requiresApproval: boolean;
  planOutlets?: MembershipPlanOutlet[];
  entitlements?: MembershipEntitlement[];
}

export interface MemberMembershipOutlet {
  id: string;
  memberMembershipId: string;
  outletId: string;
  outlet?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface MemberMembershipHistory {
  id: string;
  memberMembershipId: string;
  fromStatus?: string;
  toStatus: string;
  action: string;
  reason?: string;
  createdAt: string;
}

export interface MemberMembership {
  id: string;
  organisationId: string;
  memberProfileId: string;
  membershipPlanId: string;
  status: string;
  accessScope: MembershipAccessScope;
  originOutletId?: string;
  startDate: string;
  endDate: string;
  activatedAt?: string;
  pausedAt?: string;
  suspendedAt?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  autoRenew: boolean;
  trialEndsAt?: string;
  daysRemaining?: number;

  // Commercial Snapshot
  planNameAtPurchase: string;
  priceAtPurchase: number;
  currencyAtPurchase: string;
  billingTypeAtPurchase: string;
  durationValueAtPurchase: number;
  durationUnitAtPurchase: string;

  membershipPlan?: MembershipPlan;
  accessOutlets?: MemberMembershipOutlet[];
  history?: MemberMembershipHistory[];
}

export interface MembershipUIFilterState {
  selectedCategory: string;
  selectedOutletId: string | null;
}
