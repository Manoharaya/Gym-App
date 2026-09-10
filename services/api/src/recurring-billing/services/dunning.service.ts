/**
 * FitCore — Day 42: Dunning Workflow Engine
 *
 * Coordinates dunning cases, retry reminders, communication step execution,
 * and escalation into staff collection queues.
 */

import {
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BillingCommunicationService } from './billing-communication.service';
import { CollectionQueueService } from './collection-queue.service';
import { AuditService } from '../../audit/audit.service';
import { RECURRING_BILLING_AUDIT } from '../domain/recurring-billing.constants';
import { ResolvedBillingScope } from '../domain/recurring-billing.permissions';
import { DunningFilterDto } from '../dto/schedule-filter.dto';
import {
  DunningCaseDto,
  DunningResolutionType,
  PaymentFailureCategory,
} from '@fitcore/types';

@Injectable()
export class DunningService {
  private readonly logger = new Logger(DunningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: BillingCommunicationService,
    @Inject(forwardRef(() => CollectionQueueService))
    private readonly collectionQueueService: CollectionQueueService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Called when a recurring payment attempt fails.
   * Creates or updates a DunningCase and schedules recovery steps.
   */
  async handlePaymentFailure(
    billingCycleId: string,
    invoiceId: string,
    memberProfileId: string,
    failureCategory: PaymentFailureCategory,
    failureCode: string,
    isRetryable: boolean,
    nextRetryAt: Date | null,
    actorId: string = 'SYSTEM',
  ): Promise<DunningCaseDto> {
    const cycle = await this.prisma.billingCycle.findUnique({
      where: { id: billingCycleId },
      include: { invoice: true },
    });

    if (!cycle) {
      throw new NotFoundException(`Billing cycle '${billingCycleId}' not found`);
    }

    const organisationId = cycle.organisationId;

    // Determine target dunning status
    let status: any = 'RETRYING';
    if (failureCategory === 'AUTHENTICATION_REQUIRED' || failureCategory === 'CUSTOMER_ACTION_REQUIRED') {
      status = 'CUSTOMER_ACTION_REQUIRED';
    } else if (!isRetryable || !nextRetryAt) {
      status = 'STAFF_REVIEW';
    }

    // Upsert DunningCase
    const dunningCase = await this.prisma.dunningCase.upsert({
      where: { billingCycleId },
      create: {
        organisationId,
        billingCycleId,
        invoiceId,
        memberProfileId,
        status,
        totalAttempts: 1,
        nextActionAt: nextRetryAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      update: {
        status,
        totalAttempts: { increment: 1 },
        nextActionAt: nextRetryAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Step 1: Immediate reminder notification via Day 28 Communication
    await this.communicationService.sendPaymentFailedReminder(
      organisationId,
      memberProfileId,
      invoiceId,
      cycle.amountMinor,
      cycle.currency,
      nextRetryAt,
      status === 'CUSTOMER_ACTION_REQUIRED',
    );

    // Step 2: Record reminder step
    const stepCount = await this.prisma.dunningStep.count({
      where: { dunningCaseId: dunningCase.id },
    });

    await this.prisma.dunningStep.create({
      data: {
        dunningCaseId: dunningCase.id,
        stepNumber: stepCount + 1,
        actionType: 'EMAIL_REMINDER',
        scheduledAt: new Date(),
        executedAt: new Date(),
        status: 'EXECUTED',
        result: {
          channel: 'EMAIL',
          failureCategory,
          failureCode,
        },
      },
    });

    // If non-retryable, immediately create a staff collection task
    if (!isRetryable || status === 'STAFF_REVIEW') {
      await this.collectionQueueService.createCollectionTaskForDunning(
        dunningCase.id,
        organisationId,
        memberProfileId,
        invoiceId,
        cycle.amountMinor,
        cycle.currency,
        `Payment failed (${failureCategory}): immediate staff outreach required`,
        'HIGH',
      );
    }

    await this.audit.log({
      action: RECURRING_BILLING_AUDIT.DUNNING_CASE_CREATED,
      resource: 'dunning_case',
      resourceId: dunningCase.id,
      organisationId,
      userId: actorId,
      metadata: {
        status,
        failureCategory,
        nextRetryAt,
      },
    });

    return this.getDunningCaseById(organisationId, dunningCase.id);
  }

  /**
   * Resolves an active dunning case (e.g. upon payment recovery, manual resolution, etc.).
   */
  async resolveDunningForCycle(
    billingCycleId: string,
    resolutionType: DunningResolutionType,
    notes?: string,
    actorId: string = 'SYSTEM',
  ): Promise<void> {
    const dunningCase = await this.prisma.dunningCase.findUnique({
      where: { billingCycleId },
    });

    if (!dunningCase) return;

    await this.prisma.dunningCase.update({
      where: { id: dunningCase.id },
      data: {
        status: resolutionType === 'PAYMENT_RECOVERED' ? 'PAYMENT_RECOVERED' : 'RESOLVED',
        resolvedAt: new Date(),
        resolutionType,
        resolutionNotes: notes,
      },
    });

    // Complete linked collection tasks
    await this.prisma.collectionTask.updateMany({
      where: { dunningCaseId: dunningCase.id, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        resolutionNotes: notes || `Resolved via ${resolutionType}`,
      },
    });

    await this.audit.log({
      action: RECURRING_BILLING_AUDIT.DUNNING_RESOLVED,
      resource: 'dunning_case',
      resourceId: dunningCase.id,
      organisationId: dunningCase.organisationId,
      userId: actorId,
      metadata: { resolutionType, notes },
    });
  }

  /**
   * Retrieves a dunning case by ID.
   */
  async getDunningCaseById(organisationId: string, id: string): Promise<DunningCaseDto> {
    const dunningCase = await this.prisma.dunningCase.findFirst({
      where: { id, organisationId },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
        memberProfile: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!dunningCase) {
      throw new NotFoundException(`Dunning case '${id}' not found`);
    }

    const user = dunningCase.memberProfile?.user;

    return {
      id: dunningCase.id,
      organisationId: dunningCase.organisationId,
      billingCycleId: dunningCase.billingCycleId,
      invoiceId: dunningCase.invoiceId,
      memberProfileId: dunningCase.memberProfileId,
      status: dunningCase.status as any,
      totalAttempts: dunningCase.totalAttempts,
      nextActionAt: dunningCase.nextActionAt?.toISOString() || null,
      escalatedAt: dunningCase.escalatedAt?.toISOString() || null,
      resolvedAt: dunningCase.resolvedAt?.toISOString() || null,
      resolutionType: dunningCase.resolutionType as any,
      resolutionNotes: dunningCase.resolutionNotes,
      metadata: dunningCase.metadata as Record<string, any> | null,
      createdAt: dunningCase.createdAt.toISOString(),
      updatedAt: dunningCase.updatedAt.toISOString(),
      steps: dunningCase.steps.map((s) => ({
        id: s.id,
        dunningCaseId: s.dunningCaseId,
        stepNumber: s.stepNumber,
        actionType: s.actionType as any,
        scheduledAt: s.scheduledAt.toISOString(),
        executedAt: s.executedAt?.toISOString() || null,
        status: s.status as any,
        result: s.result as Record<string, any> | null,
        createdAt: s.createdAt.toISOString(),
      })),
      memberProfile: user
        ? {
            id: dunningCase.memberProfileId,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
          }
        : undefined,
    };
  }

  /**
   * Lists dunning cases.
   */
  async listDunningCases(
    scope: ResolvedBillingScope,
    filter: DunningFilterDto,
  ): Promise<{ data: DunningCaseDto[]; total: number }> {
    const where: any = { organisationId: scope.organisationId };

    if (scope.roleScope === 'SELF' && scope.memberProfileId) {
      where.OR = [
        { memberProfileId: scope.memberProfileId },
        { memberProfile: { userId: scope.memberProfileId } },
      ];
    }

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.memberProfileId) {
      where.memberProfileId = filter.memberProfileId;
    }

    const [total, rows] = await Promise.all([
      this.prisma.dunningCase.count({ where }),
      this.prisma.dunningCase.findMany({
        where,
        skip: filter.offset || 0,
        take: filter.limit || 50,
        orderBy: { nextActionAt: 'asc' },
        include: {
          steps: { orderBy: { stepNumber: 'asc' } },
          memberProfile: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: rows.map((r) => {
        const user = r.memberProfile?.user;
        return {
          id: r.id,
          organisationId: r.organisationId,
          billingCycleId: r.billingCycleId,
          invoiceId: r.invoiceId,
          memberProfileId: r.memberProfileId,
          status: r.status as any,
          totalAttempts: r.totalAttempts,
          nextActionAt: r.nextActionAt?.toISOString() || null,
          escalatedAt: r.escalatedAt?.toISOString() || null,
          resolvedAt: r.resolvedAt?.toISOString() || null,
          resolutionType: r.resolutionType as any,
          resolutionNotes: r.resolutionNotes,
          metadata: r.metadata as Record<string, any> | null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          steps: r.steps.map((s) => ({
            id: s.id,
            dunningCaseId: s.dunningCaseId,
            stepNumber: s.stepNumber,
            actionType: s.actionType as any,
            scheduledAt: s.scheduledAt.toISOString(),
            executedAt: s.executedAt?.toISOString() || null,
            status: s.status as any,
            result: s.result as Record<string, any> | null,
            createdAt: s.createdAt.toISOString(),
          })),
          memberProfile: user
            ? {
                id: r.memberProfileId,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
              }
            : undefined,
        };
      }),
      total,
    };
  }
}
