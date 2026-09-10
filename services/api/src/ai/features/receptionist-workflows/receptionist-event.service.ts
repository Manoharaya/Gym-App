/**
 * Day 35 — Receptionist Event Service
 * Idempotent, reliable event dispatcher integrating with Day 30 Automation Engine.
 * Prepares Day 36 boundary for AI Sales Agent handoffs.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { WorkflowEngineService } from '../../../automation/engine/workflow-engine.service';
import { ReceptionistWorkflowEventType } from '@fitcore/types';

export interface EmitReceptionistEventParams {
  organisationId: string;
  outletId?: string | null;
  eventType: ReceptionistWorkflowEventType | string;
  memberId?: string;
  payload: Record<string, any>;
  idempotencyKey?: string;
}

@Injectable()
export class ReceptionistEventService {
  private readonly logger = new Logger(ReceptionistEventService.name);

  constructor(
    @Optional() private readonly workflowEngine?: WorkflowEngineService,
  ) {}

  /**
   * Emits a domain event to Day 30 Automation Engine with idempotency guarantee.
   */
  async emitReceptionistEvent(params: EmitReceptionistEventParams): Promise<string[]> {
    const { organisationId, outletId, eventType, memberId = 'SYSTEM', payload, idempotencyKey } = params;

    this.logger.log(`[ReceptionistEvent] Emitting ${eventType} (Idempotency: ${idempotencyKey || 'NONE'})`);

    if (!this.workflowEngine) {
      this.logger.debug('WorkflowEngineService not injected. Suppressing automation event execution.');
      return [];
    }

    try {
      const triggeredIds = await this.workflowEngine.handleEvent({
        organisationId,
        outletId: outletId || null,
        memberId,
        eventType,
        payload,
        idempotencyKey,
      });

      return triggeredIds;
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch event to WorkflowEngineService: ${err.message}`);
      return [];
    }
  }

  /**
   * Day 36 Readiness: Emits RECEPTIONIST_SALES_HANDOFF_REQUESTED event.
   * Allows Day 36 AI Sales Agent to ingest a qualified lead without duplicating the lead record.
   */
  async emitSalesHandoffRequested(params: {
    organisationId: string;
    outletId?: string | null;
    leadId: string;
    interactionId?: string;
    qualificationScore?: number;
    interestCategory?: string;
  }) {
    const { organisationId, outletId, leadId, interactionId, qualificationScore, interestCategory } = params;

    return this.emitReceptionistEvent({
      organisationId,
      outletId,
      eventType: 'RECEPTIONIST_SALES_HANDOFF_REQUESTED',
      memberId: leadId,
      payload: {
        leadId,
        interactionId,
        qualificationScore: qualificationScore || 0,
        interestCategory: interestCategory || 'MEMBERSHIP',
        handoffSource: 'AI_RECEPTIONIST',
        timestamp: new Date().toISOString(),
      },
      idempotencyKey: `sales-handoff:${leadId}:${interactionId || 'direct'}`,
    });
  }
}
