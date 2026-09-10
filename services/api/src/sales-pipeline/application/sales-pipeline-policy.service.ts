import { Injectable, BadRequestException } from '@nestjs/common';
import {
  SalesStage,
  SalesLossReason,
  SalesTransitionActorType,
} from '@fitcore/types';
import {
  CANONICAL_STAGE_DEFINITIONS,
  isValidStageTransition,
  isTerminalStage,
  isReopeningTransition,
  VALID_LOSS_REASONS,
} from '../domain/sales-stage.constants';

@Injectable()
export class SalesPipelinePolicyService {
  /**
   * Validate whether a stage transition is permissible.
   * Throws BadRequestException on validation failure.
   */
  validateTransition(
    fromStage: SalesStage,
    toStage: SalesStage,
    payload: {
      lossReason?: SalesLossReason;
      lossReasonDetails?: string;
      actorType?: SalesTransitionActorType;
      reopenReason?: string;
    },
  ): void {
    // 1. Idempotent check
    if (fromStage === toStage) {
      return;
    }

    // 2. Terminal checks
    if (fromStage === 'CONVERTED') {
      throw new BadRequestException(
        'Invalid transition: Opportunities in CONVERTED state cannot be transitioned.',
      );
    }

    // 3. Reopening checks
    if (fromStage === 'LOST') {
      if (!isReopeningTransition(fromStage, toStage)) {
        throw new BadRequestException(
          `Invalid transition: Lost opportunities can only be reopened to NEW, CONTACTED, or QUALIFIED (requested: ${toStage}).`,
        );
      }
      if (!payload.reopenReason || payload.reopenReason.trim().length === 0) {
        throw new BadRequestException(
          'Reopening a lost opportunity requires a valid reopenReason.',
        );
      }
      return;
    }

    // 4. Regular transition matrix check
    if (!isValidStageTransition(fromStage, toStage)) {
      throw new BadRequestException(
        `Invalid stage transition: Cannot transition from ${fromStage} to ${toStage}.`,
      );
    }

    // 5. Lost stage requires structured lossReason
    if (toStage === 'LOST') {
      if (!payload.lossReason || !VALID_LOSS_REASONS.includes(payload.lossReason)) {
        throw new BadRequestException(
          `Transition to LOST requires a valid lossReason. Supported reasons: ${VALID_LOSS_REASONS.join(', ')}`,
        );
      }
    }

    // 6. Actor type validation: AI cannot mark CONVERTED
    if (
      toStage === 'CONVERTED' &&
      (payload.actorType === 'AI_RECOMMENDATION' || (payload.actorType as string) === 'AI')
    ) {
      throw new BadRequestException(
        'Authoritative invariant violation: AI cannot mark opportunities CONVERTED. Conversion requires verified domain conversion proof.',
      );
    }
  }

  /**
   * Calculate duration in stage in seconds between stage entry and transition.
   */
  calculateStageDurationSeconds(stageEnteredAt: Date, now: Date = new Date()): number {
    const diffMs = now.getTime() - new Date(stageEnteredAt).getTime();
    return Math.max(0, Math.floor(diffMs / 1000));
  }

  /**
   * Check whether an opportunity is considered stale.
   * An opportunity is stale if it is in a non-terminal stage and either:
   * 1. Has spent longer in stage than stage SLA hours, OR
   * 2. Has had no sales activity for longer than stage SLA hours.
   */
  isOpportunityStale(
    stage: SalesStage,
    stageEnteredAt: Date,
    lastActivityAt?: Date | null,
    now: Date = new Date(),
  ): boolean {
    if (isTerminalStage(stage)) {
      return false;
    }

    const definition = CANONICAL_STAGE_DEFINITIONS[stage];
    if (!definition || !definition.defaultSlaHours) {
      return false;
    }

    const slaMs = definition.defaultSlaHours * 60 * 60 * 1000;
    const timeInStageMs = now.getTime() - new Date(stageEnteredAt).getTime();

    if (timeInStageMs > slaMs) {
      return true;
    }

    if (lastActivityAt) {
      const timeSinceActivityMs = now.getTime() - new Date(lastActivityAt).getTime();
      if (timeSinceActivityMs > slaMs) {
        return true;
      }
    }

    return false;
  }
}
