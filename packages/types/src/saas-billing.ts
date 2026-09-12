/**
 * DAY 55: FITCORE SAAS BILLING & ORGANISATION PLANS
 *
 * Types for commercial SaaS billing (FitCore -> Organisation).
 * Strictly isolated from Member Billing (Gym -> Member).
 */

export type SaasPlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'RETIRED';

export type SaasPlanVisibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';

export type SaasBillingInterval =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUALLY'
  | 'ANNUALLY'
  | 'CUSTOM';

export type SaasSubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'PAUSED'
  | 'SUSPENDED'
  | 'CANCEL_AT_PERIOD_END'
  | 'CANCELLED'
  | 'EXPIRED';

export type SaasInvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'VOID'
  | 'UNCOLLECTIBLE';

export type SaasInvoiceLineType =
  | 'BASE_PLAN'
  | 'METERED_USAGE'
  | 'OVERAGE'
  | 'ADD_ON'
  | 'DISCOUNT'
  | 'CREDIT'
  | 'TAX'
  | 'PRORATION'
  | 'ADJUSTMENT';

export type SaasEntitlementType =
  | 'BOOLEAN'
  | 'COUNT'
  | 'QUOTA'
  | 'METERED'
  | 'UNLIMITED';

export type SaasLimitCheckResult =
  | 'ALLOWED'
  | 'WARNING'
  | 'LIMIT_REACHED'
  | 'OVERAGE_ALLOWED'
  | 'OVERAGE_NOT_ALLOWED'
  | 'PLAN_REQUIRED'
  | 'UNKNOWN';

export type SaasBillingPeriodStatus =
  | 'OPEN'
  | 'FINALIZING'
  | 'INVOICED'
  | 'PAID'
  | 'PAST_DUE'
  | 'CLOSED'
  | 'CANCELLED';

export type SaasCreditTransactionType =
  | 'GRANTED'
  | 'APPLIED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'ADJUSTED';

export type SaasDiscountType =
  | 'PERCENTAGE'
  | 'FIXED_AMOUNT'
  | 'TRIAL'
  | 'PROMOTIONAL_CREDIT';

export type SaasReconciliationStatus =
  | 'MATCHED'
  | 'MISSING_PROVIDER'
  | 'MISSING_FITCORE'
  | 'AMOUNT_MISMATCH'
  | 'STATUS_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'DUPLICATE'
  | 'STALE'
  | 'CONFLICT'
  | 'UNRESOLVED'
  | 'RESOLVED';

export interface SaasPlanDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: SaasPlanStatus;
  visibility: SaasPlanVisibility;
  billingInterval: SaasBillingInterval;
  basePriceMinor: number;
  currency: string;
  trialDays: number;
  version: number;
  effectiveAt?: string;
  retiredAt?: string;
  createdAt: string;
  updatedAt: string;
  entitlements?: SaasPlanEntitlementDto[];
}

export interface SaasPlanVersionDto {
  id: string;
  planId: string;
  version: number;
  basePriceMinor: number;
  currency: string;
  billingInterval: SaasBillingInterval;
  trialDays: number;
  changeNotes?: string;
  effectiveAt: string;
  retiredAt?: string;
  createdAt: string;
}

export interface SaasEntitlementDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: SaasEntitlementType;
  meterKey?: string;
  category: string;
  isCustomizable: boolean;
  createdAt: string;
}

export interface SaasPlanEntitlementDto {
  id: string;
  planVersionId: string;
  entitlementId: string;
  entitlementCode: string;
  entitlementName: string;
  limitType: SaasEntitlementType;
  includedAllowance: number;
  overageAllowed: boolean;
  overageUnitMinor?: number;
  overageBatchSize: number;
  softLimitThresholdPercent: number;
}

export interface SaasSubscriptionDto {
  id: string;
  organisationId: string;
  planId: string;
  planVersionId: string;
  planName: string;
  planCode: string;
  status: SaasSubscriptionStatus;
  billingInterval: SaasBillingInterval;
  currency: string;
  baseAmountMinor: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  endedAt?: string;
  provider: string;
  providerCustomerReference?: string;
  providerSubscriptionReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaasBillingCustomerDto {
  id: string;
  organisationId: string;
  provider: string;
  externalCustomerReference: string;
  status: string;
  billingEmail: string;
  billingContactName?: string;
  billingAddress?: Record<string, any>;
  taxIdentifier?: string;
  country: string;
  currency: string;
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
  paymentMethodExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaasInvoiceLineDto {
  id: string;
  invoiceId: string;
  lineType: SaasInvoiceLineType;
  description: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  amountMinor: number;
  currency: string;
  meterKey?: string;
  periodStart?: string;
  periodEnd?: string;
  metadata?: Record<string, any>;
}

export interface SaasInvoiceDto {
  id: string;
  organisationId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  status: SaasInvoiceStatus;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  amountDueMinor: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  issuedAt: string;
  paidAt?: string;
  voidedAt?: string;
  lines: SaasInvoiceLineDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SaasUsageMeterDto {
  id: string;
  key: string;
  name: string;
  description?: string;
  unit: string;
  aggregationType: 'SUM' | 'MAX' | 'LAST';
  source: string;
  isActive: boolean;
}

export interface SaasUsageSummaryItemDto {
  meterKey: string;
  meterName: string;
  unit: string;
  currentUsage: number;
  includedAllowance: number;
  remainingAllowance: number;
  overageQuantity: number;
  overageUnitMinor: number;
  estimatedOverageChargeMinor: number;
  thresholdReachedPercent: number;
  limitStatus: SaasLimitCheckResult;
}

export interface SaasBillingOverviewDto {
  organisationId: string;
  subscription: SaasSubscriptionDto | null;
  billingCustomer: SaasBillingCustomerDto | null;
  currentPeriod: {
    periodStart: string;
    periodEnd: string;
    daysRemaining: number;
  };
  meters: SaasUsageSummaryItemDto[];
  estimatedCurrentChargesMinor: number;
  currency: string;
  creditBalanceMinor: number;
  openInvoicesCount: number;
  pastDueAmountMinor: number;
}

export interface SaasSuperadminMetricsDto {
  mrrByCurrency: Record<string, number>;
  arrByCurrency: Record<string, number>;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  cancelledSubscriptions: number;
  totalOrganisations: number;
  collectionRatePercent: number;
  planDistribution: Record<string, number>;
  overageRevenueMinor: number;
  failedPaymentsCount: number;
}

export interface SaasProrationResult {
  currentPlanCode: string;
  targetPlanCode: string;
  currency: string;
  daysRemainingInPeriod: number;
  totalDaysInPeriod: number;
  unearnedCurrentMinor: number;
  chargeNewMinor: number;
  netAdjustmentMinor: number;
  immediatePaymentRequired: boolean;
}
