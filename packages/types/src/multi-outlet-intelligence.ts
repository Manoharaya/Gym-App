/**
 * FitCore Multi-Outlet Intelligence & Benchmarking Contracts (Day 46)
 *
 * Provides contracts for organisation-level cross-outlet performance evaluation,
 * normalised metrics, categorical leadership, multi-currency partitioning,
 * zero-denominator mathematical safety, and grounded AI management insights.
 */

import {
  BusinessMetricDomain,
  BusinessMetricUnit,
  BusinessDataQualityRating,
  BusinessKpiDirection,
  BusinessTimeRange,
  BusinessDataFreshness,
} from './business-intelligence';

export type OutletNormalisationMode =
  | 'ABSOLUTE'
  | 'PER_ACTIVE_MEMBER'
  | 'PER_LEAD'
  | 'PER_SESSION'
  | 'PERCENTAGE'
  | 'GROWTH_VS_BASELINE';

export type OutletHealthDimensionKey =
  | 'MEMBERSHIP'
  | 'SALES'
  | 'FINANCE'
  | 'ATTENDANCE'
  | 'BOOKING'
  | 'ENGAGEMENT'
  | 'RETENTION'
  | 'OPERATIONS';

export type OutletHealthStatus =
  | 'GOOD'
  | 'STABLE'
  | 'WATCH'
  | 'ATTENTION_REQUIRED'
  | 'INSUFFICIENT_DATA';

export type OutletAttentionFlag =
  | 'REVENUE_DECLINING'
  | 'MEMBERSHIP_DECLINING'
  | 'LEADS_DECLINING'
  | 'CONVERSION_DECLINING'
  | 'ATTENDANCE_DECLINING'
  | 'CLASS_UTILISATION_LOW'
  | 'PAYMENT_FAILURES_INCREASING'
  | 'OUTSTANDING_BALANCE_INCREASING'
  | 'ENGAGEMENT_DECLINING'
  | 'RETENTION_RISK_INCREASING'
  | 'DATA_QUALITY_LOW'
  | 'ACCOUNTING_SYNC_DELAYED';

export interface OutletMetricComparison {
  metricKey: string;
  metricLabel: string;
  domain: BusinessMetricDomain;
  outletId: string;
  outletName: string;
  outletCode?: string;

  absoluteValue: number;
  normalisedValue?: number;
  normalisedUnit?: string;

  denominator?: number;
  denominatorLabel?: string;

  unit: BusinessMetricUnit | string;
  currency?: string;

  previousValue?: number;
  percentageChange?: number | null;

  rank?: number;
  totalComparableOutlets?: number;
  percentile?: number;

  direction: BusinessKpiDirection;
  dataQuality: BusinessDataQualityRating;
  sampleSizeCaveat?: string;
}

export interface OutletCategoryLeaders {
  revenueLeader?: OutletMetricComparison;
  growthLeader?: OutletMetricComparison;
  salesLeader?: OutletMetricComparison;
  attendanceLeader?: OutletMetricComparison;
  classUtilisationLeader?: OutletMetricComparison;
  engagementLeader?: OutletMetricComparison;
  retentionWatch?: OutletMetricComparison;
}

export interface OutletHealthDimensionReport {
  dimension: OutletHealthDimensionKey;
  status: OutletHealthStatus;
  score: number; // 0 - 100
  reason: string;
  attentionFlags: OutletAttentionFlag[];
}

export interface OutletHealthReport {
  outletId: string;
  outletName: string;
  outletCode: string;
  overallStatus: OutletHealthStatus;
  overallScore: number;
  dimensions: Record<string, OutletHealthDimensionReport>;
  opportunities: string[];
  attentionFlags: OutletAttentionFlag[];
  generatedAt: string;
}

export interface OutletOverviewSummaryDto {
  outletId: string;
  outletName: string;
  code: string;
  currency: string;
  activeMembers: number;
  netMemberChange: number;
  memberGrowthRate: number | null;
  newLeads: number;
  conversionRate: number | null;
  conversionDenominator: number;
  grossRevenue: number;
  netRevenue: number;
  revenuePerActiveMember: number | null;
  totalVisits: number;
  visitsPerActiveMember: number | null;
  classFillRate: number | null;
  averageEngagementScore: number;
  highRiskRetentionCount: number;
  highRiskPercentage: number | null;
  healthStatus: OutletHealthStatus;
  attentionFlagsCount: number;
  dataQuality: BusinessDataQualityRating;
  freshness: BusinessDataFreshness;
}

export interface OutletBenchmarkSummaryDto {
  metricKey: string;
  domain: BusinessMetricDomain;
  unit: string;
  currency?: string;
  organisationAverage: number;
  organisationMedian: number;
  topQuartile: number;
  bottomQuartile: number;
  totalOutletsEvaluated: number;
  outlets: Array<{
    outletId: string;
    outletName: string;
    value: number;
    varianceFromAveragePct: number | null;
    rank: number;
  }>;
}

export interface OutletTrendPointDto {
  date: string;
  value: number;
  normalisedValue?: number;
  comparisonValue?: number;
}

export interface OutletTrendSeriesDto {
  outletId: string;
  outletName: string;
  metricKey: string;
  unit: string;
  currency?: string;
  points: OutletTrendPointDto[];
}

export interface MultiOutletAIInsightLeader {
  outletId: string;
  outletName: string;
  metric: string;
  value: string | number;
  evidence: string;
}

export interface MultiOutletAIInsightAttentionArea {
  outletId: string;
  outletName: string;
  issue: string;
  evidence: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MultiOutletAIInsightComparison {
  metric: string;
  outlets: string[];
  observation: string;
}

export interface MultiOutletAIInsightRecommendation {
  recommendation: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  targetOutletId?: string;
}

export interface MultiOutletAIInsight {
  summary: string;
  leaders?: MultiOutletAIInsightLeader[];
  attentionAreas?: MultiOutletAIInsightAttentionArea[];
  comparisons?: MultiOutletAIInsightComparison[];
  recommendations?: MultiOutletAIInsightRecommendation[];
  limitations?: string[];
  confidence: number;
  isGrounded: boolean;
}

export interface MultiOutletOverviewDto {
  organisationId: string;
  period: {
    start: string;
    end: string;
    timezone: string;
    timeRange: BusinessTimeRange;
  };
  isSingleOutlet: boolean;
  singleOutletStatus?: 'SINGLE_OUTLET';
  totalOutlets: number;
  activeComparableOutlets: number;
  currencies: string[];
  leaders: OutletCategoryLeaders;
  outlets: OutletOverviewSummaryDto[];
  currencyGroups: Record<string, {
    currency: string;
    outlets: OutletOverviewSummaryDto[];
    totalGrossRevenue: number;
    totalNetRevenue: number;
    averageRevenuePerMember: number | null;
  }>;
  unattributedRevenue: Record<string, {
    currency: string;
    grossRevenue: number;
    netRevenue: number;
    transactionCount: number;
  }>;
  healthOverview: Record<string, OutletHealthReport>;
  dataQualityRatings: Record<string, BusinessDataQualityRating>;
  generatedAt: string;
}
