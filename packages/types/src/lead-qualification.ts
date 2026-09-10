/**
 * Day 38 — AI Lead Qualification & Sales Discovery
 * Shared TypeScript Contracts & Domain Models
 */

// ============================================================================
// Core Taxonomies & Enums
// ============================================================================

export type LeadGoalType =
  | 'WEIGHT_LOSS'
  | 'WEIGHT_MANAGEMENT'
  | 'MUSCLE_GAIN'
  | 'MUSCLE_BUILDING'
  | 'STRENGTH'
  | 'STRENGTH_AND_CONDITIONING'
  | 'GENERAL_FITNESS'
  | 'ATHLETIC_PERFORMANCE'
  | 'SPORTS_PERFORMANCE'
  | 'REHABILITATION_AND_MOBILITY'
  | 'MOBILITY'
  | 'FLEXIBILITY'
  | 'STRESS_RELIEF'
  | 'WELLNESS'
  | 'SOCIAL_AND_COMMUNITY'
  | 'GROUP_FITNESS'
  | 'PERSONAL_TRAINING'
  | 'ENDURANCE'
  | 'EVENT_PREPARATION'
  | 'UNKNOWN'
  | 'OTHER';

export type LeadGoal = LeadGoalType;

export type LeadGoalPriority = 'PRIMARY' | 'SECONDARY';

export interface StructuredLeadGoal {
  type: LeadGoalType;
  label?: string;
  priority: LeadGoalPriority;
  confidence: number;
  source: string;
  statedAt: string;
}

export type LeadExperienceLevel =
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCED'
  | 'RETURNING_AFTER_BREAK'
  | 'UNKNOWN';

export type LeadExperienceSource = 'EXPLICITLY_STATED' | 'INFERRED_FROM_CONVERSATION' | 'UNKNOWN';

export type LeadServiceInterestType =
  | 'GYM_ACCESS'
  | 'GROUP_CLASSES'
  | 'PERSONAL_TRAINING'
  | 'SMALL_GROUP_TRAINING'
  | 'SPORTS_PERFORMANCE'
  | 'YOGA'
  | 'PILATES'
  | 'BOXING'
  | 'STRENGTH_TRAINING'
  | 'CARDIO'
  | 'TRIAL'
  | 'TOUR'
  | 'MEMBERSHIP'
  | 'OPEN_GYM'
  | 'NUTRITION_COACHING'
  | 'OTHER';

export interface LeadMembershipInterest {
  membershipPlanId?: string | null;
  planName?: string | null;
  interestLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'EXPLORING';
  billingPreference?: string | null;
  accessPreference?: string | null;
  membershipDurationPreference?: string | null;
}

export type LeadScheduleFlexibility =
  | 'VERY_FLEXIBLE'
  | 'MODERATELY_FLEXIBLE'
  | 'SOMEWHAT_FLEXIBLE'
  | 'RIGID'
  | 'FIXED'
  | 'UNKNOWN';

export type LeadBudgetSensitivity =
  | 'HIGH'
  | 'MODERATE'
  | 'LOW'
  | 'PRICE_SENSITIVE'
  | 'VALUE_FOCUSED'
  | 'FLEXIBLE'
  | 'NOT_DISCLOSED'
  | 'EXPLICIT_RANGE'
  | 'UNKNOWN';

export interface LeadBudgetRange {
  min?: number;
  max?: number;
  currency?: string;
  period?: 'MONTHLY' | 'WEEKLY' | 'ANNUAL' | 'PER_SESSION';
}

export type LeadObjectionType =
  | 'PRICE'
  | 'PRICE_OR_MEMBERSHIP_COST'
  | 'TIME'
  | 'SCHEDULE'
  | 'SCHEDULE_OR_TIME_COMMITMENT'
  | 'LOCATION'
  | 'LOCATION_OR_DISTANCE'
  | 'COMMUTE'
  | 'CONTRACT_OR_COMMITMENT_TERMS'
  | 'COMMITMENT'
  | 'CHILDCARE'
  | 'INTIMIDATION_OR_CONFIDENCE'
  | 'OVERCROWDING'
  | 'PARKING'
  | 'FACILITY_FEATURES'
  | 'SERVICE_FIT'
  | 'SPOUSAL_OR_PARTNER_CONSULTATION'
  | 'NEEDS_TO_CONSULT_SOMEONE'
  | 'NEEDS_MORE_INFORMATION'
  | 'WANTS_TO_COMPARE'
  | 'NOT_READY'
  | 'TRUST'
  | 'EXPERIENCE'
  | 'OTHER';

export type LeadObjectionStatus = 'OPEN' | 'PARTIALLY_ADDRESSED' | 'RESOLVED' | 'DISMISSED';

export type LeadObjectionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER';

export type LeadDecisionFactor =
  | 'PRICE'
  | 'LOCATION'
  | 'SCHEDULE'
  | 'COACHING_QUALITY'
  | 'COMMUNITY_ATMOSPHERE'
  | 'FACILITY_QUALITY'
  | 'TRIAL_EXPERIENCE'
  | 'CONTRACT_FLEXIBILITY'
  | string;

export interface StructuredLeadDecisionFactor {
  factor: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

export type LeadTimeline =
  | 'IMMEDIATE'
  | 'TODAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'WITHIN_A_MONTH'
  | 'NEXT_MONTH'
  | 'EXPLORING'
  | 'UNKNOWN';

export type LeadReadiness =
  | 'EXPLORING'
  | 'INTERESTED'
  | 'READY_TO_VISIT'
  | 'READY_TO_TRY'
  | 'READY_FOR_TRIAL'
  | 'READY_FOR_TOUR'
  | 'READY_TO_JOIN'
  | 'UNDECIDED'
  | 'UNKNOWN';

export type LeadQuestionStatus = 'OPEN' | 'ANSWERED' | 'ESCALATED';

export interface LeadQuestion {
  id?: string;
  question: string;
  category?: string;
  status?: LeadQuestionStatus;
  answered?: boolean;
  answer?: string | null;
  answerSource?: string;
  answeredAt?: string;
}

export type LeadQualificationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PARTIALLY_QUALIFIED'
  | 'QUALIFIED'
  | 'UNQUALIFIED'
  | 'NEEDS_HUMAN_REVIEW'
  | 'UNKNOWN'
  | 'HIGH_INTENT'
  | 'READY_FOR_NEXT_STEP';

export type LeadQualificationSource =
  | 'DIRECT_CUSTOMER_STATEMENT'
  | 'VERIFIED_BUSINESS_EVENT'
  | 'STAFF_ENTERED'
  | 'STAFF_ENTRY'
  | 'AI_EXTRACTION'
  | 'AI_INFERENCE';

export type QualificationDataSource = LeadQualificationSource;

export type QualificationActorType =
  | 'AI_SALES_AGENT'
  | 'STAFF'
  | 'SYSTEM'
  | 'CUSTOMER'
  | 'AI';

// ============================================================================
// Structured Objections & History DTOs
// ============================================================================

export interface LeadQualificationObjectionDto {
  id: string;
  profileId?: string | null;
  leadId: string;
  organisationId?: string;
  objectionType?: LeadObjectionType;
  type?: LeadObjectionType;
  description?: string;
  rawCustomerStatement?: string;
  normalizedSummary?: string;
  severity: LeadObjectionSeverity;
  status: LeadObjectionStatus;
  source?: string;
  firstDetectedAt?: string | Date;
  lastDetectedAt?: string | Date;
  addressedAt?: string | Date | null;
  resolvedAt?: string | Date | null;
  resolutionNotes?: string | null;
  resolvedById?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface LeadQualificationHistoryDto {
  id: string;
  profileId?: string | null;
  leadId: string;
  organisationId?: string;
  fieldChanged?: string;
  field?: string;
  previousValue: any;
  newValue: any;
  source: string;
  actorType: QualificationActorType;
  actorId?: string | null;
  evidence?: string | null;
  reason?: string | null;
  createdAt: string | Date;
}

export interface LeadQualificationCompleteness {
  percentage: number;
  missingFields?: string[];
  availableFields?: string[];
  breakdown?: Record<string, boolean>;
}

// ============================================================================
// Extended Lead Qualification Profile DTO
// ============================================================================

export interface ExtendedLeadQualificationProfileDto {
  id: string;
  leadId: string;
  organisationId?: string | null;
  outletId?: string | null;

  // Goals
  goals?: any;
  primaryGoal?: LeadGoalType | null;
  secondaryGoals?: string[];

  // Experience
  experienceLevel: LeadExperienceLevel;
  experienceSource?: LeadExperienceSource;

  // Interests
  serviceInterests: string[];
  membershipInterests?: LeadMembershipInterest | null;
  membershipPlanId?: string | null;

  // Location & Schedule
  preferredOutletId?: string | null;
  preferredOutletName?: string | null;
  preferredLocationText?: string | null;
  preferredDays: string[];
  preferredTimes: string[];
  frequencyPreference?: string | number | null;
  scheduleFlexibility: LeadScheduleFlexibility;
  preferredSchedule?: string | null;

  // Financial & Decision Factors
  budgetSensitivity: LeadBudgetSensitivity;
  budgetRange?: string | LeadBudgetRange | null;
  decisionFactors: any[];

  // Timeline & Readiness
  timeline: LeadTimeline;
  targetStartDate?: string | Date | null;
  readiness: LeadReadiness;

  // Objections, Questions & Constraints
  objections: any[];
  questions: any[];
  constraints: string[];
  missingInformation?: string[];

  // High Intent & Status
  isHighIntent: boolean;
  highIntentSignals?: string[];
  qualificationStatus: LeadQualificationStatus;
  qualificationCompleteness: number; // 0 - 100%
  qualificationVersion?: number;

  // Next Action & AI Meta
  recommendedNextAction?: string | null;
  nextActionReason?: string | null;
  aiConfidence?: number | null;
  aiEvidence: Array<{ observation: string; inferred: boolean; source: string }>;
  aiSummary?: string | null;
  lastEvaluatedAt?: string | Date | null;
  lastStaffOverrideAt?: string | Date | null;
  lastStaffOverrideById?: string | null;

  createdAt: string | Date;
  updatedAt?: string | Date;
}

// ============================================================================
// AI Extraction & Smart Discovery DTOs
// ============================================================================

export interface ExtractedQualificationDto {
  primaryGoal: LeadGoalType;
  secondaryGoals?: string[];
  goals?: any[];
  experienceLevel?: LeadExperienceLevel;
  experienceSource?: LeadExperienceSource;
  serviceInterests: string[];
  membershipInterests?: LeadMembershipInterest;
  schedule?: {
    preferredDays: string[];
    preferredTimes: string[];
    frequencyPreference?: string | number;
    scheduleFlexibility?: LeadScheduleFlexibility;
  };
  location?: {
    preferredOutletId?: string | null;
    preferredOutletName?: string | null;
    distanceSensitivity?: string | null;
  };
  preferredLocationText?: string;
  preferredDays?: string[];
  preferredTimes?: string[];
  frequencyPreference?: string | number;
  scheduleFlexibility?: LeadScheduleFlexibility;
  budgetSensitivity?: LeadBudgetSensitivity;
  budgetRange?: string | LeadBudgetRange | null;
  objections?: Array<{
    objectionType?: LeadObjectionType;
    type?: LeadObjectionType;
    severity?: LeadObjectionSeverity;
    rawCustomerStatement?: string;
    normalizedSummary?: string;
    description?: string;
  }>;
  decisionFactors?: Array<string | StructuredLeadDecisionFactor>;
  timeline?: LeadTimeline;
  targetStartDate?: string;
  readiness?: LeadReadiness;
  questions?: Array<{
    question: string;
    category?: string;
    answered?: boolean;
    answer?: string | null;
  }>;
  constraints?: string[];
  missingInformation?: string[];
  isHighIntent?: boolean;
  qualificationStatus?: LeadQualificationStatus;
  recommendedNextAction?: string;
  nextActionReason?: string;
  confidence: number;
  evidence: Array<{ observation: string; inferred: boolean; source: string }>;
  aiSummary: string;
}

export interface SmartDiscoveryQuestionDto {
  targetDimension: string;
  question: string;
  rationale: string;
  priority: number;
  suggestedQuestion?: string;
  targetField?: string;
}

export interface StaffLeadQualificationViewDto {
  leadId: string;
  leadName: string;
  leadEmail?: string | null;
  leadPhone?: string | null;
  leadStatus?: string;
  leadScore?: number;
  outletName?: string;
  assignedStaffName?: string;
  profile: ExtendedLeadQualificationProfileDto;
  completeness?: LeadQualificationCompleteness;
  objections: LeadQualificationObjectionDto[];
  activeObjections?: LeadQualificationObjectionDto[];
  history: LeadQualificationHistoryDto[];
  recentHistory?: LeadQualificationHistoryDto[];
  suggestedNextStep?: string;
}
