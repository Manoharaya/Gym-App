/**
 * Day 33 — AI Lead Capture & Qualification Types & Contracts
 */

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFYING'
  | 'QUALIFIED'
  | 'UNQUALIFIED'
  | 'TRIAL_INTEREST'
  | 'TOUR_INTEREST'
  | 'MEMBERSHIP_INTEREST'
  | 'CONVERTED'
  | 'LOST'
  | 'DO_NOT_CONTACT';

export type LeadSource =
  | 'WEBSITE'
  | 'AI_RECEPTIONIST'
  | 'PHONE'
  | 'WHATSAPP'
  | 'SMS'
  | 'EMAIL'
  | 'REFERRAL'
  | 'WALK_IN'
  | 'SOCIAL'
  | 'AD'
  | 'CAMPAIGN'
  | 'STAFF'
  | 'IMPORT'
  | 'OTHER';

export type LeadConsentStatus =
  | 'NOT_REQUESTED'
  | 'GRANTED'
  | 'DENIED'
  | 'WITHDRAWN'
  | 'UNKNOWN';

export type PreferredContactChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PHONE';

export type QualificationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PARTIALLY_QUALIFIED'
  | 'QUALIFIED'
  | 'UNQUALIFIED'
  | 'NEEDS_HUMAN_REVIEW';

export type PreferredSchedule =
  | 'EARLY_MORNING'
  | 'MORNING'
  | 'AFTERNOON'
  | 'EVENING'
  | 'WEEKEND'
  | 'FLEXIBLE'
  | 'UNKNOWN';

export type ExperienceLevel =
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCED'
  | 'UNKNOWN';

export type ReadinessLevel =
  | 'EXPLORING'
  | 'INTERESTED'
  | 'READY_TO_VISIT'
  | 'READY_TO_TRY'
  | 'READY_TO_JOIN'
  | 'UNKNOWN';

export type PriceSensitivity =
  | 'PRICE_SENSITIVE'
  | 'VALUE_FOCUSED'
  | 'FLEXIBLE'
  | 'UNKNOWN';

export type LeadNextBestAction =
  | 'SHOW_MEMBERSHIP_OPTIONS'
  | 'OFFER_TRIAL'
  | 'OFFER_TOUR'
  | 'SHOW_CLASS_OPTIONS'
  | 'OFFER_TRAINER_INFORMATION'
  | 'COLLECT_CONTACT_DETAILS'
  | 'ASK_QUALIFICATION_QUESTION'
  | 'HANDOFF_TO_STAFF'
  | 'NO_ACTION';

export type LeadActivityType =
  | 'LEAD_CREATED'
  | 'CONTACT_UPDATED'
  | 'QUALIFICATION_STARTED'
  | 'QUALIFICATION_UPDATED'
  | 'LEAD_QUALIFIED'
  | 'LEAD_UNQUALIFIED'
  | 'LEAD_SCORE_UPDATED'
  | 'STAFF_ASSIGNED'
  | 'HANDOFF_CREATED'
  | 'TRIAL_REQUESTED'
  | 'TOUR_REQUESTED'
  | 'BOOKING_CREATED'
  | 'COMMUNICATION_SENT'
  | 'COMMUNICATION_RECEIVED'
  | 'LEAD_REENGAGED'
  | 'LEAD_CONVERTED'
  | 'NOTE_ADDED';

export interface LeadScoreFactor {
  factor: string;
  points: number;
  description: string;
}

export interface LeadObjection {
  type: string;
  customerStatementSummary: string;
  timestamp: string;
  resolved: boolean;
}

export interface LeadEvidence {
  observation: string;
  inferred: boolean;
  source: string;
}

export interface LeadQualificationProfileDto {
  id: string;
  leadId: string;
  goals: string[];
  serviceInterests: string[];
  preferredOutletId?: string | null;
  preferredOutletName?: string | null;
  preferredSchedule?: PreferredSchedule | null;
  experienceLevel?: ExperienceLevel | null;
  readiness?: ReadinessLevel | null;
  priceSensitivity?: PriceSensitivity | null;
  objections: LeadObjection[];
  preferredContactChannel?: PreferredContactChannel | null;
  preferredLanguage?: string | null;
  qualificationStatus: QualificationStatus;
  qualificationVersion: number;
  missingInformation: string[];
  recommendedNextAction?: LeadNextBestAction | null;
  nextActionReason?: string | null;
  aiConfidence?: number | null;
  aiEvidence: LeadEvidence[];
  aiSummary?: string | null;
  lastEvaluatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivityDto {
  id: string;
  leadId: string;
  organisationId: string;
  activityType: LeadActivityType;
  actorType: 'AI_RECEPTIONIST' | 'STAFF' | 'SYSTEM' | 'CUSTOMER';
  actorId?: string | null;
  title: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface LeadDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  outletName?: string | null;
  source: LeadSource;
  sourceMetadata?: Record<string, any> | null;
  status: LeadStatus;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  preferredContactChannel?: PreferredContactChannel | null;
  preferredLanguage?: string;
  consentStatus: LeadConsentStatus;
  consentSource?: string | null;
  consentedAt?: string | null;
  originatingConversationId?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  assignedOutletId?: string | null;
  assignedAt?: string | null;
  assignedById?: string | null;
  score: number;
  scoreVersion: number;
  scoreFactors: LeadScoreFactor[];
  scoreCalculatedAt?: string | null;
  lastInteractionAt?: string | null;
  qualification?: LeadQualificationProfileDto | null;
  recentActivities?: LeadActivityDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadInputDto {
  organisationId?: string;
  outletId?: string;
  source?: LeadSource;
  sourceMetadata?: Record<string, any>;
  status?: LeadStatus;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  preferredContactChannel?: PreferredContactChannel;
  preferredLanguage?: string;
  consentStatus?: LeadConsentStatus;
  consentSource?: string;
  originatingConversationId?: string;
  initialGoals?: string[];
  initialServiceInterests?: string[];
  initialReadiness?: ReadinessLevel;
}

export interface UpdateLeadInputDto {
  outletId?: string;
  status?: LeadStatus;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  preferredContactChannel?: PreferredContactChannel;
  preferredLanguage?: string;
  consentStatus?: LeadConsentStatus;
  consentSource?: string;
  assignedStaffId?: string;
  assignedOutletId?: string;
}

export interface UpdateLeadQualificationInputDto {
  goals?: string[];
  serviceInterests?: string[];
  preferredOutletId?: string;
  preferredSchedule?: PreferredSchedule;
  experienceLevel?: ExperienceLevel;
  readiness?: ReadinessLevel;
  priceSensitivity?: PriceSensitivity;
  objections?: LeadObjection[];
  preferredContactChannel?: PreferredContactChannel;
  preferredLanguage?: string;
  qualificationStatus?: QualificationStatus;
  recommendedNextAction?: LeadNextBestAction;
  nextActionReason?: string;
  aiSummary?: string;
}

export interface AssignStaffInputDto {
  staffProfileId: string;
  outletId?: string;
  notes?: string;
}

export interface LeadFilterQueryDto {
  status?: LeadStatus;
  outletId?: string;
  source?: LeadSource;
  minScore?: number;
  maxScore?: number;
  qualificationStatus?: QualificationStatus;
  assignedStaffId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LeadNextActionResultDto {
  leadId: string;
  recommendedAction: LeadNextBestAction;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  suggestedActionPayload?: Record<string, any>;
}

export interface LeadMetricsDto {
  totalLeads: number;
  newLeadsToday: number;
  qualifiedLeads: number;
  unqualifiedLeads: number;
  conversionFunnel: {
    totalConversations: number;
    leadsCaptured: number;
    leadsQualified: number;
    trialsOrToursRequested: number;
    conversions: number;
  };
  leadsByStatus: Record<string, number>;
  leadsBySource: Record<string, number>;
  averageScore: number;
}
