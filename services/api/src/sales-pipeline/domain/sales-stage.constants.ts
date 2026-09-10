import { SalesStage, SalesLossReason } from '@fitcore/types';

export interface StageDefinition {
  stage: SalesStage;
  order: number;
  displayName: string;
  description: string;
  color: string;
  defaultSlaHours: number;
  isTerminal: boolean;
}

export const CANONICAL_STAGE_DEFINITIONS: Record<SalesStage, StageDefinition> = {
  NEW: {
    stage: 'NEW',
    order: 0,
    displayName: 'New Lead',
    description: 'Fresh lead captured; pending first outreach or sales agent review.',
    color: '#3B82F6', // Blue
    defaultSlaHours: 2,
    isTerminal: false,
  },
  CONTACTED: {
    stage: 'CONTACTED',
    order: 1,
    displayName: 'Contacted',
    description: 'Initial outreach made via AI receptionist, sales agent, call, SMS, or email.',
    color: '#8B5CF6', // Purple
    defaultSlaHours: 24,
    isTerminal: false,
  },
  QUALIFIED: {
    stage: 'QUALIFIED',
    order: 2,
    displayName: 'Qualified',
    description: 'Prospect intent, schedule, and readiness verified; ready for trial or tour.',
    color: '#10B981', // Emerald
    defaultSlaHours: 48,
    isTerminal: false,
  },
  TRIAL: {
    stage: 'TRIAL',
    order: 3,
    displayName: 'Trial Booked / Active',
    description: 'Complimentary trial workout or class pass scheduled or currently active.',
    color: '#F59E0B', // Amber
    defaultSlaHours: 72,
    isTerminal: false,
  },
  TOUR_BOOKED: {
    stage: 'TOUR_BOOKED',
    order: 4,
    displayName: 'Tour Scheduled',
    description: 'Facility tour or walk-through appointment booked with front desk or sales.',
    color: '#EC4899', // Pink
    defaultSlaHours: 48,
    isTerminal: false,
  },
  OFFERED: {
    stage: 'OFFERED',
    order: 5,
    displayName: 'Offer Extended',
    description: 'Formal membership proposal, corporate quote, or promotion extended.',
    color: '#6366F1', // Indigo
    defaultSlaHours: 48,
    isTerminal: false,
  },
  CONVERTED: {
    stage: 'CONVERTED',
    order: 6,
    displayName: 'Converted Member',
    description: 'Prospect converted into paying or active member backed by authoritative verification.',
    color: '#059669', // Dark Emerald
    defaultSlaHours: 0,
    isTerminal: true,
  },
  LOST: {
    stage: 'LOST',
    order: 7,
    displayName: 'Lost / Closed',
    description: 'Opportunity dropped, unreachable, or declined with structured loss reason.',
    color: '#EF4444', // Red
    defaultSlaHours: 0,
    isTerminal: true,
  },
};

/**
 * Valid directed state machine transitions.
 * Any non-terminal stage can transition to LOST (requires lossReason).
 * High-velocity skips (e.g. NEW -> TRIAL or CONTACTED -> OFFERED) are allowed when criteria are met.
 * Lost deals can be reopened back to NEW, CONTACTED, or QUALIFIED.
 */
export const ALLOWED_STAGE_TRANSITIONS: Record<SalesStage, SalesStage[]> = {
  NEW: ['CONTACTED', 'QUALIFIED', 'TRIAL', 'TOUR_BOOKED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'TRIAL', 'TOUR_BOOKED', 'OFFERED', 'LOST'],
  QUALIFIED: ['TRIAL', 'TOUR_BOOKED', 'OFFERED', 'CONVERTED', 'LOST'],
  TRIAL: ['TOUR_BOOKED', 'OFFERED', 'CONVERTED', 'LOST'],
  TOUR_BOOKED: ['TRIAL', 'OFFERED', 'CONVERTED', 'LOST'],
  OFFERED: ['CONVERTED', 'LOST'],
  CONVERTED: [], // Terminal - cannot leave CONVERTED
  LOST: ['NEW', 'CONTACTED', 'QUALIFIED'], // Reopening allowed
};

export function isValidStageTransition(fromStage: SalesStage, toStage: SalesStage): boolean {
  if (fromStage === toStage) return true; // Idempotent no-op
  const allowed = ALLOWED_STAGE_TRANSITIONS[fromStage] || [];
  return allowed.includes(toStage);
}

export function isTerminalStage(stage: SalesStage): boolean {
  return CANONICAL_STAGE_DEFINITIONS[stage]?.isTerminal ?? false;
}

export function isReopeningTransition(fromStage: SalesStage, toStage: SalesStage): boolean {
  return fromStage === 'LOST' && ['NEW', 'CONTACTED', 'QUALIFIED'].includes(toStage);
}

export const VALID_LOSS_REASONS: SalesLossReason[] = [
  'PRICE',
  'NO_RESPONSE',
  'NOT_INTERESTED',
  'CHOSE_COMPETITOR',
  'LOCATION',
  'SCHEDULE',
  'SERVICE_MISMATCH',
  'TIMING',
  'FAILED_TRIAL',
  'FAILED_TOUR',
  'COULD_NOT_CONTACT',
  'DUPLICATE',
  'INVALID_LEAD',
  'OTHER',
];
