/**
 * FitCore Sales Intelligence & Conversion Analytics Contracts (Day 40)
 *
 * Read-oriented contracts providing multi-tenant, permission-aware sales intelligence
 * across leads, pipeline, AI interactions, follow-ups, and conversion outcomes.
 */

export type SalesTimeRange =
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

export type SalesDataQuality = 'COMPLETE_DATA' | 'PARTIAL_DATA' | 'INSUFFICIENT_DATA';

export type FunnelStageType =
  | 'LEAD'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'TRIAL'
  | 'TOUR_BOOKED'
  | 'OFFERED'
  | 'CONVERTED'
  | 'LOST';

export type SalesLeadSource =
  | 'WEBSITE'
  | 'PHONE'
  | 'WHATSAPP'
  | 'SOCIAL'
  | 'REFERRAL'
  | 'WALK_IN'
  | 'AD'
  | 'CAMPAIGN'
  | 'AI_RECEPTIONIST'
  | 'AI_SALES_AGENT'
  | 'STAFF'
  | 'IMPORT'
  | 'OTHER';

export type SalesIntelligenceChannel =
  | 'WEB'
  | 'WHATSAPP'
  | 'SMS'
  | 'EMAIL'
  | 'VOICE'
  | 'PHONE'
  | 'IN_APP'
  | 'OTHER';

export interface SalesFilterDto {
  timeRange?: SalesTimeRange;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  organisationId?: string;
  outletId?: string;
  staffId?: string;
  pipelineId?: string;
  source?: string;
  channel?: string;
  serviceInterest?: string;
  membershipInterest?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SalesKpiCardDto {
  key: string;
  label: string;
  value: number | string;
  comparisonValue?: number | string | null;
  absoluteChange?: number | null;
  percentageChange?: number | null;
  trend?: 'UP' | 'DOWN' | 'STABLE' | null;
  dataQuality: SalesDataQuality;
  unit?: string;
  definition?: string;
}

export interface SalesOverviewDto {
  kpis: {
    newLeads: SalesKpiCardDto;
    qualifiedLeads: SalesKpiCardDto;
    openOpportunities: SalesKpiCardDto;
    trials: SalesKpiCardDto;
    tours: SalesKpiCardDto;
    offers: SalesKpiCardDto;
    conversions: SalesKpiCardDto;
    conversionRate: SalesKpiCardDto;
    responseRate: SalesKpiCardDto;
    speedToLeadSeconds: SalesKpiCardDto;
    pipelineValue: SalesKpiCardDto;
    lostOpportunities: SalesKpiCardDto;
  };
  funnelSummary: SalesFunnelResponseDto;
  topSources: SalesSourcePerformanceDto[];
  topLossReasons: { reason: string; count: number; percentage: number }[];
  meta: {
    dateRange: string;
    startDate: string;
    endDate: string;
    timezone: string;
    generatedAt: string;
    freshness: string;
    organisationId: string;
    outletId?: string;
    isCached: boolean;
  };
}

export interface SalesFunnelStageDto {
  stage: FunnelStageType;
  name: string;
  count: number;
  percentage: number;
  conversionRate: number | null;
  dropOffRate: number | null;
  averageTimeInStageSeconds: number | null;
}

export interface SalesFunnelResponseDto {
  stages: SalesFunnelStageDto[];
  lostCount: number;
  totalLeads: number;
  overallConversionRate: number | null;
}

export interface SalesTrendPointDto {
  period: string; // YYYY-MM-DD or week/month label
  leads: number;
  qualifiedLeads: number;
  opportunities: number;
  trials: number;
  tours: number;
  conversions: number;
  responseRate: number | null;
}

export interface SalesSourcePerformanceDto {
  source: string;
  leads: number;
  qualifiedLeads: number;
  opportunities: number;
  trials: number;
  tours: number;
  conversions: number;
  conversionRate: number | null;
  dataQuality: SalesDataQuality;
}

export interface SalesChannelPerformanceDto {
  channel: string;
  leads: number;
  contacts: number;
  responses: number;
  bookedTrials: number;
  bookedTours: number;
  opportunities: number;
  conversions: number;
  followUps: number;
  deliveryRate: number | null;
  responseRate: number | null;
  dataQuality: SalesDataQuality;
}

export interface SalesStaffPerformanceDto {
  staffId: string;
  staffName: string;
  outletId?: string;
  outletName?: string;
  assignedLeads: number;
  contactedLeads: number;
  responseRate: number | null;
  qualifiedLeads: number;
  opportunities: number;
  trials: number;
  tours: number;
  offers: number;
  conversions: number;
  lostOpportunities: number;
  averageResponseTimeSeconds: number | null;
  openTasks: number;
  overdueTasks: number;
  dataQuality: SalesDataQuality;
}

export interface SalesOutletPerformanceDto {
  outletId: string;
  outletName: string;
  leads: number;
  qualifiedLeads: number;
  opportunities: number;
  trials: number;
  tours: number;
  offers: number;
  conversions: number;
  lostOpportunities: number;
  responseRate: number | null;
  conversionRate: number | null;
  pipelineValue: number;
  dataQuality: SalesDataQuality;
}

export interface SalesFollowUpPerformanceDto {
  sequencesStarted: number;
  sequencesCompleted: number;
  sequencesStopped: number;
  messagesScheduled: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesSuppressed: number;
  messagesFailed: number;
  responsesReceived: number;
  bookingsFollowingFollowUp: number;
  trialsFollowingFollowUp: number;
  toursFollowingFollowUp: number;
  conversionsFollowingFollowUp: number;
  followUpResponseRate: number | null;
  followUpBookingRate: number | null;
  followUpConversionFollowingRate: number | null;
  sequences: {
    sequenceId: string;
    sequenceName: string;
    sequenceType: string;
    enrollments: number;
    completed: number;
    stopped: number;
    responses: number;
    bookings: number;
    conversions: number;
  }[];
}

export interface SalesAiReceptionistMetricsDto {
  conversations: number;
  completed: number;
  abandoned: number;
  handoffs: number;
  bookingRequests: number;
  bookingsCreated: number;
  leadsCreated: number;
  qualificationEvents: number;
  followUpsTriggered: number;
  customerResponses: number;
  unresolved: number;
  conversationToLeadRate: number | null;
  conversationToBookingRate: number | null;
  conversationToHandoffRate: number | null;
}

export interface SalesAiSalesAgentMetricsDto {
  conversations: number;
  leadsHandled: number;
  qualificationExtractions: number;
  qualifiedLeads: number;
  recommendedNextSteps: number;
  trialRequests: number;
  tourRequests: number;
  humanHandoffs: number;
  followUpEnrollments: number;
  conversionsFollowingAi: number;
}

export interface SalesLossAnalyticsDto {
  lossesByReason: {
    reason: string;
    count: number;
    percentage: number;
  }[];
  totalLost: number;
}

export interface SalesObjectionAnalyticsDto {
  objectionsByType: {
    type: string;
    frequency: number;
    resolutionRate: number | null;
    progressionRate: number | null;
    conversionFollowingRate: number | null;
  }[];
  totalObjections: number;
}

export interface SalesPipelineVelocityDto {
  averageDaysInStage: Record<string, number | null>;
  medianDaysInStage: Record<string, number | null>;
  averageLeadToOpportunityDays: number | null;
  averageOpportunityToConversionDays: number | null;
  estimatedPipelineValue: number;
  convertedOpportunityValue: number;
  lostOpportunityValue: number;
}

export interface SalesDrillDownOpportunityDto {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  currentStage: string;
  ownerStaffId?: string;
  ownerStaffName?: string;
  outletId?: string;
  outletName?: string;
  estimatedValue: number;
  source?: string;
  createdAt: string;
  lastActivityAt: string;
  convertedAt?: string;
  lostAt?: string;
  lossReason?: string;
}

export interface SalesMetricDefinitionDto {
  name: string;
  displayName: string;
  description: string;
  formula: string;
  source: string;
  denominator: string;
  timeWindow: string;
  limitations: string;
}

export interface SalesAiInsightDto {
  summary: string;
  observations: string[];
  trends: string[];
  possible_explanations: string[];
  recommended_actions: string[];
  confidence: number;
  dataWindow: string;
  sourceMetrics: string[];
  limitations: string[];
}
