/**
 * Day 33 — Deterministic Lead Scoring Service
 * Calculates an explainable, deterministic 0–100 score based on structured signals.
 * Protects against opaque AI score manipulation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { LeadScoreFactor } from '@fitcore/types';

export interface ScoringInput {
  status?: string;
  source?: string;
  email?: string | null;
  phone?: string | null;
  consentStatus?: string | null;
  goals?: string[] | null;
  serviceInterests?: string[] | null;
  preferredOutletId?: string | null;
  preferredSchedule?: string | null;
  experienceLevel?: string | null;
  readiness?: string | null;
  priceSensitivity?: string | null;
}

export interface ScoringResult {
  score: number;
  scoreVersion: number;
  scoreFactors: LeadScoreFactor[];
  calculatedAt: Date;
}

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);
  public static readonly CURRENT_SCORE_VERSION = 1;

  /**
   * Deterministically evaluates a lead's qualification signals and returns an explainable score.
   */
  calculateScore(input: ScoringInput): ScoringResult {
    const factors: LeadScoreFactor[] = [];
    let rawScore = 0;

    // 1. Service Interest Dimensions (Max 25 pts)
    const interests = (input.serviceInterests || []).map((s) => s.toUpperCase());
    if (interests.includes('MEMBERSHIP')) {
      factors.push({
        factor: 'MEMBERSHIP_INTEREST',
        points: 25,
        description: 'Explicit interest in ongoing gym membership',
      });
      rawScore += 25;
    } else if (interests.includes('PERSONAL_TRAINING')) {
      factors.push({
        factor: 'PT_INTEREST',
        points: 20,
        description: 'High-value interest in personal training / coaching',
      });
      rawScore += 20;
    } else if (interests.includes('GROUP_CLASSES')) {
      factors.push({
        factor: 'CLASSES_INTEREST',
        points: 15,
        description: 'Interest in group exercise classes',
      });
      rawScore += 15;
    } else if (interests.includes('TRIAL') || interests.includes('TOUR')) {
      factors.push({
        factor: 'TRIAL_OR_TOUR_INTEREST',
        points: 15,
        description: 'Requested a gym trial or facility tour',
      });
      rawScore += 15;
    }

    // 2. Readiness Level (Max 25 pts)
    const readiness = (input.readiness || '').toUpperCase();
    if (readiness === 'READY_TO_JOIN') {
      factors.push({
        factor: 'READINESS_READY_TO_JOIN',
        points: 25,
        description: 'Prospect indicated immediate readiness to sign up',
      });
      rawScore += 25;
    } else if (readiness === 'READY_TO_TRY' || readiness === 'READY_TO_VISIT') {
      factors.push({
        factor: 'READINESS_VISIT_OR_TRY',
        points: 20,
        description: 'Prospect wants to visit or trial the facility shortly',
      });
      rawScore += 20;
    } else if (readiness === 'INTERESTED') {
      factors.push({
        factor: 'READINESS_INTERESTED',
        points: 10,
        description: 'Active interest demonstrated with responsive engagement',
      });
      rawScore += 10;
    } else if (readiness === 'EXPLORING') {
      factors.push({
        factor: 'READINESS_EXPLORING',
        points: 5,
        description: 'Early exploratory interest',
      });
      rawScore += 5;
    }

    // 3. Contact Details & Consent (Max 20 pts)
    if (input.email && input.email.includes('@')) {
      factors.push({
        factor: 'VALID_EMAIL_PROVIDED',
        points: 10,
        description: 'Valid email contact provided',
      });
      rawScore += 10;
    }

    if (input.phone && input.phone.length >= 7) {
      factors.push({
        factor: 'VALID_PHONE_PROVIDED',
        points: 10,
        description: 'Valid telephone contact provided',
      });
      rawScore += 10;
    }

    if (input.consentStatus === 'GRANTED') {
      factors.push({
        factor: 'COMMUNICATION_CONSENT_GRANTED',
        points: 5,
        description: 'Explicit consent granted for follow-up communications',
      });
      rawScore += 5;
    }

    // 4. Preferred Preferences (Max 15 pts)
    if (input.preferredOutletId) {
      factors.push({
        factor: 'PREFERRED_OUTLET_SELECTED',
        points: 8,
        description: 'Prospect selected a specific club location',
      });
      rawScore += 8;
    }

    if (input.preferredSchedule && input.preferredSchedule !== 'UNKNOWN') {
      factors.push({
        factor: 'PREFERRED_SCHEDULE_DEFINED',
        points: 7,
        description: `Stated preferred training schedule (${input.preferredSchedule})`,
      });
      rawScore += 7;
    }

    // 5. Stated Goals & Experience (Max 15 pts)
    const goals = input.goals || [];
    if (goals.length > 0) {
      factors.push({
        factor: 'FITNESS_GOALS_DECLARED',
        points: 10,
        description: `Articulated ${goals.length} fitness goal(s): ${goals.slice(0, 2).join(', ')}`,
      });
      rawScore += 10;
    }

    if (input.experienceLevel && input.experienceLevel !== 'UNKNOWN') {
      factors.push({
        factor: 'EXPERIENCE_LEVEL_DISCLOSED',
        points: 5,
        description: `Training experience declared (${input.experienceLevel})`,
      });
      rawScore += 5;
    }

    // 6. Lead Status Modifier
    const status = (input.status || '').toUpperCase();
    if (status === 'DO_NOT_CONTACT' || status === 'UNQUALIFIED' || status === 'LOST') {
      factors.push({
        factor: 'STATUS_PENALTY',
        points: -rawScore,
        description: `Lead status is ${status}; score zeroed`,
      });
      rawScore = 0;
    }

    // Cap between 0 and 100
    const finalScore = Math.max(0, Math.min(100, rawScore));

    return {
      score: finalScore,
      scoreVersion: LeadScoringService.CURRENT_SCORE_VERSION,
      scoreFactors: factors,
      calculatedAt: new Date(),
    };
  }
}
