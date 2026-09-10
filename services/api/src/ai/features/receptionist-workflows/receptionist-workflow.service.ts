/**
 * Day 35 — Receptionist Workflow Service (Main Coordinator)
 * Coordinates the full operational receptionist pipeline:
 * Contact -> Understand -> Business Rules -> Controlled Tools -> Authoritative Outcome -> Staff / Automation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ReceptionistInteractionService } from './receptionist-interaction.service';
import { ReceptionistOutcomeService } from './receptionist-outcome.service';
import { ReceptionistSummaryService } from './receptionist-summary.service';
import { ReceptionistHandoffWorkflowService } from './receptionist-handoff-workflow.service';
import { ReceptionistFollowUpService } from './receptionist-followup.service';
import { ReceptionistCallbackService } from './receptionist-callback.service';
import { ReceptionistEscalationService } from './receptionist-escalation.service';
import { ReceptionistMissedCallService } from './receptionist-missed-call.service';
import { ReceptionistRuleService } from './receptionist-rule.service';
import { ReceptionistConfigService } from './receptionist-config.service';
import { ReceptionistEventService } from './receptionist-event.service';
import {
  ReceptionistChannel,
  ReceptionistOutcome,
  WorkflowHandoffReason,
} from '@fitcore/types';

@Injectable()
export class ReceptionistWorkflowService {
  private readonly logger = new Logger(ReceptionistWorkflowService.name);

  constructor(
    public readonly interactions: ReceptionistInteractionService,
    public readonly outcomes: ReceptionistOutcomeService,
    public readonly summaries: ReceptionistSummaryService,
    public readonly handoffs: ReceptionistHandoffWorkflowService,
    public readonly followUps: ReceptionistFollowUpService,
    public readonly callbacks: ReceptionistCallbackService,
    public readonly escalations: ReceptionistEscalationService,
    public readonly missedCalls: ReceptionistMissedCallService,
    public readonly rules: ReceptionistRuleService,
    public readonly config: ReceptionistConfigService,
    public readonly events: ReceptionistEventService,
  ) {}

  /**
   * Processes an inbound interaction event and initializes canonical tracking.
   */
  async handleInboundContact(params: {
    organisationId: string;
    outletId?: string | null;
    channel: ReceptionistChannel;
    conversationId: string;
    sessionId?: string | null;
    memberId?: string | null;
    leadId?: string | null;
    intent?: string | null;
    metadata?: Record<string, any>;
  }) {
    const interaction = await this.interactions.findOrCreateInteraction(params);

    await this.events.emitReceptionistEvent({
      organisationId: params.organisationId,
      outletId: params.outletId,
      eventType: 'RECEPTIONIST_INTERACTION_STARTED',
      memberId: params.memberId || 'UNKNOWN',
      payload: {
        interactionId: interaction.id,
        channel: params.channel,
        conversationId: params.conversationId,
      },
      idempotencyKey: `interaction-started:${interaction.id}`,
    });

    return interaction;
  }

  /**
   * Concludes an interaction with verified outcome, structured summary, and operational events.
   */
  async completeInteraction(params: {
    organisationId: string;
    interactionId: string;
    outcome: ReceptionistOutcome;
    targetReferenceId?: string;
    customerTopic?: string;
    observedFacts?: string[];
    actionItems?: string[];
    userId?: string;
    language?: string;
  }) {
    const {
      organisationId,
      interactionId,
      outcome,
      targetReferenceId,
      customerTopic,
      observedFacts,
      actionItems,
      userId,
      language = 'en',
    } = params;

    // 1. Authoritative verification of outcome
    const verification = await this.outcomes.verifyAndResolveOutcome({
      organisationId,
      interactionId,
      requestedOutcome: outcome,
      source: 'SYSTEM',
      targetReferenceId,
      language,
    });

    // 2. Update interaction status
    const updatedInteraction = await this.interactions.updateInteractionStatus({
      interactionId,
      organisationId,
      status: verification.status,
      outcome: verification.outcome,
      outcomeSource: verification.source,
    });

    // 3. Structured summary generation
    const summary = await this.summaries.generateSummary({
      organisationId,
      interactionId,
      type: 'COMPLETION_SUMMARY',
      outcome: verification.outcome,
      customerTopic,
      observedFacts,
      actionItems,
      userId,
    });

    // 4. Emit completion event to Day 30 Automation
    await this.events.emitReceptionistEvent({
      organisationId,
      outletId: updatedInteraction.outletId,
      eventType: 'RECEPTIONIST_INTERACTION_COMPLETED',
      memberId: updatedInteraction.memberId || 'UNKNOWN',
      payload: {
        interactionId,
        outcome: verification.outcome,
        status: verification.status,
      },
      idempotencyKey: `interaction-completed:${interactionId}`,
    });

    return {
      interaction: updatedInteraction,
      summary,
      verification,
    };
  }
}
