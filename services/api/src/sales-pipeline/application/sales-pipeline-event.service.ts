import { Injectable, Logger, Optional } from '@nestjs/common';
import { WorkflowEngineService } from '../../automation/engine/workflow-engine.service';
import { SalesPipelineEventType } from '@fitcore/types';

export interface EmitSalesEventParams {
  organisationId: string;
  outletId?: string | null;
  eventType: SalesPipelineEventType | string;
  memberId?: string;
  payload: Record<string, any>;
  idempotencyKey?: string;
}

@Injectable()
export class SalesPipelineEventService {
  private readonly logger = new Logger(SalesPipelineEventService.name);

  constructor(
    @Optional() private readonly workflowEngine?: WorkflowEngineService,
  ) {}

  /**
   * Emits a domain event to Day 30 Automation Engine with idempotency guarantee.
   */
  async emitSalesEvent(params: EmitSalesEventParams): Promise<string[]> {
    const {
      organisationId,
      outletId,
      eventType,
      memberId = 'SYSTEM',
      payload,
      idempotencyKey,
    } = params;

    this.logger.log(
      `[SalesPipelineEvent] Emitting ${eventType} (Idempotency: ${idempotencyKey || 'NONE'})`,
    );

    if (!this.workflowEngine) {
      this.logger.debug(
        'WorkflowEngineService not injected. Suppressing automation event execution.',
      );
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
      this.logger.warn(
        `Failed to dispatch event to WorkflowEngineService: ${err.message}`,
      );
      return [];
    }
  }
}
