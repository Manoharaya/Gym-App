/**
 * FitCore — Day 42: Collection Queue & Staff Tasks Service
 *
 * Provides finance & reception staff with a prioritized collection queue,
 * deterministic priority scoring, and task resolution workflows.
 */

import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { RECURRING_BILLING_AUDIT } from '../domain/recurring-billing.constants';
import { ResolvedBillingScope } from '../domain/recurring-billing.permissions';
import { CollectionFilterDto } from '../dto/schedule-filter.dto';
import {
  CollectionQueueItemDto,
  CollectionQueueSummaryDto,
  CollectionTaskDto,
  CollectionTaskPriority,
} from '@fitcore/types';

@Injectable()
export class CollectionQueueService {
  private readonly logger = new Logger(CollectionQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Creates a CollectionTask linked to an overdue invoice or dunning case.
   */
  async createCollectionTaskForDunning(
    dunningCaseId: string,
    organisationId: string,
    memberProfileId: string,
    invoiceId: string,
    amountMinor: number,
    currency: string,
    title: string,
    priority: CollectionTaskPriority = 'MEDIUM',
    assignedStaffId?: string,
  ): Promise<CollectionTaskDto> {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      include: { memberOutlets: true },
    });

    const outletId = member?.memberOutlets[0]?.outletId || null;
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days to follow up

    const task = await this.prisma.collectionTask.create({
      data: {
        organisationId,
        outletId,
        dunningCaseId,
        memberProfileId,
        invoiceId,
        title,
        description: `Collection follow-up for overdue invoice (${currency} ${(amountMinor / 100).toFixed(2)})`,
        priority,
        status: assignedStaffId ? 'ASSIGNED' : 'OPEN',
        assignedStaffId: assignedStaffId || null,
        dueDate,
      },
    });

    await this.audit.log({
      action: RECURRING_BILLING_AUDIT.COLLECTION_TASK_CREATED,
      resource: 'collection_task',
      resourceId: task.id,
      organisationId,
      metadata: { priority, invoiceId, dunningCaseId },
    });

    return this.mapTaskToDto(task);
  }

  /**
   * Assigns a staff member to a collection task.
   */
  async assignTask(
    organisationId: string,
    taskId: string,
    assignedStaffId: string,
    actorId: string,
  ): Promise<CollectionTaskDto> {
    const task = await this.prisma.collectionTask.findFirst({
      where: { id: taskId, organisationId },
    });

    if (!task) {
      throw new NotFoundException(`Collection task '${taskId}' not found`);
    }

    const updated = await this.prisma.collectionTask.update({
      where: { id: taskId },
      data: {
        assignedStaffId,
        status: 'ASSIGNED',
      },
    });

    await this.audit.log({
      action: RECURRING_BILLING_AUDIT.COLLECTION_TASK_ASSIGNED,
      resource: 'collection_task',
      resourceId: task.id,
      organisationId,
      userId: actorId,
      metadata: { assignedStaffId },
    });

    return this.mapTaskToDto(updated);
  }

  /**
   * Builds the prioritized collection queue with deterministic scoring.
   */
  async getCollectionQueue(
    scope: ResolvedBillingScope,
    filter: CollectionFilterDto,
  ): Promise<CollectionQueueSummaryDto> {
    const where: any = {
      organisationId: scope.organisationId,
      status: { in: ['OPEN', 'RETRYING', 'CUSTOMER_ACTION_REQUIRED', 'STAFF_REVIEW', 'ESCALATED'] },
    };

    if (filter.status) {
      where.status = filter.status;
    }

    const dunningCases = await this.prisma.dunningCase.findMany({
      where,
      include: {
        invoice: {
          include: {
            memberMembership: {
              include: {
                membershipPlan: true,
                originOutlet: true,
              },
            },
          },
        },
        memberProfile: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        collectionTasks: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const now = Date.now();
    const items: CollectionQueueItemDto[] = [];
    let totalOutstandingMinor = 0;
    let criticalCount = 0;
    let escalatedCount = 0;

    for (const d of dunningCases) {
      const inv = d.invoice;
      const user = d.memberProfile?.user;
      const membership = inv?.memberMembership;
      const plan = membership?.membershipPlan;
      const outlet = membership?.originOutlet;

      if (filter.outletId && outlet?.id !== filter.outletId) {
        continue;
      }
      if (filter.currency && inv?.currency !== filter.currency.toUpperCase()) {
        continue;
      }

      const daysOverdue = inv?.dueDate
        ? Math.max(0, Math.floor((now - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      // Deterministic Priority Score:
      // score = (daysOverdue * 2) + (failedAttempts * 5) + (actionRequired ? 15 : 0) + (status === 'ESCALATED' ? 25 : 0)
      let priorityScore = daysOverdue * 2 + d.totalAttempts * 5;
      if (d.status === 'CUSTOMER_ACTION_REQUIRED') priorityScore += 15;
      if (d.status === 'ESCALATED') priorityScore += 25;

      let priority: CollectionTaskPriority = 'LOW';
      if (priorityScore >= 35 || daysOverdue >= 14) {
        priority = 'URGENT';
        criticalCount++;
      } else if (priorityScore >= 20 || daysOverdue >= 7) {
        priority = 'HIGH';
      } else if (priorityScore >= 10) {
        priority = 'MEDIUM';
      }

      if (d.status === 'ESCALATED') escalatedCount++;

      const amountMinor = inv?.amountDueMinor || 0;
      totalOutstandingMinor += amountMinor;

      const latestTask = d.collectionTasks[0];

      items.push({
        id: latestTask?.id || d.id,
        dunningCaseId: d.id,
        memberProfileId: d.memberProfileId,
        memberName: user ? `${user.firstName} ${user.lastName}` : 'Unknown Member',
        memberEmail: user?.email,
        memberPhone: user?.phone || undefined,
        membershipPlanName: plan?.name || 'Membership',
        invoiceId: d.invoiceId,
        invoiceNumber: inv?.invoiceNumber || '',
        amountMinor,
        amount: amountMinor / 100,
        currency: inv?.currency || 'AUD',
        daysOverdue,
        failedAttempts: d.totalAttempts,
        lastAttemptAt: d.updatedAt.toISOString(),
        nextRetryAt: d.nextActionAt?.toISOString() || null,
        dunningStatus: d.status as any,
        assignedStaffId: latestTask?.assignedStaffId || null,
        priority,
        priorityScore,
        originOutletId: outlet?.id || null,
        outletName: outlet?.name || 'Unattributed',
      });
    }

    // Sort by priorityScore descending
    items.sort((a, b) => b.priorityScore - a.priorityScore);

    const currency = filter.currency?.toUpperCase() || 'AUD';

    return {
      totalQueueCount: items.length,
      totalOutstandingMinor,
      totalOutstanding: totalOutstandingMinor / 100,
      currency,
      criticalCount,
      escalatedCount,
      items: items.slice(filter.offset || 0, (filter.offset || 0) + (filter.limit || 50)),
    };
  }

  private mapTaskToDto(task: any): CollectionTaskDto {
    return {
      id: task.id,
      organisationId: task.organisationId,
      outletId: task.outletId,
      dunningCaseId: task.dunningCaseId,
      memberProfileId: task.memberProfileId,
      invoiceId: task.invoiceId,
      title: task.title,
      description: task.description,
      priority: task.priority as any,
      status: task.status as any,
      assignedStaffId: task.assignedStaffId,
      dueDate: task.dueDate.toISOString(),
      completedAt: task.completedAt?.toISOString() || null,
      resolutionNotes: task.resolutionNotes,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
