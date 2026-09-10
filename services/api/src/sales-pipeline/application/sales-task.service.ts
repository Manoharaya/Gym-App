import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  CreateSalesTaskDto,
  UpdateSalesTaskDto,
} from '../dto/sales-pipeline.dto';
import { SalesTaskStatus } from '@fitcore/types';

@Injectable()
export class SalesTaskService {
  private readonly logger = new Logger(SalesTaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a follow-up task and adjust opportunity's nextActionAt.
   */
  async createTask(
    organisationId: string,
    opportunityId: string,
    dto: CreateSalesTaskDto,
  ) {
    const opp = await this.prisma.salesOpportunity.findFirst({
      where: { id: opportunityId, organisationId },
    });

    if (!opp) {
      throw new NotFoundException(
        `Sales Opportunity with ID ${opportunityId} not found in this organisation.`,
      );
    }

    if (dto.assignedStaffId) {
      const staff = await this.prisma.staffProfile.findFirst({
        where: { id: dto.assignedStaffId, organisationId },
      });
      if (!staff) {
        throw new BadRequestException('Assigned staff does not belong to this organisation.');
      }
    }

    const dueAt = new Date(dto.dueAt);

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.salesTask.create({
        data: {
          opportunityId,
          leadId: opp.leadId,
          organisationId,
          outletId: opp.outletId || null,
          title: dto.title,
          description: dto.description || null,
          type: dto.taskType || 'GENERAL',
          priority: dto.priority || 'MEDIUM',
          status: 'OPEN',
          dueAt,
          assignedStaffId: dto.assignedStaffId || opp.ownerStaffId || null,
          metadata: dto.metadata || {},
        },
        include: {
          assignedStaff: {
            include: { user: true },
          },
        },
      });

      // Update nextActionAt on opportunity if sooner or unset
      if (!opp.nextActionAt || dueAt < opp.nextActionAt) {
        await tx.salesOpportunity.update({
          where: { id: opportunityId },
          data: {
            nextActionAt: dueAt,
            nextActionType: created.type,
          },
        });
      }

      return created;
    });

    await this.auditService.log({
      organisationId,
      outletId: opp.outletId || undefined,
      action: 'SALES_TASK_CREATED',
      resource: 'sales_task',
      resourceId: task.id,
      metadata: {
        opportunityId,
        taskTitle: task.title,
        priority: task.priority,
        dueAt: task.dueAt,
      },
    });

    return task;
  }

  /**
   * Update or complete a task.
   */
  async updateTask(
    organisationId: string,
    taskId: string,
    dto: UpdateSalesTaskDto,
  ) {
    const task = await this.prisma.salesTask.findUnique({
      where: { id: taskId },
      include: {
        opportunity: true,
      },
    });

    if (!task || task.opportunity.organisationId !== organisationId) {
      throw new NotFoundException(`Sales Task with ID ${taskId} not found in this organisation.`);
    }

    if (dto.assignedStaffId) {
      const staff = await this.prisma.staffProfile.findFirst({
        where: { id: dto.assignedStaffId, organisationId },
      });
      if (!staff) {
        throw new BadRequestException('Assigned staff does not belong to this organisation.');
      }
    }

    const now = new Date();
    const isCompleting = dto.status === 'COMPLETED' && task.status !== 'COMPLETED';

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.salesTask.update({
        where: { id: taskId },
        data: {
          title: dto.title ?? undefined,
          description: dto.description ?? undefined,
          type: dto.taskType ? dto.taskType : undefined,
          priority: dto.priority ? dto.priority : undefined,
          status: dto.status ? dto.status : undefined,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          completedAt: isCompleting ? now : dto.status && dto.status !== 'COMPLETED' ? null : undefined,
          assignedStaffId: dto.assignedStaffId !== undefined ? dto.assignedStaffId : undefined,
          metadata: dto.metadata ?? undefined,
        },
        include: {
          assignedStaff: {
            include: { user: true },
          },
        },
      });

      // If completing or changing due date, recalculate nextActionAt on opportunity
      const nextPendingTask = await tx.salesTask.findFirst({
        where: {
          opportunityId: task.opportunityId,
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        },
        orderBy: { dueAt: 'asc' },
      });

      await tx.salesOpportunity.update({
        where: { id: task.opportunityId },
        data: {
          nextActionAt: nextPendingTask ? nextPendingTask.dueAt : null,
          nextActionType: nextPendingTask ? nextPendingTask.type : null,
          lastActivityAt: now,
        },
      });

      // Record activity if completed
      if (isCompleting) {
        await tx.salesActivity.create({
          data: {
            opportunityId: task.opportunityId,
            leadId: task.leadId,
            organisationId,
            outletId: task.outletId || null,
            type: 'NOTE',
            title: `Completed task: ${res.title}`,
            actorType: 'STAFF',
          },
        });
      }

      return res;
    });

    return updated;
  }

  /**
   * List tasks with filters.
   */
  async listTasks(
    organisationId: string,
    opportunityId?: string,
    staffId?: string,
    status?: SalesTaskStatus,
  ) {
    return this.prisma.salesTask.findMany({
      where: {
        opportunity: {
          organisationId,
          ...(opportunityId ? { id: opportunityId } : {}),
        },
        ...(staffId ? { assignedStaffId: staffId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        opportunity: {
          include: {
            lead: true,
            stage: true,
          },
        },
        assignedStaff: {
          include: { user: true },
        },
      },
      orderBy: [{ dueAt: 'asc' }],
    });
  }
}
