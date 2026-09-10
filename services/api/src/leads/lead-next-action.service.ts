/**
 * Day 33 — Lead Next Best Action Recommendation Engine
 * Evaluates lead signals deterministically to recommend the appropriate next step.
 * Follows AI RECOMMENDS -> HUMAN / WORKFLOW DECIDES.
 */

import { Injectable, Logger } from '@nestjs/common';
import { LeadNextActionResultDto, LeadNextBestAction } from '@fitcore/types';

export interface NextActionEvaluationContext {
  status?: string;
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
  objections?: any[] | null;
  hasCustomerRequestedHandoff?: boolean;
}

@Injectable()
export class LeadNextActionService {
  private readonly logger = new Logger(LeadNextActionService.name);

  /**
   * Deterministically calculates the next best action for a lead.
   */
  determineNextAction(
    leadId: string,
    ctx: NextActionEvaluationContext,
  ): LeadNextActionResultDto {
    const interests = (ctx.serviceInterests || []).map((i) => i.toUpperCase());
    const readiness = (ctx.readiness || '').toUpperCase();
    const goals = ctx.goals || [];
    const objections = ctx.objections || [];
    const hasUnresolvedObjections = objections.some((o) => !o.resolved);

    // 1. Explicit Handoff Request or Complex Friction
    if (ctx.hasCustomerRequestedHandoff || hasUnresolvedObjections) {
      return {
        leadId,
        recommendedAction: 'HANDOFF_TO_STAFF',
        priority: 'HIGH',
        reason: ctx.hasCustomerRequestedHandoff
          ? 'Customer explicitly requested to speak with gym staff or a consultant.'
          : 'Prospect raised an objection requiring personal staff attention.',
      };
    }

    // 2. Status Terminal / Inactive
    if (ctx.status === 'DO_NOT_CONTACT' || ctx.status === 'LOST' || ctx.status === 'UNQUALIFIED') {
      return {
        leadId,
        recommendedAction: 'NO_ACTION',
        priority: 'LOW',
        reason: `Lead is in terminal status '${ctx.status}'.`,
      };
    }

    // 3. Missing Essential Contact Details
    const hasContact = Boolean(ctx.email || ctx.phone);
    if (!hasContact) {
      return {
        leadId,
        recommendedAction: 'COLLECT_CONTACT_DETAILS',
        priority: 'HIGH',
        reason: 'Contact information (email or phone) is needed to follow up with the prospect.',
      };
    }

    // 4. Missing Qualification Dimensions
    if (goals.length === 0 || !ctx.readiness || ctx.readiness === 'UNKNOWN') {
      return {
        leadId,
        recommendedAction: 'ASK_QUALIFICATION_QUESTION',
        priority: 'MEDIUM',
        reason: 'Gather additional details regarding primary fitness goals and timeframe.',
      };
    }

    // 5. Explicit Trial Request
    if (interests.includes('TRIAL') || ctx.status === 'TRIAL_INTEREST') {
      return {
        leadId,
        recommendedAction: 'OFFER_TRIAL',
        priority: 'HIGH',
        reason: 'Prospect requested a free workout trial or introductory pass.',
        suggestedActionPayload: { outletId: ctx.preferredOutletId },
      };
    }

    // 6. Explicit Tour Request
    if (interests.includes('TOUR') || ctx.status === 'TOUR_INTEREST') {
      return {
        leadId,
        recommendedAction: 'OFFER_TOUR',
        priority: 'HIGH',
        reason: 'Prospect expressed interest in a facility tour or in-person club inspection.',
        suggestedActionPayload: { outletId: ctx.preferredOutletId },
      };
    }

    // 7. Group Class Interest
    if (interests.includes('GROUP_CLASSES')) {
      return {
        leadId,
        recommendedAction: 'SHOW_CLASS_OPTIONS',
        priority: 'MEDIUM',
        reason: 'Prospect is looking for group fitness sessions; present schedule and timetable.',
      };
    }

    // 8. Personal Training Interest
    if (interests.includes('PERSONAL_TRAINING')) {
      return {
        leadId,
        recommendedAction: 'OFFER_TRAINER_INFORMATION',
        priority: 'MEDIUM',
        reason: 'Prospect expressed interest in personal coaching or 1-on-1 programming.',
      };
    }

    // 9. Membership Interest with High Readiness
    if (
      interests.includes('MEMBERSHIP') ||
      ctx.status === 'MEMBERSHIP_INTEREST' ||
      readiness === 'READY_TO_JOIN' ||
      readiness === 'READY_TO_VISIT'
    ) {
      return {
        leadId,
        recommendedAction: 'SHOW_MEMBERSHIP_OPTIONS',
        priority: 'HIGH',
        reason: 'Prospect is ready to explore tier options and ongoing membership pricing.',
      };
    }

    // Default Fallback
    return {
      leadId,
      recommendedAction: 'ASK_QUALIFICATION_QUESTION',
      priority: 'LOW',
      reason: 'Ask open-ended question to ascertain specific fitness interests.',
    };
  }
}
