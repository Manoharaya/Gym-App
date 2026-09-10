/**
 * FitCore — Day 42: Recurring Billing & Collections Shared Contracts
 */

export type BillingScheduleStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'EXPIRED';

export type BillingInterval =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUALLY'
  | 'ANNUALLY'
  | 'CUSTOM';

export type BillingCycleStatus =
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'INVOICED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'FAILED'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'SKIPPED';

export type PaymentAttemptStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REQUIRES_ACTION';

export type PaymentFailureCategory =
  | 'CARD_DECLINED'
  | 'INSUFFICIENT_FUNDS'
  | 'EXPIRED_PAYMENT_METHOD'
  | 'INVALID_PAYMENT_METHOD'
  | 'AUTHENTICATION_REQUIRED'
  | 'PROVIDER_ERROR'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'FRAUD_REVIEW'
  | 'CUSTOMER_ACTION_REQUIRED'
  | 'UNKNOWN';

export type DunningStatus =
  | 'OPEN'
  | 'RETRYING'
  | 'CUSTOMER_ACTION_REQUIRED'
  | 'PAYMENT_RECOVERED'
  | 'STAFF_REVIEW'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'EXPIRED';

export type DunningActionType =
  | 'PAYMENT_RETRY'
  | 'EMAIL_REMINDER'
  | 'SMS_REMINDER'
  | 'PUSH_REMINDER'
  | 'IN_APP_REMINDER'
  | 'WHATSAPP_REMINDER'
  | 'STAFF_TASK'
  | 'ESCALATE';

export type DunningResolutionType =
  | 'PAYMENT_RECOVERED'
  | 'PAYMENT_METHOD_UPDATED'
  | 'MANUAL_PAYMENT'
  | 'INVOICE_VOIDED'
  | 'INVOICE_ADJUSTED'
  | 'MEMBERSHIP_CANCELLED'
  | 'STAFF_RESOLVED'
  | 'CUSTOMER_DISPUTE'
  | 'OTHER';

export type CollectionTaskStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DISMISSED'
  | 'EXPIRED';

export type CollectionTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// ==========================================
// DTOs & Interfaces
// ==========================================

export interface CreateBillingScheduleDto {
  memberProfileId: string;
  memberMembershipId: string;
  membershipPlanId: string;
  originOutletId?: string;
  currency?: string;
  billingInterval: BillingInterval;
  intervalCount?: number;
  amountMinor: number;
  startDate?: string;
  endDate?: string;
  paymentMethodId?: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

export interface UpdateBillingScheduleDto {
  billingInterval?: BillingInterval;
  intervalCount?: number;
  amountMinor?: number;
  paymentMethodId?: string;
  endDate?: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

export interface BillingScheduleDto {
  id: string;
  organisationId: string;
  memberProfileId: string;
  memberMembershipId: string;
  membershipPlanId: string;
  originOutletId?: string | null;
  currency: string;
  billingInterval: BillingInterval;
  intervalCount: number;
  amountMinor: number;
  amount: number;
  nextBillingDate: string;
  status: BillingScheduleStatus;
  paymentMethodId?: string | null;
  startDate: string;
  endDate?: string | null;
  timezone: string;
  failureCount: number;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  memberProfile?: {
    id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  membershipPlan?: {
    id: string;
    name: string;
    code: string;
  };
  paymentMethod?: {
    id: string;
    type: string;
    brand?: string | null;
    last4?: string | null;
  } | null;
}

export interface BillingCycleDto {
  id: string;
  organisationId: string;
  billingScheduleId: string;
  memberProfileId: string;
  memberMembershipId: string;
  cycleNumber: number;
  periodStart: string;
  periodEnd: string;
  scheduledBillingDate: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  status: BillingCycleStatus;
  amountMinor: number;
  amount: number;
  currency: string;
  processedAt?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  paymentAttempts?: PaymentAttemptDto[];
}

export interface PaymentAttemptDto {
  id: string;
  organisationId: string;
  billingCycleId: string;
  invoiceId: string;
  paymentTransactionId?: string | null;
  attemptNumber: number;
  attemptedAt: string;
  status: PaymentAttemptStatus;
  failureCode?: string | null;
  failureCategory?: PaymentFailureCategory | null;
  providerReference?: string | null;
  nextRetryAt?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DunningStepDto {
  id: string;
  dunningCaseId: string;
  stepNumber: number;
  actionType: DunningActionType;
  scheduledAt: string;
  executedAt?: string | null;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'SKIPPED';
  result?: Record<string, any> | null;
  createdAt: string;
}

export interface DunningCaseDto {
  id: string;
  organisationId: string;
  billingCycleId: string;
  invoiceId: string;
  memberProfileId: string;
  status: DunningStatus;
  totalAttempts: number;
  nextActionAt?: string | null;
  escalatedAt?: string | null;
  resolvedAt?: string | null;
  resolutionType?: DunningResolutionType | null;
  resolutionNotes?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  steps?: DunningStepDto[];
  memberProfile?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export interface ResolveDunningDto {
  resolutionType: DunningResolutionType;
  notes?: string;
}

export interface BillingPolicyDto {
  id: string;
  organisationId: string;
  retryMaxAttempts: number;
  retryIntervalsDays: number[];
  gracePeriodDays: number;
  gracePeriodAccessAllowed: boolean;
  dunningAutoEscalateDays: number;
  dunningMaxPeriodDays: number;
  communicationChannels: string[];
  metadata?: Record<string, any> | null;
  updatedAt: string;
}

export interface UpdateBillingPolicyDto {
  retryMaxAttempts?: number;
  retryIntervalsDays?: number[];
  gracePeriodDays?: number;
  gracePeriodAccessAllowed?: boolean;
  dunningAutoEscalateDays?: number;
  dunningMaxPeriodDays?: number;
  communicationChannels?: string[];
}

export interface CollectionTaskDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  dunningCaseId?: string | null;
  memberProfileId: string;
  invoiceId: string;
  title: string;
  description: string;
  priority: CollectionTaskPriority;
  status: CollectionTaskStatus;
  assignedStaffId?: string | null;
  dueDate: string;
  completedAt?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignCollectionTaskDto {
  assignedStaffId: string;
}

export interface CollectionQueueItemDto {
  id: string;
  dunningCaseId?: string | null;
  memberProfileId: string;
  memberName: string;
  memberEmail?: string;
  memberPhone?: string;
  membershipPlanName: string;
  invoiceId: string;
  invoiceNumber: string;
  amountMinor: number;
  amount: number;
  currency: string;
  daysOverdue: number;
  failedAttempts: number;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  dunningStatus: DunningStatus;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  priority: CollectionTaskPriority;
  priorityScore: number;
  originOutletId?: string | null;
  outletName?: string;
}

export interface CollectionQueueSummaryDto {
  totalQueueCount: number;
  totalOutstandingMinor: number;
  totalOutstanding: number;
  currency: string;
  criticalCount: number;
  escalatedCount: number;
  items: CollectionQueueItemDto[];
}

export interface RecurringBillingMetricsDto {
  currency: string;
  activeSchedules: number;
  upcomingBillingMinor: number;
  upcomingBilling: number;
  recurringBilledMinor: number;
  recurringBilled: number;
  recurringCollectedMinor: number;
  recurringCollected: number;
  recurringFailedMinor: number;
  recurringFailed: number;
  recurringPaymentSuccessRate: number | null;
  retryRecoveryRate: number | null;
  dunningRecoveryRate: number | null;
  collectionRate: number | null;
  activeDunningCases: number;
  overdueInvoicesCount: number;
  overdueInvoicesAmountMinor: number;
  overdueInvoicesAmount: number;
}

export interface MemberBillingStatusDto {
  schedule?: BillingScheduleDto | null;
  statusText: string;
  nextBillingDate?: string | null;
  nextAmount?: number | null;
  currency?: string | null;
  paymentMethodMasked?: string | null;
  isActionRequired: boolean;
  actionType?: string | null;
  openInvoicesCount: number;
  overdueInvoicesCount: number;
}
