/**
 * Day 30 — Workflow Action Executor Service
 *
 * Coordinates execution of individual workflow steps, auditing,
 * and approval state transitions.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CommunicationActionService } from '../integrations/communication-action.service';
import { TaskActionService } from '../integrations/task-action.service';
import { NotificationActionService } from '../integrations/notification-action.service';
import { WorkflowSafetyService } from '../safeguards/workflow-safety.service';
import {
  WorkflowActionDefinition,
  WorkflowActionType,
  WorkflowExecutionStatus,
} from '@fitcore/types';

export interface ExecuteStepContext {
  workflowId: string;
  workflowInstanceId: string;
  organisationId: string;
  outletId?: string | null;
  memberId: string;
  stepIndex: number;
  action: WorkflowActionDefinition;
  approvalMode?: string;
  variables?: Record<string, any>;
  approvedByUserId?: string | null;
}

export interface StepExecutionResult {
  status: WorkflowExecutionStatus;
  resultPayload?: Record<string, any>;
  errorMessage?: string;
  delayUntil?: Date;
  executionId: string;
}

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commAction: CommunicationActionService,
    private readonly taskAction: TaskActionService,
    private readonly notifAction: NotificationActionService,
    private readonly safetyService: WorkflowSafetyService,
  ) {}

  /**
   * Executes or queues a single workflow step.
   */
  async executeStep(ctx: ExecuteStepContext): Promise<StepExecutionResult> {
    const {
      workflowId,
      workflowInstanceId,
      organisationId,
      outletId,
      memberId,
      stepIndex,
      action,
      approvalMode = 'CONFIGURABLE',
      variables = {},
      approvedByUserId,
    } = ctx;

    // Safety validation
    this.safetyService.validateActionsSafety([action]);

    // Check delay first (WAIT or DELAY actions are control-flow pauses, not staff approval gates)
    if (
      action.type === 'DELAY' ||
      action.type === 'WAIT' ||
      (action.delayMinutes && action.delayMinutes > 0 && !approvedByUserId)
    ) {
      const delayMinutes = action.delayMinutes || action.params?.minutes || (action.params?.hours ? action.params.hours * 60 : 1);
      const delayUntil = new Date(Date.now() + delayMinutes * 60 * 1000);

      const execution = await this.prisma.workflowExecution.create({
        data: {
          workflowInstanceId,
          workflowId,
          stepId: action.id || `step_${stepIndex}`,
          stepType: action.type === 'WAIT' ? 'WAIT' : 'DELAY',
          status: 'PENDING',
          inputReference: { delayMinutes, resumeAt: delayUntil.toISOString() },
          startedAt: new Date(),
        },
      });

      return {
        status: 'WAITING_APPROVAL', // Will transition instance to SCHEDULED via delayUntil
        delayUntil,
        executionId: execution.id,
        resultPayload: { delayMinutes, scheduledAt: delayUntil },
      };
    }

    // Check approval requirement
    const requiresApproval =
      approvalMode === 'ALWAYS_REQUIRED' ||
      (approvalMode === 'CONFIGURABLE' && action.requireApproval === true);

    if (requiresApproval && !approvedByUserId) {
      // Create pending execution awaiting approval
      const execution = await this.prisma.workflowExecution.create({
        data: {
          workflowInstanceId,
          workflowId,
          stepId: action.id || `step_${stepIndex}`,
          stepType: action.type,
          status: 'AWAITING_APPROVAL',
          inputReference: { action, variables } as any,
          startedAt: new Date(),
        },
      });

      return {
        status: 'WAITING_APPROVAL',
        executionId: execution.id,
        resultPayload: {
          approvalRequired: true,
          approvalRole: action.approvalRole || 'STAFF',
        },
      };
    }

    // Execute based on Action Type
    let executionStatus: WorkflowExecutionStatus = 'SUCCESS';
    let resultPayload: Record<string, any> = {};
    let errorMessage: string | undefined;

    try {
      switch ((action as any).type) {
        case 'SEND_COMMUNICATION':
        case 'SEND_IN_APP':
        case 'SEND_PUSH':
        case 'SEND_EMAIL':
        case 'SEND_SMS':
        case 'SEND_WHATSAPP': {
          const channel =
            action.type.startsWith('SEND_') && action.type !== 'SEND_COMMUNICATION' && action.type !== 'SEND_IN_APP'
              ? action.type.replace('SEND_', '')
              : action.type === 'SEND_IN_APP'
              ? 'IN_APP'
              : action.params?.channel || 'PUSH';

          const res = await this.commAction.executeCommunicationAction({
            organisationId,
            outletId,
            memberId,
            channel,
            subject: action.params?.subject,
            message: action.params?.message,
            messageNepali: action.params?.messageNepali,
            templateId: action.params?.templateId,
            variables,
            workflowInstanceId,
            stepId: action.id,
          });
          if (!res.success) {
            executionStatus = 'FAILED';
            errorMessage = res.details;
          }
          resultPayload = res;
          break;
        }

        case 'CREATE_RETENTION_FOLLOWUP':
        case 'CREATE_STAFF_TASK':
        case 'ASSIGN_TRAINER_TASK': {
          const res = await this.taskAction.executeStaffTaskAction({
            organisationId,
            outletId,
            memberId,
            title: action.params?.title || (action.type === 'CREATE_RETENTION_FOLLOWUP' ? 'Retention Follow-up' : 'Engagement Task'),
            description: action.params?.description || 'Workflow initiated follow-up task.',
            priority: action.params?.priority || (action.type === 'CREATE_RETENTION_FOLLOWUP' ? 'HIGH' : undefined),
            assignedStaffId: action.params?.assignedStaffId,
            dueDays: action.params?.dueDays,
            workflowInstanceId,
          });
          if (!res.success) {
            executionStatus = 'FAILED';
            errorMessage = res.details;
          }
          resultPayload = res;
          break;
        }

        case 'SEND_IN_APP_NOTIFICATION': {
          const res = await this.notifAction.executeNotificationAction({
            organisationId,
            outletId,
            memberId,
            title: action.params?.title || 'Gym Update',
            message: action.params?.message || '',
            recipientType: 'MEMBER',
            priority: action.params?.priority,
            variables,
            workflowInstanceId,
          });
          if (!res.success) {
            executionStatus = 'FAILED';
            errorMessage = res.details;
          }
          resultPayload = res;
          break;
        }

        case 'NOTIFY_TRAINER':
        case 'NOTIFY_ASSIGNED_TRAINER': {
          const res = await this.notifAction.executeNotificationAction({
            organisationId,
            outletId,
            memberId,
            title: action.params?.title || 'Client Engagement Update',
            message: action.params?.message || '',
            recipientType: 'ASSIGNED_TRAINER',
            priority: action.params?.priority,
            variables,
            workflowInstanceId,
          });
          resultPayload = res;
          break;
        }

        case 'NOTIFY_STAFF':
        case 'NOTIFY_OUTLET_MANAGER':
        case 'NOTIFY_MANAGER': {
          const res = await this.notifAction.executeNotificationAction({
            organisationId,
            outletId,
            memberId,
            title: action.params?.title || 'Member Engagement Escalation',
            message: action.params?.message || '',
            recipientType: 'OUTLET_MANAGER',
            priority: action.params?.priority || 'HIGH',
            variables,
            workflowInstanceId,
          });
          resultPayload = res;
          break;
        }

        case 'WAIT':
        case 'DELAY' as any: {
          const delayMinutes = action.params?.minutes || action.delayMinutes || 60;
          resultPayload = {
            waited: true,
            durationMinutes: delayMinutes,
            timestamp: new Date().toISOString(),
          };
          break;
        }

        case 'END_WORKFLOW':
        case 'CANCEL_WORKFLOW': {
          resultPayload = {
            terminated: true,
            reason: action.params?.reason || 'Workflow terminated by END_WORKFLOW step.',
          };
          break;
        }

        case 'ADD_ENGAGEMENT_NOTE': {
          const noteText = action.params?.note || 'Workflow engagement touchpoint.';
          resultPayload = {
            noteAdded: true,
            note: noteText,
            timestamp: new Date().toISOString(),
            source: 'WORKFLOW_AUTOMATION',
          };
          break;
        }

        case 'ADD_MEMBER_TAG': {
          const tagToAdd = action.params?.tag;
          resultPayload = {
            tagAdded: tagToAdd,
            timestamp: new Date().toISOString(),
          };
          break;
        }

        case 'REMOVE_MEMBER_TAG': {
          const tagToRemove = action.params?.tag;
          resultPayload = {
            tagRemoved: tagToRemove,
            timestamp: new Date().toISOString(),
          };
          break;
        }

        default:
          executionStatus = 'SKIPPED';
          resultPayload = { reason: `Unknown action type: ${action.type}` };
          break;
      }
    } catch (err: any) {
      this.logger.error(`Error executing step ${action.type}: ${err.message}`, err.stack);
      executionStatus = 'FAILED';
      errorMessage = err.message;
    }

    // Persist execution audit
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowInstanceId,
        workflowId,
        stepId: action.id || `step_${stepIndex}`,
        stepType: action.type,
        status: executionStatus === 'SUCCESS' ? 'COMPLETED' : executionStatus,
        inputReference: { action, variables } as any,
        outputReference: resultPayload,
        failureReason: errorMessage,
        completedAt: new Date(),
      },
    });

    return {
      status: executionStatus,
      resultPayload,
      errorMessage,
      executionId: execution.id,
    };
  }
}
