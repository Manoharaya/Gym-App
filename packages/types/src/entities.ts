/**
 * FitCore Core Entities (Database / Domain Alignment)
 *
 * Anticipates all core platform models across multi-tenant SaaS lifecycle.
 */

import type { UserRole } from './roles-permissions';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantScopedEntity extends BaseEntity {
  organisationId: string;
  outletId?: string;
}

export interface Organisation extends BaseEntity {
  name: string;
  slug: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
}

export interface Outlet extends BaseEntity {
  organisationId: string;
  name: string;
  code: string;
  timezone: string;
  address: string;
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INVITED' | 'INACTIVE' | 'SUSPENDED' | 'DISABLED';
}

export interface Role extends BaseEntity {
  name: UserRole;
  description: string;
}

export interface Permission extends BaseEntity {
  resource: string;
  action: string;
  scope: string;
}

// ==========================================
// DAY 4: MEMBER LIFECYCLE & ONBOARDING
// ==========================================

export type MemberLifecycleStatus =
  | 'INVITED'
  | 'ONBOARDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'INACTIVE'
  | 'ARCHIVED';

export type OnboardingStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'REQUIRES_ACTION'
  | 'READY_FOR_REVIEW'
  | 'COMPLETED';

export type OnboardingStep =
  | 'PROFILE'
  | 'PARQ'
  | 'HEALTH_SCREENING'
  | 'INJURIES'
  | 'CONSENTS'
  | 'DOCUMENTS'
  | 'SIGNATURE'
  | 'REVIEW'
  | 'COMPLETE';

export interface MemberProfile extends BaseEntity {
  userId: string;
  organisationId: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: string;
  profilePhotoUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  timezone: string;
  status: MemberLifecycleStatus;
  onboardingStatus: OnboardingStatus;
  user?: User;
  onboarding?: MemberOnboarding;
  memberOutlets?: MemberOutlet[];
}

export interface MemberOutlet extends BaseEntity {
  memberProfileId: string;
  outletId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED';
  joinedAt: string;
  leftAt?: string;
  outlet?: Outlet;
}

export interface MemberOnboarding extends BaseEntity {
  memberProfileId: string;
  currentStep: OnboardingStep;
  status: OnboardingStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface Questionnaire extends BaseEntity {
  type: string;
  name: string;
  version: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  effectiveFrom: string;
  effectiveTo?: string;
  questions?: Question[];
}

export interface Question extends BaseEntity {
  questionnaireId: string;
  questionKey: string;
  text: string;
  type: 'BOOLEAN' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'TEXT' | 'NUMBER' | 'DATE';
  required: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown>;
}

export interface ParqSubmission extends BaseEntity {
  memberProfileId: string;
  questionnaireId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'REQUIRES_REVIEW' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  reviewedAt?: string;
  reviewedById?: string;
  questionnaire?: Questionnaire;
  responses?: ParqResponse[];
}

export interface ParqResponse extends BaseEntity {
  submissionId: string;
  questionId: string;
  answer: { value: boolean | string | number | string[] };
  notes?: string;
  question?: Question;
}

export interface HealthScreening extends BaseEntity {
  memberProfileId: string;
  screeningVersion: string;
  status: 'PENDING' | 'COMPLETED' | 'REQUIRES_CLEARANCE';
  completedAt?: string;
  notes?: string;
}

export interface Injury extends BaseEntity {
  memberProfileId: string;
  bodyArea: string;
  description: string;
  status: 'ACTIVE' | 'RECOVERING' | 'RESOLVED';
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface MedicalClearance extends BaseEntity {
  memberProfileId: string;
  status: 'NOT_REQUIRED' | 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'EXPIRED' | 'REJECTED';
  issuedDate?: string;
  expiryDate?: string;
  documentId?: string;
  notes?: string;
  verifiedAt?: string;
  verifiedById?: string;
}

export interface ConsentType extends BaseEntity {
  key: string;
  name: string;
  description?: string;
  isMandatory: boolean;
  versions?: ConsentVersion[];
}

export interface ConsentVersion extends BaseEntity {
  consentTypeId: string;
  version: string;
  content: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface ConsentRecord extends BaseEntity {
  memberProfileId: string;
  consentTypeId: string;
  consentVersionId: string;
  status: 'CONSENTED' | 'DECLINED' | 'WITHDRAWN';
  consentedAt: string;
  withdrawnAt?: string;
  ipAddress?: string;
  userAgent?: string;
  consentType?: ConsentType;
  consentVersion?: ConsentVersion;
}

export interface Signature extends BaseEntity {
  memberProfileId: string;
  documentType: string;
  documentVersion: string;
  signatureMethod: string;
  signerName: string;
  signedAt: string;
  ipAddress?: string;
  userAgent?: string;
  signatureReference: string;
}

export interface MemberDocument extends BaseEntity {
  memberProfileId: string;
  documentType: 'MEDICAL_CLEARANCE' | 'CONSENT_DOCUMENT' | 'IDENTITY_DOCUMENT' | 'OTHER';
  storageKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: 'PENDING' | 'UPLOADED' | 'VERIFIED' | 'REJECTED';
  uploadedAt: string;
  uploadedById?: string;
}

export interface StaffProfile extends TenantScopedEntity {
  userId: string;
  role: UserRole;
  bio?: string;
  specializations?: string[];
  certifications?: string[];
  activeOutletIds: string[];
}

export interface MembershipPlan extends TenantScopedEntity {
  name: string;
  description?: string;
  billingInterval: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUAL';
  priceCents: number;
  currency: string;
  accessAllOutlets: boolean;
  active: boolean;
}

export interface Membership extends TenantScopedEntity {
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'PENDING';
  startDate: string;
  renewalDate?: string;
  cancellationDate?: string;
}

export interface Payment extends TenantScopedEntity {
  userId: string;
  invoiceId?: string;
  amountCents: number;
  currency: string;
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'REFUNDED';
  paymentMethod: 'CREDIT_CARD' | 'DIRECT_DEBIT' | 'APPLE_PAY' | 'GOOGLE_PAY';
  processedAt: string;
}

export interface Invoice extends TenantScopedEntity {
  userId: string;
  invoiceNumber: string;
  amountDueCents: number;
  amountPaidCents: number;
  dueDate: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';
  xeroInvoiceId?: string;
}

export interface Trainer extends TenantScopedEntity {
  userId: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
}

export interface Booking extends TenantScopedEntity {
  userId: string;
  trainerId?: string;
  serviceType: 'PERSONAL_TRAINING' | 'CLASS' | 'CONSULTATION' | 'ASSESSMENT';
  startTime: string;
  endTime: string;
  status: 'BOOKED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

export interface Exercise extends BaseEntity {
  name: string;
  category: 'STRENGTH' | 'CARDIO' | 'MOBILITY' | 'OLYMPIC_LIFTING';
  targetMuscleGroups: string[];
  equipmentRequired: string[];
  videoUrl?: string;
}

export interface TrainingProgram extends TenantScopedEntity {
  trainerId?: string;
  title: string;
  description?: string;
  durationWeeks: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';
}

export interface Workout extends TenantScopedEntity {
  programId?: string;
  title: string;
  dayIndex?: number;
  estimatedDurationMinutes: number;
}

export interface WorkoutSession extends TenantScopedEntity {
  userId: string;
  workoutId?: string;
  startedAt: string;
  completedAt?: string;
  perceivedEffort?: number;
  notes?: string;
}

export interface ProgressRecord extends TenantScopedEntity {
  userId: string;
  recordedAt: string;
  bodyWeightKg?: number;
  bodyFatPercentage?: number;
  measurements?: Record<string, number>;
  notes?: string;
}

export interface HealthRecord extends TenantScopedEntity {
  userId: string;
  restingHeartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  vo2Max?: number;
  recordedAt: string;
}

export interface WearableConnection extends TenantScopedEntity {
  userId: string;
  provider: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'REVOKED';
  lastSyncedAt?: string;
}

export interface WearableMetric extends TenantScopedEntity {
  userId: string;
  provider: string;
  metricType: 'STEPS' | 'HEART_RATE' | 'SLEEP' | 'ACTIVE_CALORIES' | 'WORKOUT';
  value: number;
  unit: string;
  timestamp: string;
}

export interface Conversation extends TenantScopedEntity {
  participantIds: string[];
  lastMessagePreview?: string;
  lastMessageAt?: string;
}

export interface Message extends TenantScopedEntity {
  conversationId: string;
  senderId: string;
  content: string;
  readBy: string[];
}

export interface Notification extends TenantScopedEntity {
  userId: string;
  title: string;
  body: string;
  read: boolean;
}

export interface RetailProduct extends TenantScopedEntity {
  name: string;
  sku: string;
  priceCents: number;
  currency: string;
  stockQuantity: number;
  category: string;
}

export interface Purchase extends TenantScopedEntity {
  userId: string;
  productId: string;
  quantity: number;
  totalCents: number;
  paymentId: string;
}

export interface AICredit extends TenantScopedEntity {
  userId: string;
  balance: number;
  monthlyAllocation: number;
}

export interface AuditLog extends TenantScopedEntity {
  actorUserId: string;
  actorRole: UserRole;
  action: string;
  resource: string;
  targetId?: string;
  payloadBefore?: Record<string, unknown>;
  payloadAfter?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}
