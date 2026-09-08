/**
 * Day 30 — Workflow Engine Coordinator Service
 *
 * Orchestrates event processing, instance lifecycle transitions,
 * step-by-step advancement, stop condition checks, and approvals.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowEvaluatorService } from './workflow-evaluator.service';
import { ActionExecutorService } from './action-executor.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { WorkflowStateService } from '../workflows/workflow-state.service';
import {
  WorkflowTriggerEvent,
  WorkflowActionDefinition,
  WorkflowStopCondition,
} from '@fitcore/types';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluator: WorkflowEvaluatorService,
    private readonly executor: ActionExecutorService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly stateService: WorkflowStateService,
  ) {}

  /**
   * Ingests a domain trigger event and initiates matched workflows.
   */
  async handleEvent(event: WorkflowTriggerEvent): Promise<string[]> {
    this.logger.log(`Ingesting workflow trigger event '${event.eventType}' for member ${event.memberId}`);

    // If event indicates re-engagement or attendance, automatically terminate active retention workflows
    if (['MEMBER_REENGAGED', 'BOOKING_CREATED', 'MEMBER_CHECKED_IN', 'CLASS_ATTENDED'].includes(event.eventType)) {
      await this.handleReengagementTermination(event);
    }

    const matchResults = await this.evaluator.evaluateEvent(event);
    const triggeredInstanceIds: string[] = [];

    for (const match of matchResults) {
      if (!match.matched) {
        this.logger.warn(`Workflow ${match.workflowId} did not match event: ${match.reasons.join(', ')}`);
        continue;
      }

      // Check idempotency before creation to prevent duplicate executions
      if (event.idempotencyKey) {
        const existingInstance = await this.prisma.workflowInstance.findFirst({
          where: {
            idempotencyKey: `${event.idempotencyKey}:${match.workflowId}`,
          },
        });
        if (existingInstance) {
          this.logger.warn(`Duplicate event suppressed by idempotency key: ${event.idempotencyKey}:${match.workflowId}`);
          continue;
        }
      }

      try {
        // Create WorkflowInstance
        const instance = await this.prisma.workflowInstance.create({
          data: {
            organisationId: event.organisationId,
            outletId: event.outletId || null,
            workflowId: match.workflowId,
            workflowVersionId: match.workflowVersionId,
            memberId: event.memberId,
            status: match.scheduledResumeAt ? 'SCHEDULED' : 'PENDING',
            currentStep: 0,
            triggerData: event.payload || {},
            contextData: { eventType: event.eventType, occurredAt: event.occurredAt || new Date().toISOString() },
            scheduledAt: match.scheduledResumeAt || null,
            idempotencyKey: event.idempotencyKey ? `${event.idempotencyKey}:${match.workflowId}` : undefined,
          },
        });

        triggeredInstanceIds.push(instance.id);
        this.logger.log(`Created WorkflowInstance ${instance.id} for Workflow ${match.workflowId}`);

        // If not delayed for quiet hours, immediately run first step
        if (!match.scheduledResumeAt) {
          await this.runNextStep(instance.id);
        }
      } catch (err: any) {
        if (err?.code === 'P2002') {
          this.logger.warn(`Duplicate workflow instance blocked by database idempotency constraint.`);
          continue;
        }
        throw err;
      }
    }

    return triggeredInstanceIds;
  }

  /**
   * Automatically terminates active retention workflows when member re-engages.
   */
  async handleReengagementTermination(event: WorkflowTriggerEvent): Promise<number> {
    const activeRetention = await this.prisma.workflowInstance.findMany({
      where: {
        organisationId: event.organisationId,
        memberId: event.memberId,
        status: { in: ['PENDING', 'RUNNING', 'WAITING', 'AWAITING_APPROVAL', 'SCHEDULED'] },
        workflow: {
          OR: [
            { category: 'RETENTION' },
            { triggerType: 'MEMBER_INACTIVE' },
            { triggerType: 'ENGAGEMENT_DECLINED' },
          ],
        },
      },
    });

    for (const inst of activeRetention) {
      await this.stateService.transition(inst.id, 'CANCELLED', {
        reason: `Member re-engaged via event ${event.eventType}. Terminating active retention workflow.`,
        outcome: 'MEMBER_REENGAGED',
        outcomeDetails: { triggeringEvent: event.eventType, occurredAt: event.occurredAt },
      });
      this.logger.log(`Retention workflow instance ${inst.id} stopped due to member re-engagement.`);
    }

    return activeRetention.length;
  }

  /**
   * Executes the next action step for an active instance.
   */
  async runNextStep(instanceId: string, approvedByUserId?: string): Promise<void> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: true,
        workflowVersion: true,
      },
    });

    if (!instance) {
      throw new NotFoundException(`WorkflowInstance ${instanceId} not found.`);
    }

    if (this.stateService.isTerminal(instance.status as any)) {
      this.logger.log(`Instance ${instanceId} is in terminal state '${instance.status}'; aborting execution.`);
      return;
    }

    const actions = (instance.workflowVersion.actionDefinition as unknown as WorkflowActionDefinition[]) || [];
    const settings = (instance.workflowVersion.settings as Record<string, any>) || {};
    const stopConditions: WorkflowStopCondition = settings.stopConditions;

    // 1. Check stop conditions
    if (stopConditions) {
      const shouldStop = await this.checkStopConditions(instance, stopConditions);
      if (shouldStop.stopped) {
        await this.stateService.transition(instanceId, 'CANCELLED', {
          reason: `Stop condition triggered: ${shouldStop.reason}`,
          outcome: shouldStop.outcome as any || 'SUPPRESSED',
          failureReason: `Stop condition triggered: ${shouldStop.reason}`,
        });
        this.logger.log(`WorkflowInstance ${instanceId} stopped: ${shouldStop.reason}`);
        return;
      }
    }

    // 2. Check if all steps have finished
    if (instance.currentStep >= actions.length) {
      await this.stateService.transition(instanceId, 'COMPLETED', {
        outcome: 'COMPLETED',
      });
      this.logger.log(`WorkflowInstance ${instanceId} successfully completed all ${actions.length} steps.`);
      return;
    }

    // 3. Execute current step
    const currentAction = actions[instance.currentStep];
    const triggerData = (instance.triggerData as Record<string, any>) || {};

    const stepResult = await this.executor.executeStep({
      workflowId: instance.workflowId,
      workflowInstanceId: instance.id,
      organisationId: instance.organisationId,
      outletId: instance.outletId,
      memberId: instance.memberId,
      stepIndex: instance.currentStep,
      action: currentAction,
      approvalMode: instance.workflow.approvalMode,
      variables: triggerData,
      approvedByUserId,
    });

    // 4. Handle step outcome
    if (stepResult.status === 'WAITING_APPROVAL') {
      if (stepResult.delayUntil) {
        // Delayed step
        await this.stateService.transition(instanceId, 'SCHEDULED', {
          scheduledAt: stepResult.delayUntil,
        });
        this.logger.log(`Instance ${instanceId} scheduled for delay until ${stepResult.delayUntil}`);
      } else {
        // Requires human approval
        await this.stateService.transition(instanceId, 'AWAITING_APPROVAL');
        this.logger.log(`Instance ${instanceId} paused awaiting human approval.`);
      }
      return;
    }

    if (stepResult.status === 'FAILED') {
      await this.stateService.transition(instanceId, 'FAILED', {
        failureReason: stepResult.errorMessage || 'Step execution failed.',
        outcome: 'FAILED',
      });
      this.logger.warn(`Instance ${instanceId} marked FAILED: ${stepResult.errorMessage}`);
      return;
    }

    // Step succeeded: increment step index and advance immediately
    await this.stateService.transition(instanceId, 'RUNNING', {
      currentStep: instance.currentStep + 1,
    });

    // Recursive advancement for remaining steps
    await this.runNextStep(instanceId);
  }

  /**
   * Approves a pending workflow action step.
   */
  async approveStep(instanceId: string, approvedByUserId: string, notes?: string): Promise<void> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) throw new NotFoundException(`Instance ${instanceId} not found.`);
    if (instance.status !== 'AWAITING_APPROVAL') {
      throw new BadRequestException(`Instance ${instanceId} is not awaiting approval (Current status: ${instance.status}).`);
    }

    // Find pending execution
    const pendingExecution = await this.prisma.workflowExecution.findFirst({
      where: {
        workflowInstanceId: instanceId,
        status: 'AWAITING_APPROVAL',
      },
      orderBy: { startedAt: 'desc' },
    });

    if (pendingExecution) {
      await this.prisma.workflowExecution.update({
        where: { id: pendingExecution.id },
        data: {
          status: 'COMPLETED',
          outputReference: { approvedByUserId, notes, approvedAt: new Date().toISOString() },
          completedAt: new Date(),
        },
      });
    }

    // Resume execution with approval
    await this.stateService.transition(instanceId, 'RUNNING', {
      currentStep: instance.currentStep + 1,
      reason: `Step approved by user ${approvedByUserId}`,
    });

    await this.runNextStep(instanceId, approvedByUserId);
  }

  /**
   * Rejects a pending workflow action step.
   */
  async rejectStep(instanceId: string, rejectedByUserId: string, reason: string): Promise<void> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) throw new NotFoundException(`Instance ${instanceId} not found.`);
    if (instance.status !== 'AWAITING_APPROVAL') {
      throw new BadRequestException(`Instance ${instanceId} is not awaiting approval.`);
    }

    const pendingExecution = await this.prisma.workflowExecution.findFirst({
      where: {
        workflowInstanceId: instanceId,
        status: 'AWAITING_APPROVAL',
      },
      orderBy: { startedAt: 'desc' },
    });

    if (pendingExecution) {
      await this.prisma.workflowExecution.update({
        where: { id: pendingExecution.id },
        data: {
          status: 'SKIPPED',
          failureReason: `Rejected by user ${rejectedByUserId}: ${reason}`,
          completedAt: new Date(),
        },
      });
    }

    await this.stateService.transition(instanceId, 'CANCELLED', {
      reason: `Action rejected: ${reason}`,
      outcome: 'CANCELLED',
      failureReason: `Action rejected: ${reason}`,
    });
  }

  /**
   * Evaluates stop conditions against the current member state.
   */
  private async checkStopConditions(
    instance: any,
    stopConditions: WorkflowStopCondition,
  ): Promise<{ stopped: boolean; reason?: string; outcome?: string }> {
    if (stopConditions.stopIfActivityDetected) {
      // 1. Check if member checked in or recorded attendance since workflow instance started
      const recentAttendance = await this.prisma.attendanceRecord.findFirst({
        where: {
          memberProfileId: instance.memberId,
          checkedInAt: { gte: instance.startedAt },
        },
      });

      if (recentAttendance && recentAttendance.checkedInAt) {
        return {
          stopped: true,
          reason: `Member visited the gym at ${recentAttendance.checkedInAt}. Inactivity workflow cancelled.`,
          outcome: 'MEMBER_REENGAGED',
        };
      }

      // 2. Check if member created a class booking since workflow instance started
      const recentBooking = await this.prisma.booking.findFirst({
        where: {
          memberProfileId: instance.memberId,
          createdAt: { gte: instance.startedAt },
        },
      });

      if (recentBooking) {
        return {
          stopped: true,
          reason: `Member created booking ${recentBooking.id}. Inactivity workflow cancelled.`,
          outcome: 'MEMBER_REENGAGED',
        };
      }
    }

    return { stopped: false };
  }
}
