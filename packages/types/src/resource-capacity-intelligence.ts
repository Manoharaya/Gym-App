import {
  BusinessKpiDirection,
  BusinessDataQualityRating,
  BusinessDataFreshness,
  BusinessMetricDomain,
  BusinessMetricUnit,
} from './business-intelligence';
import { ResourceType as BaseResourceType } from './entities';

export type ResourceIntelligenceType =
  | BaseResourceType
  | 'ROOM'
  | 'STUDIO'
  | 'EQUIPMENT'
  | 'TRAINING_AREA'
  | 'COURT'
  | 'FIELD'
  | 'POOL'
  | 'CLASS_SPACE'
  | 'OTHER';

export type ResourceStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'MAINTENANCE'
  | 'DISABLED'
  | 'RETIRED';

export type CapacityType =
  | 'PHYSICAL_CAPACITY'
  | 'STAFF_CAPACITY'
  | 'CLASS_CAPACITY'
  | 'SESSION_CAPACITY'
  | 'EQUIPMENT_CAPACITY'
  | 'BOOKING_CAPACITY';

export type UtilisationType =
  | 'TIME_UTILISATION'
  | 'CAPACITY_UTILISATION'
  | 'BOOKING_UTILISATION'
  | 'ATTENDANCE_UTILISATION';

export type PeakDemandLevel =
  | 'VERY_LOW'
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'VERY_HIGH';

export type BottleneckType =
  | 'TRAINER_CAPACITY_LIMIT'
  | 'ROOM_CAPACITY_LIMIT'
  | 'CLASS_CAPACITY_LIMIT'
  | 'EQUIPMENT_CAPACITY_LIMIT'
  | 'WAITLIST_PRESSURE'
  | 'PEAK_TIME_CONGESTION'
  | 'RESOURCE_CONFLICT'
  | 'SCHEDULING_GAP'
  | 'LOW_RESOURCE_UTILISATION';

export type BottleneckSeverity =
  | 'INFO'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'INSUFFICIENT_DATA';

export type ResourceHealthDimensionKey =
  | 'UTILISATION'
  | 'CAPACITY'
  | 'DEMAND'
  | 'AVAILABILITY'
  | 'CONFLICTS'
  | 'DATA_QUALITY';

export type ResourceHealthStatus =
  | 'GOOD'
  | 'STABLE'
  | 'WATCH'
  | 'ATTENTION_REQUIRED'
  | 'INSUFFICIENT_DATA';

export type ResourceTrendDirection =
  | 'IMPROVING'
  | 'STABLE'
  | 'DECLINING'
  | 'INCREASING_DEMAND'
  | 'DECREASING_DEMAND'
  | 'INSUFFICIENT_DATA';

export interface ResourceSummaryDto {
  id: string;
  organisationId: string;
  outletId: string;
  outletName?: string;
  name: string;
  code?: string;
  type: ResourceIntelligenceType;
  status: ResourceStatus;
  capacity: number;
  bookable: boolean;
  description?: string;
  location?: string;
  availableFrom?: string;
  availableUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceMetricValue {
  metricKey: string;
  metricLabel: string;
  domain: BusinessMetricDomain | 'RESOURCES';
  value: number | null;
  unit: BusinessMetricUnit | string;
  numerator: number;
  denominator: number;
  sampleSize: number;
  timeRange: string;
  direction?: BusinessKpiDirection;
  dataQuality: BusinessDataQualityRating;
  freshness: BusinessDataFreshness;
  sampleSizeCaveat?: string;
}

export interface ResourceUtilisationDto {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceIntelligenceType;
  outletId: string;
  outletName?: string;
  timeUtilisation: number | null; // % of available hours booked
  capacityUtilisation: number | null; // % of theoretical capacity booked
  bookingUtilisation: number | null; // confirmed bookings / session capacity
  attendanceUtilisation: number | null; // checked in / session capacity
  availableHours: number;
  bookedHours: number;
  totalCapacity: number;
  occupiedCapacity: number;
  totalBookings: number;
  totalCheckedIn: number;
  sessionsCount: number;
  sampleSize: number;
  dataQuality: BusinessDataQualityRating;
  sampleSizeCaveat?: string;
}

export interface TrainerCapacityDto {
  trainerId: string;
  trainerName: string;
  staffProfileId?: string;
  outletId?: string;
  outletName?: string;
  availableHours: number;
  scheduledHours: number;
  bookedHours: number;
  completedHours: number;
  cancelledHours: number;
  noShowHours: number;
  ptBookedHours: number;
  classBookedHours: number;
  ptUtilisation: number | null;
  groupClassUtilisation: number | null;
  combinedUtilisation: number | null;
  peakDemandPeriods: string[];
  scheduleGapsCount: number;
  activeClientsCount: number;
  sampleSize: number;
  dataQuality: BusinessDataQualityRating;
  sampleSizeCaveat?: string;
}

export interface RoomCapacityDto {
  roomId: string;
  roomName: string;
  roomType: ResourceIntelligenceType;
  outletId: string;
  outletName?: string;
  configuredCapacity: number;
  availableHours: number;
  bookedHours: number;
  actualUtilisedHours: number;
  roomUtilisation: number | null;
  sessionsCount: number;
  totalAttendees: number;
  averageMembersPerSession: number | null;
  peakHours: string[];
  underutilisedSlotsCount: number;
  overCapacityAttempts: number;
  dataQuality: BusinessDataQualityRating;
}

export interface ClassCapacityDto {
  classSessionId: string;
  className: string;
  classTypeId: string;
  classTypeName?: string;
  resourceId?: string;
  resourceName?: string;
  trainerId?: string;
  trainerName?: string;
  outletId: string;
  outletName?: string;
  startsAt: string;
  endsAt: string;
  configuredCapacity: number;
  confirmedBookingsCount: number;
  availableSeatsCount: number;
  checkedInMembersCount: number;
  noShowsCount: number;
  waitlistCount: number;
  fillRate: number | null; // confirmedBookings / configuredCapacity * 100
  attendanceUtilisation: number | null; // checkedInMembers / configuredCapacity * 100
  noShowRate: number | null;
  waitlistPressure: 'NONE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  isUnderfilled: boolean;
  isFull: boolean;
  sampleSize: number;
  dataQuality: BusinessDataQualityRating;
}

export interface EquipmentIntelligenceDto {
  equipmentId: string;
  equipmentName: string;
  outletId: string;
  outletName?: string;
  totalUsageHours: number;
  bookingFrequency: number;
  utilisationRate: number | null;
  peakUsagePeriods: string[];
  isUnderused: boolean;
  isHighDemand: boolean;
  maintenanceStatus: ResourceStatus;
  conflictsCount: number;
  dataQuality: BusinessDataQualityRating;
}

export interface PeakHourSlotDto {
  hourOfDay: number; // 0 - 23
  dayOfWeek: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  dayName: string;
  utilisationRate: number;
  demandLevel: PeakDemandLevel;
  totalBookings: number;
  totalCapacity: number;
  waitlistPressureCount: number;
  activeSessionsCount: number;
  accessibleLabel: string;
}

export interface PeakHourHeatmapDto {
  outletId?: string;
  resourceId?: string;
  timezone: string;
  observationWindow: string;
  slots: PeakHourSlotDto[];
  peakPeriodSummary: string;
  offPeakPeriodSummary: string;
}

export interface ResourceBottleneckDto {
  id: string;
  type: BottleneckType;
  severity: BottleneckSeverity;
  resourceId?: string;
  resourceName?: string;
  resourceType?: ResourceIntelligenceType;
  outletId?: string;
  outletName?: string;
  observation: string;
  evidence: {
    metricKey: string;
    metricLabel: string;
    observedValue: number | string;
    thresholdValue: number | string;
    sampleSize: number;
    observationWindow: string;
  };
  category: 'OBSERVED' | 'DERIVED' | 'RECOMMENDED';
  recommendation: string;
  humanDecisionRequired: string;
  identifiedAt: string;
}

export interface ResourceHealthDimensionReport {
  dimension: ResourceHealthDimensionKey;
  status: ResourceHealthStatus;
  score: number; // 0 - 100
  reason: string;
  attentionFlags: string[];
}

export interface ResourceHealthReportDto {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceIntelligenceType;
  outletId: string;
  outletName?: string;
  overallStatus: ResourceHealthStatus;
  overallScore: number;
  dimensions: Record<ResourceHealthDimensionKey, ResourceHealthDimensionReport>;
  opportunities: string[];
  attentionFlags: string[];
  generatedAt: string;
}

export interface ResourceComparisonItemDto {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceIntelligenceType;
  outletId: string;
  outletName?: string;
  capacity: number;
  utilisation: number | null;
  demandLevel: PeakDemandLevel;
  waitlistCount: number;
  healthStatus: ResourceHealthStatus;
  dataQuality: BusinessDataQualityRating;
}

export interface ResourceComparisonMatrixDto {
  metricKey: string;
  metricLabel: string;
  timeRange: string;
  items: ResourceComparisonItemDto[];
  totalResources: number;
}

export interface ResourceTrendPointDto {
  date: string;
  value: number;
  numerator?: number;
  denominator?: number;
}

export interface ResourceTrendSeriesDto {
  resourceId?: string;
  outletId?: string;
  metricKey: string;
  trendDirection: ResourceTrendDirection;
  points: ResourceTrendPointDto[];
  observationPeriod: string;
}

export interface ResourceOverviewDto {
  organisationId: string;
  outletId?: string;
  timeRange: string;
  totalResources: number;
  activeResources: number;
  overallResourceUtilisation: number | null;
  overallTrainerUtilisation: number | null;
  overallRoomUtilisation: number | null;
  overallClassFillRate: number | null;
  overallAttendanceUtilisation: number | null;
  peakHourUtilisation: number | null;
  waitlistPressureRate: number | null;
  activeBottlenecksCount: number;
  activeBottlenecks: ResourceBottleneckDto[];
  topUtilisedResources: ResourceUtilisationDto[];
  underutilisedResources: ResourceUtilisationDto[];
  freshness: BusinessDataFreshness;
  dataQuality: BusinessDataQualityRating;
}

export interface ResourceAIInsightDto {
  summary: string;
  keyObservations: string[];
  capacityPressures: string[];
  underutilisedAreas: string[];
  peakPeriods: string[];
  resourceTrends: string[];
  possibleExplanations: string[];
  recommendedActions: string[];
  limitations: string[];
  confidence: number;
  groundedMetricsCount: number;
  generatedAt: string;
  isAdvisoryOnly: true;
}

export interface ResourceMetricDefinitionDto {
  metricKey: string;
  name: string;
  domain: string;
  definition: string;
  formula: string;
  numerator: string;
  denominator: string;
  source: string;
  timeWindow: string;
  unit: string;
  minimumSample: number;
  zeroDenominatorBehaviour: string;
  dataQualityRules: string;
  interpretation: string;
  knownLimitations: string;
}
