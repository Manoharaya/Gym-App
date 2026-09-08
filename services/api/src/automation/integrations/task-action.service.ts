/**
 * Day 30 — Staff Task Action Integration Service
 *
 * Creates staff follow-up tasks linked to the member, assigned trainer/staff,
 * and workflow instance.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ExecuteStaffTaskActionParams {
  organisationId: string;
  outletId?: string | null;
  memberId: string;
  title: string;
  description: string;
  priority?: string; // LOW, MEDIUM, HIGH, URGENT
  assignedStaffId?: string;
  dueDays?: number;
  workflowInstanceId: string;
}

@Injectable()
export class TaskActionService {
  private readonly logger = new Logger(TaskActionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes a CREATE_STAFF_TASK action by recording a staff outreach task.
   */
  async executeStaffTaskAction(params: ExecuteStaffTaskActionParams): Promise<{
    success: boolean;
    taskId?: string;
    details: string;
  }> {
    const {
      organisationId,
      outletId,
      memberId,
      title,
      description,
      priority = 'MEDIUM',
      assignedStaffId,
      dueDays = 3,
      workflowInstanceId,
    } = params;

    try {
      // Find member to identify assigned trainer if staff not explicitly set
      const member = await this.prisma.memberProfile.findUnique({
        where: { id: memberId },
        include: {
          memberOutlets: true,
          trainerClientAssignments: {
            where: { status: 'ACTIVE' },
            include: { trainerProfile: { include: { staffProfile: true } } },
            take: 1,
          },
        },
      });

      const primaryOutletId = outletId || member?.memberOutlets[0]?.outletId || null;
      const assignedTrainerUserId = member?.trainerClientAssignments[0]?.trainerProfile?.staffProfile?.userId;
      const effectiveStaffId = assignedStaffId || assignedTrainerUserId || null;
      const scheduledAt = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);

      const outreach = await this.prisma.retentionOutreach.create({
        data: {
          organisationId,
          outletId: primaryOutletId,
          memberId,
          interventionType: 'STAFF_FOLLOW_UP',
          status: 'PENDING_APPROVAL',
          approvalStatus: 'PENDING',
          recommendedChannel: 'PHONE',
          selectedChannel: 'PHONE',
          messageDraft: `${title}\n\n${description}`,
          staffNotes: `Automated Task created by Workflow Instance ${workflowInstanceId}. Priority: ${priority}`,
          scheduledAt,
          assignedStaffId: effectiveStaffId,
        },
      });

      return {
        success: true,
        taskId: outreach.id,
        details: `Staff task created successfully. Task ID: ${outreach.id}, Assigned: ${effectiveStaffId || 'Unassigned'}`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to create staff task: ${err.message}`, err.stack);
      return {
        success: false,
        details: `Failed to create staff task: ${err.message}`,
      };
    }
  }
}
