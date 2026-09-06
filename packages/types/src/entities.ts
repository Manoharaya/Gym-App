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

export type MembershipPlanStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type MembershipType =
  | 'STANDARD'
  | 'TRIAL'
  | 'INTRODUCTORY'
  | 'CORPORATE'
  | 'STUDENT'
  | 'FAMILY'
  | 'CUSTOM';
export type BillingType = 'ONE_TIME' | 'RECURRING';
export type DurationUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export interface MembershipPlan extends BaseEntity {
  organisationId: string;
  name: string;
  description?: string;
  code: string;
  status: MembershipPlanStatus;
  membershipType: MembershipType;
  billingType: BillingType;
  durationValue: number;
  durationUnit: DurationUnit;
  price: number;
  currency: string;
  trialDuration?: number;
  isPublic: boolean;
  requiresApproval: boolean;
  archivedAt?: string;
  planOutlets?: MembershipPlanOutlet[];
  entitlements?: MembershipEntitlement[];
}

export interface MembershipPlanOutlet extends BaseEntity {
  membershipPlanId: string;
  outletId: string;
  outlet?: Outlet;
}

export interface MembershipEntitlement extends BaseEntity {
  membershipPlanId: string;
  type: string;
  name: string;
  description?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export type MemberMembershipStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'TRIAL'
  | 'PAUSED'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type MembershipAccessScope =
  | 'SINGLE_OUTLET'
  | 'MULTI_OUTLET'
  | 'ALL_ORGANISATION_OUTLETS';

export interface MemberMembership extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  membershipPlanId: string;
  status: MemberMembershipStatus;
  accessScope: MembershipAccessScope;
  originOutletId?: string;
  startDate: string;
  endDate: string;
  activatedAt?: string;
  pausedAt?: string;
  suspendedAt?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  autoRenew: boolean;
  trialEndsAt?: string;

  // Commercial Snapshot
  planNameAtPurchase: string;
  priceAtPurchase: number;
  currencyAtPurchase: string;
  billingTypeAtPurchase: string;
  durationValueAtPurchase: number;
  durationUnitAtPurchase: string;

  membershipPlan?: MembershipPlan;
  originOutlet?: Outlet;
  accessOutlets?: MemberMembershipOutlet[];
  history?: MemberMembershipHistory[];
}

export interface MemberMembershipOutlet extends BaseEntity {
  memberMembershipId: string;
  outletId: string;
  outlet?: Outlet;
}

export interface MemberMembershipHistory extends BaseEntity {
  memberMembershipId: string;
  fromStatus?: string;
  toStatus: string;
  action: string;
  reason?: string;
  actorId?: string;
  actorRole?: string;
  metadata?: Record<string, unknown>;
}

export type AccessDecisionReason =
  | 'ALLOWED'
  | 'ALLOWED_BY_OVERRIDE'
  | 'MEMBER_NOT_FOUND'
  | 'MEMBER_INACTIVE'
  | 'NO_ACTIVE_MEMBERSHIP'
  | 'MEMBERSHIP_EXPIRED'
  | 'MEMBERSHIP_SUSPENDED'
  | 'MEMBERSHIP_CANCELLED'
  | 'MEMBERSHIP_PAUSED'
  | 'MEMBERSHIP_PENDING'
  | 'OUTLET_NOT_AUTHORIZED'
  | 'OUTLET_NOT_FOUND'
  | 'OUTLET_NOT_INCLUDED'
  | 'OUTLET_NOT_IN_SCOPE'
  | 'NO_GYM_ACCESS_ENTITLEMENT'
  | 'MISSING_ENTITLEMENT'
  | 'CREDENTIAL_NOT_FOUND'
  | 'CREDENTIAL_REVOKED'
  | 'CREDENTIAL_EXPIRED'
  | 'CREDENTIAL_SUSPENDED'
  | 'ACCESS_POLICY_DENIED'
  | 'OUTSIDE_ALLOWED_HOURS'
  | 'ACCESS_POINT_DISABLED'
  | 'DEVICE_OFFLINE'
  | 'DEVICE_DISABLED'
  | 'ORGANISATION_MISMATCH'
  | 'INVALID_REQUEST'
  | 'ACTIVE_MEMBERSHIP';

export type AccessReasonCode = AccessDecisionReason;

export interface AccessDecisionResult {
  allowed: boolean;
  reason: AccessDecisionReason;
  memberProfileId?: string;
  memberId?: string;
  outletId?: string;
  membershipId?: string;
  credentialId?: string;
  accessPointId?: string;
  deviceId?: string;
  accessScope?: MembershipAccessScope;
  timestamp?: string;
  details?: string;
  allowedByOverride?: boolean;
}


export type PaymentStatus =
  | 'PENDING'
  | 'REQUIRES_PAYMENT_METHOD'
  | 'REQUIRES_CONFIRMATION'
  | 'REQUIRES_ACTION'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type InvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PAID'
  | 'UNCOLLECTIBLE'
  | 'VOID';

export type PaymentMethodType =
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'MOCK'
  | 'MANUAL_CASH'
  | 'MANUAL_POS'
  | 'MANUAL_OTHER';

export type RefundStatus =
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface PaymentCustomer extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  provider: string;
  providerCustomerId: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentMethod extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  paymentCustomerId?: string;
  type: PaymentMethodType;
  provider: string;
  providerPaymentMethodId: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface InvoiceLineItem extends BaseEntity {
  invoiceId: string;
  description: string;
  quantity: number;
  unitAmountMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  membershipPlanId?: string;
  memberMembershipId?: string;
  metadata?: Record<string, unknown>;
}

export interface Invoice extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  feeMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  amountDueMinor: number;
  dueDate: string;
  paidAt?: string;
  voidedAt?: string;
  description?: string;
  notes?: string;
  idempotencyKey?: string;
  lineItems?: InvoiceLineItem[];
  transactions?: PaymentTransaction[];
}

export interface PaymentRefund extends BaseEntity {
  organisationId: string;
  paymentTransactionId: string;
  amountMinor: number;
  currency: string;
  status: RefundStatus;
  reason?: string;
  providerRefundId?: string;
  requestedById?: string;
  failureReason?: string;
}

export interface PaymentTransaction extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  invoiceId?: string;
  paymentMethodId?: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerTransactionId?: string;
  paymentMethodType: PaymentMethodType;
  description?: string;
  failureCode?: string;
  failureMessage?: string;
  receiptUrl?: string;
  metadata?: Record<string, unknown>;
  refunds?: PaymentRefund[];
  invoice?: Invoice;
  paymentMethod?: PaymentMethod;
}

export interface Discount extends BaseEntity {
  organisationId: string;
  code: string;
  name: string;
  description?: string;
  type: DiscountType;
  valueMinor?: number;
  percentage?: number;
  validFrom: string;
  validUntil?: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
}

export interface PaymentWebhookEvent extends BaseEntity {
  organisationId?: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signatureVerified: boolean;
  processingStatus: 'PENDING' | 'PROCESSED' | 'FAILED' | 'IGNORED';
  processedAt?: string;
  failureReason?: string;
  retryCount: number;
}

export interface IdempotencyRecord extends BaseEntity {
  organisationId: string;
  idempotencyKey: string;
  requestPath: string;
  requestMethod: string;
  requestParams?: Record<string, unknown>;
  responseStatus: number;
  responseBody: Record<string, unknown>;
  expiresAt: string;
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

// ==========================================
// DAY 7: PHYSICAL ACCESS, CHECK-IN & DOOR ACCESS
// ==========================================

export type CredentialType =
  | 'QR_CODE'
  | 'RFID'
  | 'NFC'
  | 'MOBILE'
  | 'PIN'
  | 'BIOMETRIC_REFERENCE'
  | 'EXTERNAL';

export type CredentialStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'EXPIRED';

export type AccessPointType =
  | 'MAIN_ENTRANCE'
  | 'TURNSTILE'
  | 'DOOR'
  | 'GATE'
  | 'RESTRICTED_ZONE';

export type AccessPointStatus = 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';

export type DeviceType =
  | 'DOOR'
  | 'TURNSTILE'
  | 'GATE'
  | 'READER'
  | 'SCANNER'
  | 'LOCK'
  | 'OTHER';

export type DeviceStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'DISABLED'
  | 'UNKNOWN';

export type DeviceDirection = 'ENTRY' | 'EXIT' | 'BOTH';

export type CheckInMethod =
  | 'QR'
  | 'RFID'
  | 'NFC'
  | 'MOBILE'
  | 'MANUAL'
  | 'DEVICE'
  | 'OTHER';

export type CheckInStatus = 'SUCCESS' | 'DENIED' | 'CANCELLED' | 'ERROR';

export type AccessEventType =
  | 'ACCESS_REQUESTED'
  | 'ACCESS_GRANTED'
  | 'ACCESS_DENIED'
  | 'DOOR_UNLOCKED'
  | 'DOOR_LOCKED'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'CREDENTIAL_USED'
  | 'DEVICE_ERROR';

export type AccessOverrideReason =
  | 'MANAGER_APPROVAL'
  | 'TECHNICAL_FAILURE'
  | 'SPECIAL_EVENT'
  | 'TEMPORARY_ACCESS'
  | 'OTHER';

export type AccessOverrideStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface AccessCredential extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  type: CredentialType;
  status: CredentialStatus;
  credentialReference: string;
  displayIdentifier?: string;
  issuedAt: string;
  activatedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
  lastUsedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AccessPoint extends BaseEntity {
  organisationId: string;
  outletId: string;
  name: string;
  type: AccessPointType;
  location?: string;
  status: AccessPointStatus;
  metadata?: Record<string, unknown>;
}

export interface AccessDevice extends BaseEntity {
  organisationId: string;
  outletId: string;
  accessPointId?: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  provider: string;
  providerDeviceId?: string;
  direction: DeviceDirection;
  location?: string;
  lastHeartbeatAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AccessPolicy extends BaseEntity {
  organisationId: string;
  outletId?: string;
  name: string;
  enabled: boolean;
  allowedStartTime: string;
  allowedEndTime: string;
  allowedDays: number[];
  membershipRequirements?: Record<string, unknown>;
  guestAllowed: boolean;
  staffOverrideAllowed: boolean;
  metadata?: Record<string, unknown>;
}

export interface AccessOverride extends BaseEntity {
  organisationId: string;
  outletId: string;
  memberProfileId: string;
  createdById: string;
  reason: AccessOverrideReason;
  startsAt: string;
  expiresAt: string;
  status: AccessOverrideStatus;
  notes?: string;
}

export interface CheckIn extends BaseEntity {
  organisationId: string;
  outletId: string;
  memberProfileId: string;
  memberMembershipId?: string;
  credentialId?: string;
  accessPointId?: string;
  deviceId?: string;
  method: CheckInMethod;
  status: CheckInStatus;
  checkedInAt: string;
  checkedOutAt?: string;
  source: string;
  deviceEventId?: string;
  denialReason?: string;
  metadata?: Record<string, unknown>;
}

export interface AccessEvent extends BaseEntity {
  organisationId: string;
  outletId: string;
  memberProfileId?: string;
  credentialId?: string;
  deviceId?: string;
  accessPointId?: string;
  eventType: AccessEventType;
  decision?: 'ALLOWED' | 'DENIED';
  reason?: AccessDecisionReason;
  occurredAt: string;
  providerEventId?: string;
  metadata?: Record<string, unknown>;
}

export interface GuestAccessPass extends BaseEntity {
  organisationId: string;
  outletId: string;
  passCode: string;
  guestName?: string;
  guestEmail?: string;
  validFrom: string;
  validUntil: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  createdById: string;
  metadata?: Record<string, unknown>;
}

export interface MemberAccessStatusResponse {
  memberProfileId: string;
  canAccessCurrentOutlet: boolean;
  currentOutlet?: {
    id: string;
    name: string;
    code: string;
  };
  activeMembership?: {
    id: string;
    planName: string;
    status: string;
    accessScope: string;
    startDate: string;
    endDate: string;
  };
  authorizedOutlets: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  activeVisit?: {
    id: string;
    outletId: string;
    outletName?: string;
    checkedInAt: string;
    durationMinutes: number;
  };
  primaryCredential?: {
    id: string;
    type: CredentialType;
    status: CredentialStatus;
    displayIdentifier?: string;
  };
  denialReason?: AccessDecisionReason;
  userFacingMessage: string;
}

export interface DynamicQRCredentialResponse {
  token: string;
  displayIdentifier: string;
  expiresAt: string;
  refreshIntervalSeconds: number;
}

