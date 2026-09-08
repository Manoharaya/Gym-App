/**
 * Day 30 — Workflow State Machine Service
 *
 * Implements a strict, deterministic finite state machine for workflow instances.
 * Enforces valid state transitions, records transition audit records,
 * and prevents illegal state mutations.
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowState, WorkflowOutcome } from '../automation.types';

export const TERMINAL_STATES: ReadonlySet<WorkflowState> = new Set([
  'COMPLETED',
  'CANCELLED',
  'FAILED',
  'EXPIRED',
  'SUPPRESSED',
]);

const VALID_TRANSITIONS: Record<WorkflowState, ReadonlySet<WorkflowState>> = {
  PENDING: new Set(['PENDING', 'RUNNING', 'WAITING', 'AWAITING_APPROVAL', 'SCHEDULED', 'COMPLETED', 'FAILED', 'CANCELLED', 'SUPPRESSED']),
  RUNNING: new Set(['RUNNING', 'WAITING', 'AWAITING_APPROVAL', 'SCHEDULED', 'COMPLETED', 'FAILED', 'CANCELLED', 'SUPPRESSED']),
  WAITING: new Set(['WAITING', 'RUNNING', 'AWAITING_APPROVAL', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'EXPIRED']),
  AWAITING_APPROVAL: new Set(['AWAITING_APPROVAL', 'RUNNING', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'SUPPRESSED']),
  SCHEDULED: new Set(['SCHEDULED', 'RUNNING', 'AWAITING_APPROVAL', 'CANCELLED', 'EXPIRED']),
  // Terminal states cannot transition further
  COMPLETED: new Set(),
  CANCELLED: new Set(),
  FAILED: new Set(),
  EXPIRED: new Set(),
  SUPPRESSED: new Set(),
};

export interface TransitionOptions {
  actorId?: string;
  reason?: string;
  failureReason?: string;
  outcome?: WorkflowOutcome;
  outcomeDetails?: Record<string, any>;
  scheduledAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  expiresAt?: Date | null;
  currentStep?: number;
}

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks whether a transition between two states is permitted.
   */
  canTransition(from: WorkflowState, to: WorkflowState): boolean {
    if (from === to) return true; // Idempotent same-state check
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.has(to) : false;
  }

  /**
   * Checks whether a given state is terminal.
   */
  isTerminal(state: WorkflowState): boolean {
    return TERMINAL_STATES.has(state);
  }

  /**
   * Executes a state transition on a WorkflowInstance with full validation and persistence.
   */
  async transition(
    instanceId: string,
    targetState: WorkflowState,
    options: TransitionOptions = {},
  ): Promise<void> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new NotFoundException(`WorkflowInstance ${instanceId} not found.`);
    }

    const currentState = instance.status as WorkflowState;

    if (currentState === targetState && Object.keys(options).length === 0) {
      this.logger.debug(`Instance ${instanceId} already in state ${targetState} with no updates; no-op.`);
      return;
    }

    if (this.isTerminal(currentState) && currentState !== targetState) {
      throw new BadRequestException(
        `Cannot transition instance ${instanceId} from terminal state '${currentState}' to '${targetState}'.`,
      );
    }

    if (!this.canTransition(currentState, targetState)) {
      throw new BadRequestException(
        `Illegal state transition for instance ${instanceId}: '${currentState}' -> '${targetState}'.`,
      );
    }

    const now = new Date();
    const updateData: any = {
      status: targetState,
      lastEvaluatedAt: now,
    };

    if (options.currentStep !== undefined) {
      updateData.currentStep = options.currentStep;
    }

    if (options.scheduledAt !== undefined) {
      updateData.scheduledAt = options.scheduledAt;
    }

    if (options.expiresAt !== undefined) {
      updateData.expiresAt = options.expiresAt;
    }

    if (options.failureReason !== undefined) {
      updateData.failureReason = options.failureReason;
    }

    if (options.outcome !== undefined) {
      updateData.outcome = options.outcome;
      updateData.outcomeRecordedAt = now;
    }

    if (options.outcomeDetails !== undefined) {
      updateData.outcomeDetails = options.outcomeDetails as any;
    }

    if (targetState === 'COMPLETED') {
      updateData.completedAt = options.completedAt || now;
      if (!options.outcome) {
        updateData.outcome = 'COMPLETED';
        updateData.outcomeRecordedAt = now;
      }
    } else if (targetState === 'CANCELLED') {
      updateData.cancelledAt = options.cancelledAt || now;
      if (!options.outcome) {
        updateData.outcome = 'CANCELLED';
        updateData.outcomeRecordedAt = now;
      }
    } else if (targetState === 'EXPIRED') {
      updateData.cancelledAt = now;
      updateData.outcome = 'EXPIRED';
      updateData.outcomeRecordedAt = now;
    } else if (targetState === 'FAILED') {
      updateData.completedAt = now;
      updateData.outcome = 'FAILED';
      updateData.outcomeRecordedAt = now;
    } else if (targetState === 'SUPPRESSED') {
      updateData.completedAt = now;
      updateData.outcome = 'SUPPRESSED';
      updateData.outcomeRecordedAt = now;
    }

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: updateData,
    });

    this.logger.log(
      `Instance ${instanceId} transitioned: ${currentState} -> ${targetState}${
        options.reason ? ` (Reason: ${options.reason})` : ''
      }`,
    );
  }
}
