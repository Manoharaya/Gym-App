/**
 * Day 30 — Workflow Instance & Analytics Service
 *
 * Manages runtime instances, staff approval queue, and non-causal
 * post-workflow engagement outcome analytics.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  WorkflowInstanceDetailDto,
  WorkflowAnalyticsDto,
} from '@fitcore/types';

@Injectable()
export class WorkflowInstanceService {
  private readonly logger = new Logger(WorkflowInstanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists workflow instances with filters.
   */
  async listInstances(
    organisationId: string,
    filters: { workflowId?: string; memberId?: string; status?: string; outletId?: string },
  ): Promise<any[]> {
    const where: any = { organisationId };
    if (filters.workflowId) where.workflowId = filters.workflowId;
    if (filters.memberId) where.memberId = filters.memberId;
    if (filters.status) where.status = filters.status;
    if (filters.outletId) where.outletId = filters.outletId;

    const instances = await this.prisma.workflowInstance.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: {
        workflow: { select: { name: true, triggerType: true } },
        memberProfile: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    return instances.map((inst) => ({
      id: inst.id,
      workflowId: inst.workflowId,
      workflowName: inst.workflow.name,
      triggerType: inst.workflow.triggerType,
      memberId: inst.memberId,
      memberName: `${inst.memberProfile.user.firstName || ''} ${inst.memberProfile.user.lastName || ''}`.trim(),
      status: inst.status,
      currentStep: inst.currentStep,
      outcome: inst.outcome,
      startedAt: inst.startedAt.toISOString(),
      completedAt: inst.completedAt?.toISOString() || null,
      scheduledAt: inst.scheduledAt?.toISOString() || null,
      failureReason: inst.failureReason,
    }));
  }

  /**
   * Retrieves full details and execution steps for a workflow instance.
   */
  async getInstance(id: string, organisationId: string): Promise<WorkflowInstanceDetailDto> {
    const inst = await this.prisma.workflowInstance.findFirst({
      where: { id, organisationId },
      include: {
        workflow: true,
        workflowVersion: true,
        memberProfile: { include: { user: true } },
        executions: { orderBy: { startedAt: 'asc' } },
      },
    });

    if (!inst) {
      throw new NotFoundException(`WorkflowInstance ${id} not found.`);
    }

    const actions = (inst.workflowVersion.actionDefinition as any[]) || [];

    return {
      id: inst.id,
      workflowId: inst.workflowId,
      workflowName: inst.workflow.name,
      workflowVersion: inst.workflowVersion.version,
      organisationId: inst.organisationId,
      outletId: inst.outletId,
      memberId: inst.memberId,
      memberName: `${inst.memberProfile.user.firstName || ''} ${inst.memberProfile.user.lastName || ''}`.trim(),
      currentStepIndex: inst.currentStep,
      totalSteps: actions.length,
      status: inst.status as any,
      outcome: inst.outcome,
      outcomeRecordedAt: inst.outcomeRecordedAt?.toISOString() || null,
      outcomeDetails: (inst.outcomeDetails as any) || null,
      triggerPayload: (inst.triggerData as Record<string, any>) || {},
      nextExecutionAt: inst.scheduledAt?.toISOString() || null,
      stoppedReason: inst.failureReason,
      startedAt: inst.startedAt.toISOString(),
      completedAt: inst.completedAt?.toISOString() || null,
      executions: inst.executions.map((e) => ({
        id: e.id,
        instanceId: e.workflowInstanceId,
        stepIndex: 0,
        actionType: e.stepType as any,
        actionPayload: (e.inputReference as any) || {},
        status: e.status as any,
        resultPayload: (e.outputReference as any) || null,
        errorMessage: e.failureReason,
        executedAt: e.startedAt.toISOString(),
      })),
    };
  }

  /**
   * Returns pending action approvals for staff review.
   */
  async getPendingApprovals(organisationId: string, trainerId?: string): Promise<any[]> {
    const where: any = {
      organisationId,
      status: 'AWAITING_APPROVAL',
    };

    const instances = await this.prisma.workflowInstance.findMany({
      where,
      orderBy: { startedAt: 'asc' },
      include: {
        workflow: true,
        workflowVersion: true,
        memberProfile: {
          include: {
            user: true,
            trainerClientAssignments: {
              where: { status: 'ACTIVE' },
              include: {
                trainerProfile: {
                  include: { staffProfile: true },
                },
              },
            },
          },
        },
        executions: {
          where: { status: 'AWAITING_APPROVAL' },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    const filtered = trainerId
      ? instances.filter((inst) =>
          inst.memberProfile?.trainerClientAssignments?.some(
            (tca: any) =>
              tca.trainerProfile?.staffProfile?.userId === trainerId ||
              tca.trainerProfileId === trainerId,
          ),
        )
      : instances;

    return filtered.map((inst) => {
      const pendingExec = inst.executions[0];
      return {
        instanceId: inst.id,
        workflowId: inst.workflowId,
        workflowName: inst.workflow.name,
        memberId: inst.memberId,
        memberName: `${inst.memberProfile?.user?.firstName || ''} ${inst.memberProfile?.user?.lastName || ''}`.trim(),
        stepId: pendingExec?.stepId,
        actionType: pendingExec?.stepType,
        actionDetails: pendingExec?.inputReference,
        queuedAt: pendingExec?.startedAt?.toISOString() || inst.startedAt.toISOString(),
      };
    });
  }

  /**
   * Cancels a running or pending workflow instance.
   */
  async cancelInstance(id: string, organisationId: string, reason?: string): Promise<void> {
    const inst = await this.prisma.workflowInstance.findFirst({
      where: { id, organisationId },
    });

    if (!inst) throw new NotFoundException(`WorkflowInstance ${id} not found.`);

    await this.prisma.workflowInstance.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        outcome: 'CANCELLED',
        failureReason: reason || 'Cancelled by staff user.',
        cancelledAt: new Date(),
        completedAt: new Date(),
      },
    });
  }

  /**
   * Calculates post-workflow engagement analytics with strictly NON-CAUSAL framing.
   * Frame metrics as "FOLLOWING WORKFLOW", never "CAUSED BY WORKFLOW".
   */
  async getWorkflowAnalytics(workflowId: string, organisationId: string): Promise<WorkflowAnalyticsDto> {
    const instances = await this.prisma.workflowInstance.findMany({
      where: { workflowId, organisationId },
      include: {
        executions: true,
      },
    });

    const totalInstances = instances.length;
    const completedInstances = instances.filter((i) => i.status === 'COMPLETED').length;
    const activeInstances = instances.filter((i) => ['PENDING', 'RUNNING', 'SCHEDULED', 'AWAITING_APPROVAL'].includes(i.status)).length;
    const cancelledInstances = instances.filter((i) => i.status === 'CANCELLED').length;
    const failedInstances = instances.filter((i) => i.status === 'FAILED').length;

    // Aggregate actions executed
    const actionsExecuted: Record<string, number> = {};
    for (const inst of instances) {
      for (const exec of inst.executions) {
        if (exec.status === 'COMPLETED') {
          actionsExecuted[exec.stepType] = (actionsExecuted[exec.stepType] || 0) + 1;
        }
      }
    }

    // Measure member activity observed following workflow completion
    let subsequentVisitsCount = 0;
    let subsequentBookingsCount = 0;

    for (const inst of instances) {
      if (inst.completedAt) {
        const visits = await this.prisma.attendanceRecord.count({
          where: {
            memberProfileId: inst.memberId,
            checkedInAt: { gte: inst.completedAt },
          },
        });
        subsequentVisitsCount += visits;

        const bookings = await this.prisma.booking.count({
          where: {
            memberProfileId: inst.memberId,
            createdAt: { gte: inst.completedAt },
          },
        });
        subsequentBookingsCount += bookings;
      }
    }

    let engagementTrendFollowingWorkflow: WorkflowAnalyticsDto['engagementTrendFollowingWorkflow'] = 'INSUFFICIENT_DATA';
    if (completedInstances > 0) {
      if (subsequentVisitsCount > completedInstances) {
        engagementTrendFollowingWorkflow = 'INCREASED';
      } else if (subsequentVisitsCount === 0) {
        engagementTrendFollowingWorkflow = 'DECREASED';
      } else {
        engagementTrendFollowingWorkflow = 'STABLE';
      }
    }

    return {
      workflowId,
      totalInstances,
      completedInstances,
      activeInstances,
      cancelledInstances,
      failedInstances,
      actionsExecuted,
      subsequentVisitsFollowingWorkflow: subsequentVisitsCount,
      subsequentBookingsFollowingWorkflow: subsequentBookingsCount,
      engagementTrendFollowingWorkflow,
      lastEvaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Slice 29: Returns automation profile, active workflows, and history for a single member.
   */
  async getMemberAutomationProfile(organisationId: string, memberId: string) {
    const instances = await this.prisma.workflowInstance.findMany({
      where: { organisationId, memberId },
      include: {
        workflow: true,
        workflowVersion: true,
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const activeInstances = instances.filter((i) =>
      ['PENDING', 'RUNNING', 'WAITING', 'AWAITING_APPROVAL', 'SCHEDULED'].includes(i.status),
    );
    const pastInstances = instances.filter((i) =>
      ['COMPLETED', 'CANCELLED', 'FAILED', 'EXPIRED', 'SUPPRESSED'].includes(i.status),
    );

    return {
      memberId,
      activeWorkflowsCount: activeInstances.length,
      historicalWorkflowsCount: pastInstances.length,
      activeInstances: activeInstances.map((i) => ({
        id: i.id,
        workflowId: i.workflowId,
        workflowName: i.workflow.name,
        category: i.workflow.category,
        status: i.status,
        currentStep: i.currentStep,
        startedAt: i.startedAt.toISOString(),
      })),
      recentHistory: pastInstances.slice(0, 10).map((i) => ({
        id: i.id,
        workflowId: i.workflowId,
        workflowName: i.workflow.name,
        status: i.status,
        outcome: i.outcome,
        completedAt: i.completedAt?.toISOString(),
      })),
    };
  }

  /**
   * Slice 24 & Slice 29: Returns organisation-wide aggregate automation analytics.
   */
  async getAggregateAnalytics(organisationId: string) {
    const [totalWorkflows, activeWorkflows, instances] = await Promise.all([
      this.prisma.engagementWorkflow.count({ where: { organisationId } }),
      this.prisma.engagementWorkflow.count({ where: { organisationId, status: 'ACTIVE', enabled: true } }),
      this.prisma.workflowInstance.findMany({
        where: { organisationId },
        select: {
          status: true,
          outcome: true,
          workflow: { select: { triggerType: true, category: true } },
          executions: { select: { stepType: true, status: true } },
        },
      }),
    ]);

    const totalInstances = instances.length;
    const completedCount = instances.filter((i) => i.status === 'COMPLETED').length;
    const pendingApprovalsCount = instances.filter((i) => i.status === 'AWAITING_APPROVAL').length;
    const cancelledCount = instances.filter((i) => i.status === 'CANCELLED').length;
    const failedCount = instances.filter((i) => i.status === 'FAILED').length;
    const reengagedCount = instances.filter((i) => i.outcome === 'MEMBER_REENGAGED').length;

    const actionDistribution: Record<string, number> = {};
    const triggerDistribution: Record<string, number> = {};

    for (const inst of instances) {
      const trigger = inst.workflow?.triggerType || 'UNKNOWN';
      triggerDistribution[trigger] = (triggerDistribution[trigger] || 0) + 1;

      for (const exec of inst.executions) {
        actionDistribution[exec.stepType] = (actionDistribution[exec.stepType] || 0) + 1;
      }
    }

    return {
      totalWorkflows,
      activeWorkflows,
      totalInstances,
      completedCount,
      pendingApprovalsCount,
      cancelledCount,
      failedCount,
      reengagedMembersCount: reengagedCount,
      actionDistribution,
      triggerDistribution,
      lastEvaluatedAt: new Date().toISOString(),
    };
  }
}
