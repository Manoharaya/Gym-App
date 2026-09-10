/**
 * FitCore Qualification Scoring Service (Day 38)
 *
 * Deterministically calculates:
 * - 7-dimension qualification completeness (0 - 100%)
 * - High-intent prospect evaluation
 * - Overall qualification status
 */

import { Injectable } from '@nestjs/common';
import {
  QUALIFICATION_DIMENSION_WEIGHTS,
  HIGH_INTENT_READINESS_LEVELS,
  HIGH_INTENT_TIMELINES,
} from '../domain/lead-qualification.constants';
import { LeadQualificationStatus } from '@fitcore/types';

export interface ProfileScoringInput {
  primaryGoal?: string | null;
  serviceInterests?: string[] | null;
  preferredOutletId?: string | null;
  preferredOutletName?: string | null;
  preferredDays?: string[] | null;
  preferredTimes?: string[] | null;
  scheduleFlexibility?: string | null;
  experienceLevel?: string | null;
  readiness?: string | null;
  budgetSensitivity?: string | null;
  budgetRange?: string | null;
  timeline?: string | null;
  requiresHumanReview?: boolean;
  hasBlockerObjection?: boolean;
}

export interface QualificationScoringResult {
  completeness: number; // 0 - 100
  isHighIntent: boolean;
  status: LeadQualificationStatus;
  dimensionBreakdown: Record<string, { weight: number; satisfied: boolean }>;
}

@Injectable()
export class QualificationScoringService {
  /**
   * Calculates 7-dimension completeness and evaluates qualification tier.
   */
  evaluateQualification(input: ProfileScoringInput): QualificationScoringResult {
    const breakdown: Record<string, { weight: number; satisfied: boolean }> = {};
    let completeness = 0;

    // 1. Goal (20%)
    const hasGoal = !!(input.primaryGoal && input.primaryGoal !== 'UNKNOWN');
    breakdown['GOAL'] = { weight: QUALIFICATION_DIMENSION_WEIGHTS.GOAL, satisfied: hasGoal };
    if (hasGoal) completeness += QUALIFICATION_DIMENSION_WEIGHTS.GOAL;

    // 2. Service Interest (15%)
    const hasService = !!(input.serviceInterests && input.serviceInterests.length > 0);
    breakdown['SERVICE_INTEREST'] = { weight: QUALIFICATION_DIMENSION_WEIGHTS.SERVICE_INTEREST, satisfied: hasService };
    if (hasService) completeness += QUALIFICATION_DIMENSION_WEIGHTS.SERVICE_INTEREST;

    // 3. Schedule (15%)
    const hasSchedule = !!(
      (input.preferredDays && input.preferredDays.length > 0) ||
      (input.preferredTimes && input.preferredTimes.length > 0) ||
      (input.scheduleFlexibility && input.scheduleFlexibility !== 'UNKNOWN')
    );
    breakdown['SCHEDULE'] = { weight: QUALIFICATION_DIMENSION_WEIGHTS.SCHEDULE, satisfied: hasSchedule };
    if (hasSchedule) completeness += QUALIFICATION_DIMENSION_WEIGHTS.SCHEDULE;

    // 4. Location (15%)
    const hasLocation = !!(input.preferredOutletId || input.preferredOutletName);
    breakdown['LOCATION'] = { weight: QUALIFICATION_DIMENSION_WEIGHTS.LOCATION, satisfied: hasLocation };
    if (hasLocation) completeness += QUALIFICATION_DIMENSION_WEIGHTS.LOCATION;

    // 5. Experience (10%)
    const hasExperience = !!(input.experienceLevel && input.experienceLevel !== 'UNKNOWN');
    breakdown['EXPERIENCE'] = { weight: QUALIFICATION_DIMENSION_WEIGHTS.EXPERIENCE, satisfied: hasExperience };
    if (hasExperience) completeness += QUALIFICATION_DIMENSION_WEIGHTS.EXPERIENCE;

    // 6. Membership Interest / Budget (15%)
    const hasMembershipInterest = !!(
      (input.budgetSensitivity && input.budgetSensitivity !== 'UNKNOWN') ||
      input.budgetRange ||
      (input.serviceInterests && input.serviceInterests.includes('MEMBERSHIP'))
    );
    breakdown['MEMBERSHIP_INTEREST'] = { weight: QUALIFICATION_DIMENSION_WEIGHTS.MEMBERSHIP_INTEREST, satisfied: hasMembershipInterest };
    if (hasMembershipInterest) completeness += QUALIFICATION_DIMENSION_WEIGHTS.MEMBERSHIP_INTEREST;

    // 7. Readiness and Timeline (10%)
    const hasReadinessOrTimeline = !!(
      (input.readiness && input.readiness !== 'UNKNOWN') ||
      (input.timeline && input.timeline !== 'UNKNOWN')
    );
    breakdown['READINESS_AND_TIMELINE'] = { weight: QUALIFICATION_DIMENSION_WEIGHTS.READINESS_AND_TIMELINE, satisfied: hasReadinessOrTimeline };
    if (hasReadinessOrTimeline) completeness += QUALIFICATION_DIMENSION_WEIGHTS.READINESS_AND_TIMELINE;

    // High intent evaluation
    const isHighIntent =
      (!!input.readiness && HIGH_INTENT_READINESS_LEVELS.has(input.readiness)) ||
      (!!input.timeline && HIGH_INTENT_TIMELINES.has(input.timeline) && hasGoal);

    // Status determination
    let status: LeadQualificationStatus = 'NOT_STARTED';
    if (input.requiresHumanReview || input.hasBlockerObjection) {
      status = 'NEEDS_HUMAN_REVIEW';
    } else if (completeness >= 70) {
      status = 'QUALIFIED';
    } else if (completeness >= 30) {
      status = 'PARTIALLY_QUALIFIED';
    } else if (completeness > 0) {
      status = 'IN_PROGRESS';
    }

    return {
      completeness: Math.min(100, Math.max(0, completeness)),
      isHighIntent,
      status,
      dimensionBreakdown: breakdown,
    };
  }
}
