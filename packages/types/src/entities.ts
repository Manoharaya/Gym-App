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
  phone?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
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

export interface MemberProfile extends TenantScopedEntity {
  userId: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  dateOfBirth?: string;
  gender?: string;
  medicalConditions?: string[];
  fitnessGoals?: string[];
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

export interface MedicalDocument extends TenantScopedEntity {
  userId: string;
  documentId: string;
  clearedByDoctor: boolean;
  doctorName?: string;
  clearanceExpiryDate?: string;
}

export interface Consent extends TenantScopedEntity {
  userId: string;
  consentType:
    'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'HEALTH_DATA_COLLECTION' | 'LIABILITY_WAIVER';
  version: string;
  consentedAt: string;
  ipAddress?: string;
}

export interface Signature extends TenantScopedEntity {
  userId: string;
  documentId: string;
  signatureUrl: string;
  signedAt: string;
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
