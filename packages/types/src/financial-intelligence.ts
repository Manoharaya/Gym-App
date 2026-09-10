/**
 * FitCore Financial Intelligence & Conversion Analytics Types
 *
 * Establishes standard types for cash-basis revenue visibility,
 * membership revenue, payment health, invoices, refunds, outlet attribution,
 * multi-currency partitioning, and reconciliation.
 */

export type FinancialTimeRange =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'LAST_QUARTER'
  | 'THIS_YEAR'
  | 'CUSTOM';

export type FinancialTransactionType =
  | 'MEMBERSHIP_PAYMENT'
  | 'MEMBERSHIP_RENEWAL'
  | 'MEMBERSHIP_UPGRADE'
  | 'MEMBERSHIP_DOWNGRADE'
  | 'PERSONAL_TRAINING'
  | 'CLASS'
  | 'RETAIL'
  | 'OTHER_SERVICE'
  | 'MANUAL_PAYMENT'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'OTHER';

export type FinancialPaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'REQUIRES_ACTION'
  | 'AUTHORIZED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'DISPUTED';

export type FinancialInvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'VOID'
  | 'UNCOLLECTIBLE';

export type FinancialDataQualityRating =
  | 'EXCELLENT'
  | 'GOOD'
  | 'ACCEPTABLE'
  | 'DEGRADED'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'NEEDS_ATTENTION';

export interface FinancialKpiCardDto {
  value: number;
  unit: string;
  previousValue?: number;
  changePercentage?: number | null;
  dataQuality?: string;
  formattedValue: string;
}

export interface CurrencyFinancialSummaryDto {
  currency: string;
  grossRevenueMinor: number;
  grossRevenue: number;
  refundsMinor: number;
  refunds: number;
  totalRefundsMinor?: number;
  totalRefunds?: number;
  refundRate?: number;
  netRevenueMinor: number;
  netRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  paymentSuccessRate: number | null;
  successRate?: number | null;
  outstandingInvoicesMinor: number;
  outstandingInvoices: number;
  outstandingBalanceMinor?: number;
  outstandingBalance?: number;
  overdueInvoicesCount: number;
  overdueInvoicesMinor: number;
  overdueInvoices: number;
  membershipRevenueMinor: number;
  membershipRevenue: number;
  averageTransactionValueMinor: number;
  averageTransactionValue: number;
}

export interface FinancialOverviewDto {
  period: {
    timeRange: FinancialTimeRange;
    startDate: string;
    endDate: string;
    timezone: string;
  };
  currencies: CurrencyFinancialSummaryDto[];
  kpis: Record<string, FinancialKpiCardDto>;
  comparison?: {
    previousStartDate: string;
    previousEndDate: string;
    changes: Record<string, number | null>;
  };
  dataQuality: {
    rating: FinancialDataQualityRating;
    score: number;
    notes: string[];
  };
  meta: {
    organisationId: string;
    outletId?: string;
    generatedAt: string;
    model: 'CASH_PAYMENT_BASED';
  };
}

export interface FinancialTrendPointDto {
  date: string;
  currency: string;
  grossRevenueMinor: number;
  grossRevenue: number;
  refundsMinor: number;
  refunds: number;
  netRevenueMinor: number;
  netRevenue: number;
  membershipRevenueMinor: number;
  membershipRevenue: number;
  paymentCount: number;
  successfulPaymentCount: number;
  failedPaymentCount: number;
}

export interface OutletFinancialPerformanceDto {
  outletId: string;
  outletName: string;
  currency: string;
  grossRevenueMinor: number;
  grossRevenue: number;
  refundsMinor: number;
  refunds: number;
  totalRefundsMinor?: number;
  totalRefunds?: number;
  netRevenueMinor: number;
  netRevenue: number;
  membershipRevenueMinor: number;
  membershipRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  outstandingInvoicesMinor: number;
  outstandingInvoices: number;
  paymentCount: number;
  averageTransactionValue: number;
  isUnattributed?: boolean;
}

export interface PlanFinancialPerformanceDto {
  planId: string;
  planName: string;
  planCode: string;
  currency: string;
  grossRevenueMinor: number;
  grossRevenue: number;
  refundsMinor: number;
  refunds: number;
  netRevenueMinor: number;
  netRevenue: number;
  transactionCount: number;
  activeSubscriptionsCount: number;
}

export interface FinancialTransactionDrillDownDto {
  id: string;
  transactionDate: string;
  amountMinor: number;
  amount: number;
  currency: string;
  status: FinancialPaymentStatus;
  type: FinancialTransactionType;
  paymentMethodType: string;
  memberId?: string;
  memberProfileId?: string;
  memberName?: string;
  memberEmail?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  membershipId?: string;
  planName?: string;
  outletId?: string;
  outletName?: string;
  source: string;
  refundedAmountMinor?: number;
}

export interface FinancialInvoiceSummaryDto {
  id: string;
  invoiceNumber: string;
  status: FinancialInvoiceStatus;
  dueDate: string;
  issuedAt: string;
  totalMinor: number;
  total: number;
  amountPaidMinor: number;
  amountPaid: number;
  amountDueMinor: number;
  amountDue: number;
  currency: string;
  memberId: string;
  memberName?: string;
  outletName?: string;
  isOverdue: boolean;
}

export interface FinancialRefundSummaryDto {
  id: string;
  paymentTransactionId: string;
  amountMinor: number;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
  processedAt?: string;
  requestedById?: string;
}

export interface FinancialReconciliationReportDto {
  reconciledAt: string;
  organisationId: string;
  currency: string;
  authoritativeTransactionCount: number;
  authoritativeGrossAmountMinor: number;
  projectedTransactionCount: number;
  projectedGrossAmountMinor: number;
  unprojectedTransactions: number;
  discrepancyCount: number;
  discrepancies: Array<{
    type: string;
    id: string;
    details: string;
    expected: any;
    actual: any;
  }>;
  status: 'IN_SYNC' | 'DISCREPANCIES_DETECTED';
}

export interface FinancialDataQualityDto {
  rating: FinancialDataQualityRating;
  overallScore: number;
  score?: number;
  unattributedTransactions?: number;
  negativeAmountsDetected?: number;
  overRefundsDetected?: number;
  metrics: {
    missingOutletCount: number;
    missingOutletPercentage: number;
    failedPaymentRate: number;
    overdueInvoiceRate: number;
    unprojectedTransactionCount: number;
  };
  recommendations: string[];
}

export interface FinancialMetricDefinitionDto {
  id: string;
  name: string;
  label: string;
  code?: string;
  formula: string;
  canonicalFormula?: string;
  description: string;
  limitations: string;
  sourceEntities: string[];
}

export interface FinancialContextDto {
  organisationId: string;
  period: string;
  currency: string;
  metrics?: {
    grossRevenue: number;
    netRevenue: number;
    totalRefunds: number;
    outstandingBalance: number;
  };
  integrityRating?: string;
  outlets?: Array<{ outletId: string; name: string; gross: number; net: number }>;
  revenueSummary: {
    gross: number;
    refunds: number;
    net: number;
    growthPercentage: number | null;
  };
  paymentHealth: {
    total: number;
    successful: number;
    failed: number;
    successRate: number | null;
  };
  invoiceHealth: {
    openCount: number;
    overdueCount: number;
    outstandingBalance: number;
  };
  topPlans: Array<{
    name: string;
    netRevenue: number;
    percentage: number;
  }>;
  outletPerformance: Array<{
    outletName: string;
    netRevenue: number;
    share: number;
  }>;
  dataFreshnessUtc: string;
}
