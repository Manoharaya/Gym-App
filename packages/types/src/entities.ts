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

export interface LegacyAppointmentBooking extends TenantScopedEntity {
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

// Early scaffold Workout removed in favor of Day 13 Workout model


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

// ============================================================================
// DAY 8: BOOKING & SCHEDULING FOUNDATION
// ============================================================================

export type ClassCategory =
  | 'YOGA'
  | 'STRENGTH'
  | 'HIIT'
  | 'SPIN'
  | 'PILATES'
  | 'BOXING'
  | 'CROSSFIT'
  | 'ZUMBA'
  | 'OTHER';

export type ClassSessionStatus =
  | 'SCHEDULED'
  | 'OPEN'
  | 'FULL'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type BookingStatus =
  | 'CONFIRMED'
  | 'WAITLISTED'
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'NO_SHOW';

export type WaitlistStatus = 'PENDING' | 'OFFERED' | 'PROMOTED' | 'CANCELLED' | 'EXPIRED';

export type ResourceType =
  | 'STUDIO'
  | 'ROOM'
  | 'COURT'
  | 'AREA'
  | 'EQUIPMENT_BAY';

export type BookingDenialReason =
  | 'BOOKING_NOT_FOUND'
  | 'CLASS_SESSION_NOT_FOUND'
  | 'CLASS_SESSION_CANCELLED'
  | 'BOOKING_NOT_OPEN'
  | 'BOOKING_CLOSED'
  | 'CANCELLATION_WINDOW_CLOSED'
  | 'CLASS_FULL'
  | 'BOOKING_LIMIT_REACHED'
  | 'DAILY_BOOKING_LIMIT_REACHED'
  | 'MEMBERSHIP_REQUIRED'
  | 'MEMBERSHIP_INACTIVE'
  | 'MEMBERSHIP_SUSPENDED'
  | 'MEMBERSHIP_ENTITLEMENT_REQUIRED'
  | 'OUTLET_NOT_AUTHORIZED'
  | 'BOOKING_TIME_CONFLICT'
  | 'TRAINER_SCHEDULE_CONFLICT'
  | 'RESOURCE_SCHEDULE_CONFLICT'
  | 'ALREADY_BOOKED'
  | 'ALREADY_WAITLISTED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'ORGANISATION_MISMATCH'
  | 'BOOKING_NOT_ALLOWED';

export interface ClassType extends BaseEntity {
  organisationId: string;
  name: string;
  description?: string;
  category: ClassCategory;
  durationMinutes: number;
  defaultCapacity: number;
  bookingRequired: boolean;
  membershipEntitlementKey?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

export interface ClassTemplate extends BaseEntity {
  organisationId: string;
  classTypeId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  defaultCapacity: number;
  defaultBookingPolicyId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

export interface BookingPolicy extends BaseEntity {
  organisationId: string;
  name: string;
  maxAdvanceBookingHours: number;
  minimumCancellationNoticeHours: number;
  maxActiveBookings: number;
  allowWaitlist: boolean;
  maxWaitlistSize: number;
  allowLateBooking: boolean;
  allowCancellation: boolean;
  allowLateCancellation?: boolean;
  lateCancellationWindowHours?: number;
  recordLateCancellation?: boolean;
  maxBookingsPerDay?: number;
  isDefault: boolean;
}

export interface Resource extends BaseEntity {
  organisationId: string;
  outletId: string;
  name: string;
  type: ResourceType;
  capacity: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';
}

export interface ClassSession extends BaseEntity {
  organisationId: string;
  outletId: string;
  classTemplateId?: string;
  classTypeId: string;
  trainerId?: string;
  resourceId?: string;
  bookingPolicyId?: string;
  recurringScheduleId?: string;
  name?: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: ClassSessionStatus;
  isOverride?: boolean;
  originalStartsAt?: string;
  bookingOpensAt?: string;
  bookingClosesAt?: string;
  cancellationClosesAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  resource?: {
    id: string;
    name: string;
    type: string;
  };
  outlet?: {
    id: string;
    name: string;
    code?: string;
  };
  classType?: {
    id: string;
    name: string;
    category: ClassCategory;
    durationMinutes: number;
    description?: string;
  };
  classTemplate?: {
    id: string;
    name: string;
    description?: string;
  };
  policy?: BookingPolicy;
  _count?: {
    bookings?: number;
    waitlistEntries?: number;
  };
  confirmedBookingCount?: number;
  waitlistCount?: number;
  spotsRemaining?: number;
  userBookingStatus?: BookingStatus | null;
}

export interface Booking extends BaseEntity {
  organisationId: string;
  outletId: string;
  memberProfileId: string;
  classSessionId: string;
  status: BookingStatus;
  bookedAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  isLateCancellation?: boolean;
  checkedInAt?: string;
  noShowAt?: string;
  waitlistPosition?: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  classSession?: ClassSession;
}

export interface WaitlistEntry extends BaseEntity {
  organisationId: string;
  outletId: string;
  classSessionId: string;
  memberProfileId: string;
  bookingId?: string;
  position: number;
  status: WaitlistStatus;
  offerExpiresAt?: string;
  joinedAt: string;
  promotedAt?: string;
  cancelledAt?: string;
  classSession?: ClassSession;
}

export interface TrainerAvailability extends BaseEntity {
  organisationId: string;
  trainerId: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  specificDate?: string;
  endDate?: string;
  isAvailable: boolean;
  timezone: string;
  notes?: string;
  reason?: string;
}

export interface RecurringSchedule extends BaseEntity {
  organisationId: string;
  outletId: string;
  classTemplateId: string;
  trainerId?: string;
  resourceId?: string;
  frequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  dayOfWeek: number;
  daysOfWeek?: number[];
  startTime: string;
  durationMinutes: number;
  customCapacity?: number;
  startDate: string;
  endDate?: string;
  timezone: string;
  isActive: boolean;
}

export interface BookingEligibilityResult {
  eligible: boolean;
  reason?: BookingDenialReason;
  message?: string;
  memberMembershipId?: string;
}

export type AttendanceStatus =
  | 'EXPECTED'
  | 'CHECKED_IN'
  | 'LATE'
  | 'LEFT_EARLY'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'EXCUSED'
  | 'WALK_IN';

export type ClassCheckInMethod =
  | 'STAFF'
  | 'MEMBER_SELF_SERVICE'
  | 'QR'
  | 'ACCESS_EVENT'
  | 'KIOSK'
  | 'MANUAL'
  | 'SYSTEM';

export type TrainerAttendanceStatus = 'PENDING' | 'PRESENT' | 'SUBSTITUTED' | 'ABSENT';

export interface AttendanceRecord extends BaseEntity {
  organisationId: string;
  outletId: string;
  classSessionId: string;
  memberProfileId: string;
  bookingId?: string | null;
  status: AttendanceStatus;
  checkInMethod: ClassCheckInMethod;
  checkOutMethod?: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  lateMinutes?: number | null;
  durationMinutes?: number | null;
  markedByUserId?: string | null;
  isOverride?: boolean;
  overrideReason?: string | null;
  notes?: string | null;
  memberProfile?: {
    id: string;
    userId: string;
    preferredName?: string | null;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
    };
  };
  classSession?: ClassSession;
  booking?: Booking;
}

// ==========================================
// DAY 11: STAFF & TRAINER MANAGEMENT DOMAIN
// ==========================================

export type StaffEmploymentStatus =
  | 'INVITED'
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'SUSPENDED'
  | 'INACTIVE'
  | 'TERMINATED';

export type StaffAssignmentStatus = 'ACTIVE' | 'INACTIVE' | 'TEMPORARY' | 'SCHEDULED';

export type TrainerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type CertificationStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'REVOKED';

export type TrainerAssignmentType = 'PRIMARY' | 'SECONDARY' | 'TEMPORARY' | 'GROUP_COACH';

export type TrainerAssignmentStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'REASSIGNED';

export interface StaffOutletAssignment extends BaseEntity {
  staffProfileId: string;
  outletId: string;
  roleScope?: string | null;
  status: StaffAssignmentStatus;
  isPrimary: boolean;
  startDate: string;
  endDate?: string | null;
  assignedById?: string | null;
  outlet?: Outlet;
}

export interface TrainerCertification extends BaseEntity {
  trainerProfileId: string;
  certificationName: string;
  issuingOrganisation: string;
  certificationNumber?: string | null;
  issueDate: string;
  expiryDate?: string | null;
  documentReference?: string | null;
  documentUrl?: string | null;
  documentMetadata?: Record<string, any> | null;
  status: CertificationStatus;
  verifiedAt?: string | null;
  verifiedById?: string | null;
}

export interface TrainerClientAssignment extends BaseEntity {
  organisationId: string;
  outletId?: string | null;
  trainerProfileId: string;
  memberProfileId: string;
  assignmentType: TrainerAssignmentType;
  status: TrainerAssignmentStatus;
  startDate: string;
  endDate?: string | null;
  assignedById?: string | null;
  notes?: string | null;
  previousAssignmentId?: string | null;
  trainerProfile?: TrainerProfile;
  memberProfile?: MemberProfile;
  outlet?: Outlet;
}

export interface TrainerProfile extends BaseEntity {
  staffProfileId: string;
  organisationId: string;
  professionalName: string;
  bio?: string | null;
  profilePhotoUrl?: string | null;
  specialties: string[];
  yearsExperience: number;
  languages: string[];
  coachingStyle?: string | null;
  trainingApproach?: string | null;
  consultationAvailability?: string | null;
  status: TrainerStatus;
  certifications?: TrainerCertification[];
  clientAssignments?: TrainerClientAssignment[];
  staffProfile?: StaffProfile;
}

export interface StaffProfile extends BaseEntity {
  userId: string;
  organisationId: string;
  employeeReference?: string | null;
  displayName: string;
  jobTitle: string;
  employmentStatus: StaffEmploymentStatus;
  phone?: string | null;
  workEmail?: string | null;
  bio?: string | null;
  profilePhotoUrl?: string | null;
  hireDate?: string | null;
  terminationDate?: string | null;
  user?: User;
  outletAssignments?: StaffOutletAssignment[];
  trainerProfile?: TrainerProfile | null;
}

// ==========================================
// DAY 12: PERSONAL TRAINING & COACHING DOMAIN
// ==========================================

export type TrainingProgramStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type GoalCategory =
  | 'WEIGHT_LOSS'
  | 'MUSCLE_GAIN'
  | 'STRENGTH'
  | 'ENDURANCE'
  | 'MOBILITY'
  | 'GENERAL_FITNESS'
  | 'SPORTS_PERFORMANCE'
  | 'BODY_COMPOSITION'
  | 'REHABILITATION'
  | 'HABIT_FORMATION';

export type GoalStatus = 'ACTIVE' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';

export type TrainingGoalCategory = GoalCategory;
export type TrainingGoalStatus = GoalStatus;

export type TrainerNoteType = 'GENERAL' | 'SESSION' | 'PROGRAM' | 'GOAL' | 'FOLLOW_UP' | 'COACHING';

export type TrainerNoteVisibility = 'PRIVATE' | 'STAFF' | 'MEMBER_VISIBLE';

export type PTSessionStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type PTSessionType = 'ONE_ON_ONE' | 'CONSULTATION' | 'ASSESSMENT';

export interface TrainingProgram extends BaseEntity {
  organisationId: string;
  outletId?: string | null;
  memberProfileId: string;
  trainerProfileId: string;
  name: string;
  description?: string | null;
  status: TrainingProgramStatus;
  startDate: string;
  endDate?: string | null;
  activatedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  metadata?: Record<string, any> | null;
  memberProfile?: MemberProfile;
  trainerProfile?: TrainerProfile;
  goals?: TrainingGoal[];
  sessions?: PersonalTrainingSession[];
  notes?: TrainerNote[];
}

export interface TrainingGoal extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  trainingProgramId?: string | null;
  createdById?: string | null;
  title: string;
  description?: string | null;
  category: GoalCategory;
  baselineValue?: number | null;
  targetValue?: number | null;
  currentValue?: number | null;
  unit?: string | null;
  targetDate?: string | null;
  priority: number;
  status: GoalStatus;
  completedAt?: string | null;
  cancelledAt?: string | null;
  memberProfile?: MemberProfile;
  trainingProgram?: TrainingProgram;
  history?: GoalHistory[];
  notes?: TrainerNote[];
}

export interface GoalHistory extends BaseEntity {
  goalId: string;
  actorId?: string | null;
  previousStatus?: string | null;
  newStatus: string;
  previousValue?: number | null;
  newValue?: number | null;
  changeReason?: string | null;
  notes?: string | null;
  goal?: TrainingGoal;
  actor?: User;
}

export interface TrainerNote extends BaseEntity {
  organisationId: string;
  outletId?: string | null;
  memberProfileId: string;
  trainerProfileId: string;
  trainingProgramId?: string | null;
  trainingGoalId?: string | null;
  personalTrainingSessionId?: string | null;
  noteType: TrainerNoteType;
  content: string;
  visibility: TrainerNoteVisibility;
  isPinned: boolean;
  memberProfile?: MemberProfile;
  trainerProfile?: TrainerProfile;
  trainingProgram?: TrainingProgram;
  trainingGoal?: TrainingGoal;
  personalTrainingSession?: PersonalTrainingSession;
}

export interface PersonalTrainingSession extends BaseEntity {
  organisationId: string;
  outletId: string;
  memberProfileId: string;
  trainerProfileId: string;
  trainingProgramId?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  status: PTSessionStatus;
  sessionType: PTSessionType;
  location?: string | null;
  cancellationReason?: string | null;
  cancelledById?: string | null;
  cancelledAt?: string | null;
  attendanceRecordId?: string | null;
  bookingReference?: string | null;
  notes?: string | null;
  memberProfile?: MemberProfile;
  trainerProfile?: TrainerProfile;
  trainingProgram?: TrainingProgram;
  attendanceRecord?: AttendanceRecord;
  cancelledBy?: User;
  notesList?: TrainerNote[];
}

// ==========================================
// DAY 13: EXERCISE LIBRARY & WORKOUT PROGRAMMING DOMAIN
// ==========================================

export type ExerciseOwnershipType = 'SYSTEM' | 'ORGANISATION';
export type ExerciseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type ExerciseType =
  | 'STRENGTH'
  | 'CARDIO'
  | 'MOBILITY'
  | 'FLEXIBILITY'
  | 'BALANCE'
  | 'PLYOMETRIC'
  | 'REHABILITATION'
  | 'RECOVERY'
  | 'FUNCTIONAL'
  | 'CORE'
  | 'OTHER';

export type MovementPattern =
  | 'SQUAT'
  | 'HINGE'
  | 'LUNGE'
  | 'PUSH'
  | 'PULL'
  | 'CARRY'
  | 'ROTATION'
  | 'ANTI_ROTATION'
  | 'GAIT'
  | 'JUMP'
  | 'ISOMETRIC'
  | 'OTHER';

export type MuscleGroup =
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'FOREARMS'
  | 'QUADRICEPS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'CORE'
  | 'FULL_BODY'
  | 'OTHER';

export type EquipmentType =
  | 'BODYWEIGHT'
  | 'BARBELL'
  | 'DUMBBELL'
  | 'KETTLEBELL'
  | 'CABLE'
  | 'MACHINE'
  | 'BAND'
  | 'BENCH'
  | 'RACK'
  | 'MEDICINE_BALL'
  | 'TRX'
  | 'ROWER'
  | 'BIKE'
  | 'TREADMILL'
  | 'OTHER'
  | 'NONE';

export type ExerciseMediaType = 'IMAGE' | 'VIDEO' | 'THUMBNAIL';
export type PrescriptionType =
  | 'REPETITIONS'
  | 'TIME'
  | 'DISTANCE'
  | 'CALORIES'
  | 'LOAD'
  | 'AMRAP'
  | 'EMOM'
  | 'INTERVAL'
  | 'ISOMETRIC'
  | 'CUSTOM';

export type WorkoutTemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type WorkoutStatus =
  | 'DRAFT'
  | 'ASSIGNED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED'
  | 'EXPIRED';

export type WorkoutExerciseStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type UnitSystem = 'METRIC' | 'IMPERIAL';
export type LoadUnit = 'KG' | 'LB';
export type DistanceUnit = 'KM' | 'MI' | 'M' | 'FT';

export interface Exercise extends BaseEntity {
  organisationId?: string | null;
  createdByUserId?: string | null;
  ownershipType: ExerciseOwnershipType;
  name: string;
  slug: string;
  description?: string | null;
  instructions?: string | null;
  coachingCues?: string[] | null;
  setupInstructions?: string | null;
  executionInstructions?: string | null;
  safetyNotes?: string | null;
  difficulty: ExerciseDifficulty;
  exerciseType: ExerciseType;
  movementPattern: MovementPattern;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[] | null;
  equipment: EquipmentType;
  bodyPosition?: string | null;
  laterality?: string | null;
  defaultUnit: string;
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt?: string | null;
  media?: ExerciseMedia[];
  createdByUser?: User;
}

export interface ExerciseMedia extends BaseEntity {
  exerciseId: string;
  mediaType: ExerciseMediaType;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  durationSeconds?: number | null;
  sortOrder: number;
  isPrimary: boolean;
  signedUrl?: string | null;
}

export interface WorkoutTemplate extends BaseEntity {
  organisationId: string;
  createdByStaffId?: string | null;
  name: string;
  description?: string | null;
  goal?: string | null;
  difficulty: ExerciseDifficulty;
  estimatedDurationMinutes?: number | null;
  status: WorkoutTemplateStatus;
  version: number;
  parentTemplateId?: string | null;
  parentTemplate?: WorkoutTemplate;
  childVersions?: WorkoutTemplate[];
  archivedAt?: string | null;
  exercises?: WorkoutTemplateExercise[];
  progressionRules?: WorkoutProgressionRule[];
}

export interface WorkoutTemplateExercise extends BaseEntity {
  workoutTemplateId: string;
  exerciseId: string;
  orderIndex: number;
  sectionName?: string | null;
  notes?: string | null;
  prescriptionType: PrescriptionType;
  targetSets?: number | null;
  targetReps?: number | null;
  targetDurationSeconds?: number | null;
  targetDistance?: number | null;
  targetLoad?: number | null;
  targetRPE?: number | null;
  restSeconds?: number | null;
  exercise?: Exercise;
}

export interface Workout extends BaseEntity {
  organisationId: string;
  outletId?: string | null;
  memberProfileId: string;
  trainerProfileId?: string | null;
  trainingProgramId?: string | null;
  trainingPlanId?: string | null;
  workoutTemplateId?: string | null;
  personalTrainingSessionId?: string | null;
  title: string;
  description?: string | null;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  estimatedDurationMinutes?: number | null;
  status: WorkoutStatus;
  assignedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  notes?: string | null;
  exercises?: WorkoutExercise[];
  exerciseGroups?: WorkoutExerciseGroup[];
  trainingPlanDays?: TrainingPlanDay[];
  memberProfile?: MemberProfile;
  trainerProfile?: TrainerProfile;
  trainingProgram?: TrainingProgram;
  trainingPlan?: TrainingPlan;
  workoutTemplate?: WorkoutTemplate;
  personalTrainingSession?: PersonalTrainingSession;
}

export interface WorkoutExercise extends BaseEntity {
  workoutId: string;
  workoutExerciseGroupId?: string | null;
  exerciseId: string;
  orderIndex: number;
  sectionName?: string | null;
  exerciseNameSnapshot: string;
  instructionSnapshot?: string | null;
  coachingCueSnapshot?: string | null;
  prescriptionType: PrescriptionType;
  targetSets?: number | null;
  targetReps?: number | null;
  targetDurationSeconds?: number | null;
  targetDistance?: number | null;
  targetLoad?: number | null;
  targetRPE?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  status: WorkoutExerciseStatus;
  sets?: WorkoutSet[];
  exercise?: Exercise;
  workoutExerciseGroup?: WorkoutExerciseGroup;
}

export interface WorkoutSet extends BaseEntity {
  workoutExerciseId: string;
  setNumber: number;
  targetReps?: number | null;
  actualReps?: number | null;
  targetLoad?: number | null;
  actualLoad?: number | null;
  loadUnit: LoadUnit;
  targetDurationSeconds?: number | null;
  actualDurationSeconds?: number | null;
  targetDistance?: number | null;
  actualDistance?: number | null;
  distanceUnit?: DistanceUnit | null;
  targetRPE?: number | null;
  actualRPE?: number | null;
  completed: boolean;
  idempotencyKey?: string | null;
  notes?: string | null;
  completedAt?: string | null;
  corrections?: WorkoutSetCorrection[];
}

export interface WorkoutSetCorrection extends BaseEntity {
  workoutSetId: string;
  correctedByUserId: string;
  previousReps?: number | null;
  newReps?: number | null;
  previousLoad?: number | null;
  newLoad?: number | null;
  previousRPE?: number | null;
  newRPE?: number | null;
  reason: string;
  correctedByUser?: User;
}

// ==========================================
// DAY 14: ADVANCED WORKOUT PROGRAMMING & TRAINING PLANS
// ==========================================

export type TrainingPlanStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type TrainingPlanWeekStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED';

export type WorkoutExerciseGroupType =
  | 'SINGLE'
  | 'SUPERSET'
  | 'TRISET'
  | 'GIANT_SET'
  | 'CIRCUIT'
  | 'EMOM'
  | 'AMRAP'
  | 'INTERVAL';

export type WorkoutSectionType =
  | 'WARM_UP'
  | 'ACTIVATION'
  | 'MAIN'
  | 'ACCESSORY'
  | 'CONDITIONING'
  | 'COOL_DOWN'
  | 'RECOVERY'
  | 'OTHER';

export type ProgressionType =
  | 'LINEAR_LOAD'
  | 'REP_PROGRESSION'
  | 'SET_PROGRESSION'
  | 'TIME_PROGRESSION'
  | 'DISTANCE_PROGRESSION'
  | 'RPE_PROGRESSION'
  | 'CUSTOM';

export interface TrainingPlan extends BaseEntity {
  organisationId: string;
  trainingProgramId?: string | null;
  memberProfileId: string;
  trainerProfileId: string;
  name: string;
  description?: string | null;
  objective?: string | null;
  durationWeeks: number;
  startDate: string;
  endDate?: string | null;
  status: TrainingPlanStatus;
  weeks?: TrainingPlanWeek[];
  workouts?: Workout[];
  progressionRules?: WorkoutProgressionRule[];
  memberProfile?: MemberProfile;
  trainerProfile?: TrainerProfile;
  trainingProgram?: TrainingProgram;
}

export interface TrainingPlanWeek extends BaseEntity {
  trainingPlanId: string;
  weekNumber: number;
  name?: string | null;
  focus?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: TrainingPlanWeekStatus;
  days?: TrainingPlanDay[];
  trainingPlan?: TrainingPlan;
}

export interface TrainingPlanDay extends BaseEntity {
  trainingPlanWeekId: string;
  dayNumber: number;
  date?: string | null;
  name?: string | null;
  focus?: string | null;
  workoutId?: string | null;
  restDay: boolean;
  notes?: string | null;
  workout?: Workout | null;
  trainingPlanWeek?: TrainingPlanWeek;
}

export interface WorkoutExerciseGroup extends BaseEntity {
  workoutId: string;
  name: string;
  type: WorkoutExerciseGroupType;
  section: WorkoutSectionType;
  orderIndex: number;
  rounds: number;
  restBetweenExercises?: number | null;
  restBetweenRounds?: number | null;
  durationSeconds?: number | null;
  notes?: string | null;
  exercises?: WorkoutExercise[];
}

export interface WorkoutProgressionRule extends BaseEntity {
  organisationId: string;
  trainingPlanId?: string | null;
  workoutTemplateId?: string | null;
  exerciseId?: string | null;
  progressionType: ProgressionType;
  configuration: Record<string, unknown>;
  active: boolean;
  notes?: string | null;
}

export interface PlanAdherenceMetrics {
  totalScheduled: number;
  completed: number;
  skipped: number;
  overdue: number;
  pending: number;
  adherencePercentage: number;
}

// ==========================================
// DAY 15: PROGRESS TRACKING & ANALYTICS TYPES
// ==========================================

export type MeasurementType =
  | 'WEIGHT'
  | 'HEIGHT'
  | 'BODY_FAT_PERCENT'
  | 'BMI'
  | 'CHEST'
  | 'WAIST'
  | 'HIPS'
  | 'NECK'
  | 'LEFT_ARM'
  | 'RIGHT_ARM'
  | 'LEFT_THIGH'
  | 'RIGHT_THIGH'
  | 'LEFT_CALF'
  | 'RIGHT_CALF'
  | 'SHOULDERS'
  | 'CUSTOM';

export type MeasurementSource =
  | 'MEMBER'
  | 'TRAINER'
  | 'STAFF'
  | 'SYSTEM'
  | 'ASSESSMENT'
  | 'WORKOUT'
  | 'IMPORT';

export interface BodyMeasurement extends BaseEntity {
  organisationId: string;
  outletId?: string | null;
  memberProfileId: string;
  measurementType: MeasurementType;
  value: number;
  unit: string;
  recordedAt: string;
  source: MeasurementSource;
  recordedByUserId?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type AssessmentCategory =
  | 'STRENGTH'
  | 'ENDURANCE'
  | 'CARDIO'
  | 'MOBILITY'
  | 'FLEXIBILITY'
  | 'BALANCE'
  | 'BODY_COMPOSITION'
  | 'FUNCTIONAL'
  | 'CUSTOM';

export type AssessmentMetricType =
  | 'REPETITIONS'
  | 'WEIGHT'
  | 'TIME'
  | 'DISTANCE'
  | 'SCORE'
  | 'RATING'
  | 'PERCENTAGE'
  | 'BOOLEAN'
  | 'TEXT'
  | 'CUSTOM';

export interface AssessmentTemplate extends BaseEntity {
  organisationId?: string | null;
  name: string;
  slug: string;
  category: AssessmentCategory;
  description?: string | null;
  instructions?: string | null;
  metricType: AssessmentMetricType;
  defaultUnit?: string | null;
  scoringProtocol?: string | null;
  targetGender?: string | null;
  targetAgeRange?: string | null;
  active: boolean;
}

export type AssessmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface AssessmentResult extends BaseEntity {
  assessmentId: string;
  metricName: string;
  value?: number | null;
  unit?: string | null;
  textValue?: string | null;
  rating?: number | null;
  score?: number | null;
  repetitions?: number | null;
  weight?: number | null;
  distance?: number | null;
  durationSeconds?: number | null;
  percentage?: number | null;
  booleanResult?: boolean | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface Assessment extends BaseEntity {
  organisationId: string;
  outletId?: string | null;
  memberProfileId: string;
  trainerProfileId?: string | null;
  templateId?: string | null;
  title: string;
  category: AssessmentCategory;
  status: AssessmentStatus;
  scheduledDate?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  summaryScore?: number | null;
  template?: AssessmentTemplate | null;
  results?: AssessmentResult[];
}

export type PRType =
  | 'MAX_WEIGHT'
  | 'MAX_REPS'
  | 'MAX_VOLUME'
  | 'FASTEST_TIME'
  | 'LONGEST_DISTANCE'
  | 'LONGEST_DURATION'
  | 'BEST_SCORE'
  | 'CUSTOM';

export interface PersonalRecord extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  exerciseId: string;
  recordType: PRType;
  value: number;
  unit: string;
  workoutId?: string | null;
  workoutExerciseId?: string | null;
  workoutSetId?: string | null;
  achievedAt: string;
  previousValue?: number | null;
  improvementPercentage?: number | null;
  notes?: string | null;
  exercise?: Exercise;
}

export interface ProgressSnapshot extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  snapshotDate: string;
  period: string;
  adherenceRate: number;
  workoutsCompleted: number;
  tonnageLifted: number;
  prsAchieved: number;
  measurementsSummary?: Record<string, unknown> | null;
  assessmentsSummary?: Record<string, unknown> | null;
  goalProgressSummary?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export type TimeRangePeriod =
  | '7D'
  | '14D'
  | '30D'
  | '90D'
  | '6M'
  | '1Y'
  | 'ALL'
  | 'CUSTOM';

export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';

export interface AdherenceSummary {
  totalScheduled: number;
  completed: number;
  skipped: number;
  overdue: number;
  cancelled: number;
  pending: number;
  adherenceRate: number;
  completionRate: number;
  period: TimeRangePeriod | string;
}

export interface ProgressSummary {
  memberProfileId: string;
  period: TimeRangePeriod | string;
  adherence: AdherenceSummary;
  tonnageLifted: number;
  workoutsCompleted: number;
  recentMeasurements: BodyMeasurement[];
  recentAssessments: Assessment[];
  personalRecords: PersonalRecord[];
  activeGoals: Array<{
    id: string;
    title: string;
    category: string;
    baselineValue?: number | null;
    targetValue?: number | null;
    currentValue?: number | null;
    unit?: string | null;
    progressPercentage: number;
    status: string;
  }>;
}

// ==========================================
// DAY 16: NUTRITION, MEAL PLANNING & FOOD TRACKING
// ==========================================

export type DietaryPattern =
  | 'OMNIVORE'
  | 'VEGETARIAN'
  | 'VEGAN'
  | 'PESCATARIAN'
  | 'KETO'
  | 'LOW_CARB'
  | 'HIGH_PROTEIN'
  | 'CUSTOM';

export type NutritionGoalCategory =
  | 'WEIGHT_LOSS'
  | 'MAINTENANCE'
  | 'MUSCLE_GAIN'
  | 'PERFORMANCE'
  | 'HEALTH';

export type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHTLY_ACTIVE'
  | 'MODERATELY_ACTIVE'
  | 'VERY_ACTIVE'
  | 'EXTREMELY_ACTIVE';

export type PreferenceType =
  | 'LIKE'
  | 'DISLIKE'
  | 'AVOID'
  | 'ALLERGY'
  | 'INTOLERANCE'
  | 'RELIGIOUS_RESTRICTION';

export type PreferenceSeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'ANAPHYLACTIC';

export type MealType =
  | 'BREAKFAST'
  | 'LUNCH'
  | 'DINNER'
  | 'SNACK'
  | 'PRE_WORKOUT'
  | 'POST_WORKOUT'
  | 'OTHER';

export type FoodOwnership = 'SYSTEM' | 'ORGANISATION';

export type FoodCategory =
  | 'PROTEIN'
  | 'GRAINS'
  | 'VEGETABLES'
  | 'FRUITS'
  | 'DAIRY'
  | 'FATS_OILS'
  | 'SNACKS'
  | 'BEVERAGES'
  | 'SUPPLEMENTS'
  | 'OTHER';

export type TargetSource = 'MEMBER_DEFINED' | 'TRAINER_ASSIGNED' | 'DEFAULT';

export type MealPlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type MealPlanAssignmentStatus =
  | 'ASSIGNED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface NutritionProfile extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  dietaryPattern: DietaryPattern;
  activityLevel?: ActivityLevel | null;
  nutritionGoal?: NutritionGoalCategory | null;
  preferredUnits: string; // METRIC, IMPERIAL
  timezone: string;
  allergies: string[];
  intolerances: string[];
  foodsAvoided: string[];
  dietaryRestrictions?: string | null;
  notes?: string | null;
  status: string;
  preferences?: DietaryPreference[];
  targets?: NutritionTarget[];
}

export interface DietaryPreference extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  preferenceType: PreferenceType;
  itemName: string;
  severity?: PreferenceSeverity | null;
  notes?: string | null;
}

export interface NutritionTarget extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  dailyCalories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams?: number | null;
  waterMl?: number | null;
  minCalories?: number | null;
  maxCalories?: number | null;
  minProtein?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  source: TargetSource;
  assignedById?: string | null;
  status: 'ACTIVE' | 'HISTORICAL' | 'ARCHIVED';
  notes?: string | null;
}

export interface Food extends BaseEntity {
  organisationId?: string | null;
  ownership: FoodOwnership;
  name: string;
  brand?: string | null;
  category: FoodCategory;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number; // mg
  calcium?: number | null;
  iron?: number | null;
  potassium?: number | null;
  vitaminD?: number | null;
  vitaminB12?: number | null;
  micronutrients?: Record<string, unknown> | null;
  barcode?: string | null;
  verified: boolean;
  status: string;
  createdById?: string | null;
}

export interface Meal extends BaseEntity {
  organisationId: string;
  memberProfileId?: string | null;
  name: string;
  mealType: MealType;
  scheduledTime?: string | null;
  notes?: string | null;
  status: string;
  workoutId?: string | null;
  items?: MealFoodItem[];
}

export interface MealFoodItem extends BaseEntity {
  mealId: string;
  foodId: string;
  quantity: number;
  unit: string;
  sortOrder: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  food?: Food;
}

export interface MealPlan extends BaseEntity {
  organisationId: string;
  name: string;
  description?: string | null;
  dietaryPattern?: DietaryPattern | null;
  targetDailyCalories?: number | null;
  targetProteinGrams?: number | null;
  targetCarbGrams?: number | null;
  targetFatGrams?: number | null;
  durationDays: number;
  version: number;
  parentId?: string | null;
  status: MealPlanStatus;
  createdById?: string | null;
  days?: MealPlanDay[];
}

export interface MealPlanDay extends BaseEntity {
  mealPlanId: string;
  dayNumber: number;
  dayName?: string | null;
  notes?: string | null;
  meals?: MealPlanMeal[];
}

export interface MealPlanMeal extends BaseEntity {
  mealPlanDayId: string;
  name: string;
  mealType: MealType;
  notes?: string | null;
  sortOrder: number;
  items?: MealPlanFoodItem[];
}

export interface MealPlanFoodItem extends BaseEntity {
  mealPlanMealId: string;
  foodId: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  notes?: string | null;
  food?: Food;
}

export interface MemberMealPlanAssignment extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  mealPlanId: string;
  assignedById?: string | null;
  assignedAt: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: MealPlanAssignmentStatus;
  notes?: string | null;
  planSnapshot?: Record<string, unknown> | null;
  mealPlan?: MealPlan;
}

export interface FoodLog extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  mealId?: string | null;
  foodId: string;
  mealType: MealType;
  quantity: number;
  unit: string;
  consumedAt: string;
  // Nutrition Snapshot (Immutable historical values)
  foodNameAtLog: string;
  brandAtLog?: string | null;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  idempotencyKey?: string | null;
  notes?: string | null;
  loggedById: string;
  food?: Food;
}

export interface WaterLog extends BaseEntity {
  organisationId: string;
  memberProfileId: string;
  amountMl: number;
  loggedAt: string;
}

export interface DailyNutritionSummary {
  memberProfileId: string;
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbohydrates: number;
  totalFat: number;
  totalFiber: number;
  totalWaterMl: number;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbohydrates?: number | null;
  targetFat?: number | null;
  targetWaterMl?: number | null;
  calorieAdherencePct: number;
  proteinAdherencePct: number;
  carbAdherencePct: number;
  fatAdherencePct: number;
  waterAdherencePct: number;
  mealCount: number;
  foodItemCount: number;
  meals: Array<{
    mealType: MealType;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    items: FoodLog[];
  }>;
}

