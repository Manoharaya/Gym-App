/**
 * FitCore Business Intelligence & Unified Domain Analytics Types (Day 45)
 *
 * Establishes canonical contracts for the cross-domain Business Intelligence layer.
 * Authoritative FitCore domains remain the sole source of truth.
 *
 * Domains Covered:
 * - MEMBERSHIP
 * - SALES
 * - FINANCE
 * - ATTENDANCE
 * - BOOKING
 * - TRAINING
 * - NUTRITION
 * - DAILY_CHECKIN
 * - WEARABLES
 * - ENGAGEMENT
 * - RETENTION
 * - COMMUNICATION
 * - OPERATIONS
 * - AI
 */

export type BusinessMetricDomain =
  | 'MEMBERSHIP'
  | 'SALES'
  | 'FINANCE'
  | 'ATTENDANCE'
  | 'BOOKING'
  | 'TRAINING'
  | 'NUTRITION'
  | 'DAILY_CHECKIN'
  | 'WEARABLES'
  | 'ENGAGEMENT'
  | 'RETENTION'
  | 'COMMUNICATION'
  | 'OPERATIONS'
  | 'AI';

export type BusinessMetricUnit =
  | 'COUNT'
  | 'CURRENCY'
  | 'PERCENTAGE'
  | 'RATIO'
  | 'SECONDS'
  | 'MINUTES'
  | 'DAYS'
  | 'SCORE';

export type BusinessMetricAggregation =
  | 'SUM'
  | 'COUNT'
  | 'AVG'
  | 'RATIO'
  | 'LATEST'
  | 'DISTINCT_COUNT'
  | 'WEIGHTED_AVG';

export type BusinessTimeRange =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'LAST_QUARTER'
  | 'THIS_YEAR'
  | 'LAST_YEAR'
  | 'CUSTOM';

export type BusinessComparisonType =
  | 'PREVIOUS_PERIOD'
  | 'YEAR_OVER_YEAR'
  | 'QUARTER_OVER_QUARTER'
  | 'MONTH_OVER_MONTH'
  | 'CUSTOM';

export type BusinessTrendInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type BusinessKpiDirection = 'UP' | 'DOWN' | 'UNCHANGED' | 'NOT_COMPARABLE';

export type BusinessDataQualityRating =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INSUFFICIENT_DATA';

export type BusinessDataFreshness =
  | 'REAL_TIME'
  | 'RECENT'
  | 'DELAYED'
  | 'STALE'
  | 'UNKNOWN';

export type BusinessHealthStatus =
  | 'GOOD'
  | 'STABLE'
  | 'WATCH'
  | 'ATTENTION_REQUIRED'
  | 'INSUFFICIENT_DATA';

export interface BusinessMetricDefinition {
  key: string;
  domain: BusinessMetricDomain;
  name: string;
  description: string;
  source: string;
  aggregation: BusinessMetricAggregation;
  unit: BusinessMetricUnit;
  requiresCurrency?: boolean;
  supportsOutletScope: boolean;
  supportsOrganisationScope: boolean;
  supportsComparison: boolean;
  permissions: string[];
  dataQualityRequirements?: {
    minimumSampleThreshold?: number;
    requiresAuthoritativeReconciliation?: boolean;
    caveats?: string[];
  };
}

export interface BusinessKpi {
  key: string;
  label: string;
  currentValue: number | string;
  previousValue?: number | string;
  absoluteChange?: number;
  percentageChange?: number | null;
  direction: BusinessKpiDirection;
  unit: BusinessMetricUnit | string;
  currency?: string;
  period: {
    start: string;
    end: string;
    timezone: string;
  };
  dataQuality: BusinessDataQualityRating;
  caveat?: string;
}

export interface BusinessTrendPoint {
  date: string;
  value: number;
  comparisonValue?: number;
  dataQuality: BusinessDataQualityRating;
}

export interface BusinessTrendSeries {
  metricKey: string;
  domain: BusinessMetricDomain;
  interval: BusinessTrendInterval;
  unit: BusinessMetricUnit | string;
  currency?: string;
  points: BusinessTrendPoint[];
}

export interface BusinessPeriodComparison {
  metricKey: string;
  label: string;
  current: number;
  previous: number;
  difference: number;
  percentageDifference: number | null;
  direction: BusinessKpiDirection;
  dataQuality: BusinessDataQualityRating;
  currency?: string;
  unit: string;
  caveat?: string;
}

export interface BusinessHealthDimension {
  domain: BusinessMetricDomain;
  status: BusinessHealthStatus;
  score: number; // 0 - 100
  rationale: string;
  primaryMetric: {
    label: string;
    value: string | number;
  };
  benchmark?: string;
}

export interface BusinessHealthOverview {
  overallStatus: BusinessHealthStatus;
  overallScore: number;
  dimensions: Record<string, BusinessHealthDimension>;
  generatedAt: string;
}

export interface BusinessDeterministicInsight {
  id: string;
  domain: BusinessMetricDomain;
  metricKey: string;
  observation: string;
  evidence: string;
  direction: BusinessKpiDirection;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  generatedAt: string;
}

export interface BusinessAIInsightObservation {
  metric: string;
  value: string | number;
  comparison?: string;
  evidence: string;
}

export interface BusinessAIInsightRecommendation {
  recommendation: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface BusinessAIInsight {
  summary: string;
  observations: BusinessAIInsightObservation[];
  possibleExplanations?: string[];
  recommendations?: BusinessAIInsightRecommendation[];
  limitations?: string[];
  confidence: number;
  dataWindow?: string;
  currency?: string;
  isGrounded: boolean;
}

export interface BusinessDomainFreshness {
  domain: BusinessMetricDomain;
  freshness: BusinessDataFreshness;
  lastUpdated: string;
  updateFrequency: string;
  latencyMs?: number;
}

export interface BusinessDataQualityAssessment {
  domain: BusinessMetricDomain;
  rating: BusinessDataQualityRating;
  warnings: string[];
  sampleSize?: number;
  minimumSampleMet: boolean;
}

// -------------------------------------------------------------
// Domain Specific BI DTOs
// -------------------------------------------------------------

export interface MembershipBiDto {
  activeMembers: number;
  newMembers: number;
  returningMembers: number;
  reactivatedMembers: number;
  inactiveMembers: number;
  suspendedMembers: number;
  cancelledMembers: number;
  expiringMembers: number;
  netMemberChange: number; // New + Reactivated - Cancelled
  growthRate: number | null;
  planDistribution: Array<{
    planId: string;
    planName: string;
    activeCount: number;
    sharePercentage: number;
  }>;
  lifecycleDistribution: Record<string, number>;
  previousActiveMembers?: number;
  dataQuality: BusinessDataQualityRating;
}

export interface SalesBiFunnelStageDto {
  stage: 'LEADS' | 'CONTACTED' | 'QUALIFIED' | 'TRIAL_TOUR' | 'OFFERED' | 'CONVERTED';
  count: number;
  conversionFromPrevious: number | null;
  denominator: number;
}

export interface SalesBiDto {
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  highIntentLeads: number;
  openOpportunities: number;
  trials: number;
  tours: number;
  offers: number;
  conversions: number;
  lostOpportunities: number;
  conversionRate: number | null;
  conversionDenominator: number;
  responseRate: number | null;
  speedToLeadSeconds: number;
  pipelineValue: number;
  averageSalesCycleDays: number;
  funnel: SalesBiFunnelStageDto[];
  leadsBySource: Array<{ source: string; count: number; conversions: number; conversionRate: number | null }>;
  conversionsByOutlet: Array<{ outletId: string; outletName: string; count: number }>;
  conversionsByStaff: Array<{ staffId: string; staffName: string; leadsHandled: number; conversions: number; conversionRate: number | null }>;
  dataQuality: BusinessDataQualityRating;
  sampleSizeCaveat?: string;
}

export interface FinanceBiCurrencySummaryDto {
  currency: string;
  grossRevenueMinor: number;
  grossRevenue: number;
  refundsMinor: number;
  refunds: number;
  netRevenueMinor: number;
  netRevenue: number;
  membershipRevenueMinor: number;
  membershipRevenue: number;
  serviceRevenueMinor: number;
  serviceRevenue: number;
  paymentSuccessCount: number;
  paymentFailureCount: number;
  paymentSuccessRate: number | null;
  invoiceCount: number;
  outstandingBalanceMinor: number;
  outstandingBalance: number;
  overdueInvoicesCount: number;
  overdueInvoicesMinor: number;
  overdueInvoices: number;
  collectionRate: number | null;
  recoveryRate: number | null;
  accountingSyncStatus: 'SYNCED' | 'PENDING' | 'CONFLICTS' | 'NOT_CONFIGURED';
  reconciliationStatus: 'MATCHED' | 'DISCREPANCIES_DETECTED' | 'PENDING';
  revenueByOutlet: Array<{ outletId: string; outletName: string; netRevenue: number; sharePercentage: number }>;
  revenueByPlan: Array<{ planId: string; planName: string; netRevenue: number; sharePercentage: number }>;
  dataQuality: BusinessDataQualityRating;
}

export interface FinanceBiDto {
  currencies: Record<string, FinanceBiCurrencySummaryDto>;
  primaryCurrency: string;
  dataFreshness: BusinessDataFreshness;
  dataQuality: BusinessDataQualityRating;
  warnings: string[];
}

export interface AttendanceBiDto {
  totalVisits: number;
  uniqueActiveMembersVisiting: number;
  classAttendance: number;
  ptAttendance: number;
  walkIns: number;
  noShows: number;
  lateCheckIns: number;
  cancellationRate: number | null;
  attendanceFrequencyPerActiveMember: number | null;
  attendanceByOutlet: Array<{ outletId: string; outletName: string; totalVisits: number; uniqueVisitors: number }>;
  attendanceByClass: Array<{ classSessionId: string; className: string; attendeeCount: number; fillRate: number | null }>;
  attendanceByTrainer: Array<{ trainerId: string; trainerName: string; sessionCount: number; attendeeCount: number }>;
  dataQuality: BusinessDataQualityRating;
}

export interface BookingBiDto {
  bookingsCount: number;
  cancellationsCount: number;
  waitlistEntriesCount: number;
  waitlistPromotionsCount: number;
  bookingUtilisationRate: number | null;
  totalClassCapacity: number;
  averageClassFillRate: number | null;
  noShowRate: number | null;
  popularClasses: Array<{ className: string; bookings: number; fillRate: number | null }>;
  underutilisedClasses: Array<{ className: string; bookings: number; fillRate: number | null }>;
  dataQuality: BusinessDataQualityRating;
}

export interface TrainingBiDto {
  activeProgramsCount: number;
  scheduledWorkoutsCount: number;
  completedWorkoutsCount: number;
  workoutAdherenceRate: number | null;
  ptSessionsConducted: number;
  ptCompletionRate: number | null;
  activeGoalsCount: number;
  completedGoalsCount: number;
  personalRecordsCount: number;
  dataQuality: BusinessDataQualityRating;
}

export interface NutritionBiDto {
  loggingMembersCount: number;
  totalFoodLogsCount: number;
  activeMealPlansCount: number;
  trackingFrequencyPerLogger: number | null;
  dataQuality: BusinessDataQualityRating;
}

export interface DailyCheckInBiDto {
  totalCheckInsCount: number;
  participatingMembersCount: number;
  completionRate: number | null;
  readinessDistribution: {
    highReadinessPercentage: number;
    moderateReadinessPercentage: number;
    lowReadinessPercentage: number;
  };
  dataQuality: BusinessDataQualityRating;
}

export interface WearablesBiDto {
  totalConnectionsCount: number;
  activeConnectionsCount: number;
  connectionRatePercentage: number | null;
  syncActivityCount: number;
  dataQuality: BusinessDataQualityRating;
}

export interface EngagementBiDto {
  activeEngagedMembersCount: number;
  inactiveMembersCount: number;
  averageEngagementScore: number | null;
  totalEngagementEvents: number;
  habitCompletionRate: number | null;
  challengeParticipantsCount: number;
  dataQuality: BusinessDataQualityRating;
}

export interface RetentionBiDto {
  insufficientDataCount: number;
  lowRiskCount: number;
  moderateRiskCount: number;
  elevatedRiskCount: number;
  highRiskCount: number;
  retentionRiskPopulationTotal: number;
  followUpQueueCount: number;
  reactivationQueueCount: number;
  reengagedMembersCount: number;
  retentionRate: number | null;
  churnRate: number | null;
  dataQuality: BusinessDataQualityRating;
}

export interface CommunicationBiDto {
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  suppressedCount: number;
  optedOutCount: number;
  deliveryRate: number | null;
  responseRate: number | null;
  byChannel: Record<string, number>;
  dataQuality: BusinessDataQualityRating;
}

export interface AiBiDto {
  totalRequests: number;
  successRate: number | null;
  averageLatencyMs: number | null;
  receptionistConversationsCount: number;
  receptionistResolutionRate: number | null;
  receptionistHandoffsCount: number;
  salesConversationsCount: number;
  salesLeadsQualifiedCount: number;
  totalTokensUsed: number;
  estimatedCostUsd: number;
  dataQuality: BusinessDataQualityRating;
}

export interface OutletBiSummaryDto {
  outletId: string;
  outletName: string;
  code: string;
  activeMembers: number;
  newMembers: number;
  netRevenue: number;
  currency: string;
  totalVisits: number;
  averageClassFillRate: number | null;
  leadsCount: number;
  conversionsCount: number;
  conversionRate: number | null;
  retentionRiskCount: number;
}

export interface BusinessOverviewDto {
  period: {
    start: string;
    end: string;
    timezone: string;
    timeRange: BusinessTimeRange;
  };
  scope: {
    roleScope: 'PLATFORM' | 'ORGANISATION' | 'OUTLET';
    organisationId: string;
    outletId?: string;
  };
  kpis: Record<string, BusinessKpi>;
  health: BusinessHealthOverview;
  membership: MembershipBiDto;
  sales: SalesBiDto;
  finance: FinanceBiDto;
  attendance: AttendanceBiDto;
  bookings: BookingBiDto;
  training: TrainingBiDto;
  engagement: EngagementBiDto;
  retention: RetentionBiDto;
  communication: CommunicationBiDto;
  ai: AiBiDto;
  outlets?: OutletBiSummaryDto[];
  deterministicInsights: BusinessDeterministicInsight[];
  freshness: Record<string, BusinessDomainFreshness>;
  dataQualityWarnings: string[];
  generatedAt: string;
}

export interface BusinessDashboardPreferencesDto {
  defaultOutletId?: string | null;
  defaultDateRange: BusinessTimeRange;
  defaultCurrency: string;
  pinnedKpiKeys: string[];
  enabledDomains: BusinessMetricDomain[];
  layoutPreferences?: Record<string, any>;
  chartPreferences?: Record<string, any>;
}
