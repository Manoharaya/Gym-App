/**
 * FitCore AI Lead Qualification Constants & Domain Rules (Day 38)
 */

import { QualificationDataSource, LeadObjectionType, LeadObjectionStatus } from '@fitcore/types';

export const DATA_SOURCE_AUTHORITY_PRIORITY: Record<QualificationDataSource, number> = {
  DIRECT_CUSTOMER_STATEMENT: 5,
  VERIFIED_BUSINESS_EVENT: 4,
  STAFF_ENTERED: 3,
  STAFF_ENTRY: 3,
  AI_EXTRACTION: 2,
  AI_INFERENCE: 1,
};

export const QUALIFICATION_DIMENSION_WEIGHTS = {
  GOAL: 20,
  SERVICE_INTEREST: 15,
  SCHEDULE: 15,
  LOCATION: 15,
  EXPERIENCE: 10,
  MEMBERSHIP_INTEREST: 15,
  READINESS_AND_TIMELINE: 10,
} as const;

export const HIGH_INTENT_READINESS_LEVELS = new Set([
  'READY_TO_JOIN',
  'READY_TO_TRY',
  'READY_TO_VISIT',
]);

export const HIGH_INTENT_TIMELINES = new Set([
  'IMMEDIATE',
  'THIS_WEEK',
]);

export const MEDICAL_SAFETY_KEYWORDS = [
  'heart condition',
  'chest pain',
  'cardiac',
  'angina',
  'hypertension',
  'high blood pressure',
  'stroke',
  'epilepsy',
  'seizure',
  'surgery',
  'post-op',
  'slip disc',
  'slipped disc',
  'herniated disc',
  'sciatica',
  'fracture',
  'broken bone',
  'torn acl',
  'torn meniscus',
  'ligament tear',
  'pregnancy',
  'pregnant',
  'severe asthma',
  'diabetes',
  'ghunda dukhchha', // Nepali: knee pain
  'dhad dukhchha',   // Nepali: back pain
  'apreshan gareko', // Nepali: had surgery
];

export const CLINICAL_SAFETY_DISCLAIMER =
  'FitCore is a fitness facility platform and does not provide medical or clinical diagnostics. ' +
  'Any medical symptoms or injuries must be cleared by a physician or licensed physiotherapist prior to exercise.';
