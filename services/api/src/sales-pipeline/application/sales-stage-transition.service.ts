import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SalesPipelinePolicyService } from './sales-pipeline-policy.service';
import { SalesPipelineEventService } from './sales-pipeline-event.service';
import { TransitionStageDto } from '../dto/sales-pipeline.dto';
import { SalesStage, SalesTransitionActorType } from '@fitcore/types';

@Injectable()
export class SalesStageTransitionService {
  private readonly logger = new Logger(SalesStageTransitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyService: SalesPipelinePolicyService,
    private readonly eventService: SalesPipelineEventService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Performs an atomic, concurrency-safe stage transition on a sales opportunity.
   */
  async transitionStage(
    organisationId: string,
    opportunityId: string,
    dto: TransitionStageDto,
  ) {
    const now = new Date();

    // 1. Fetch current opportunity state
    const opportunity = await this.prisma.salesOpportunity.findFirst({
      where: {
        id: opportunityId,
        organisationId,
      },
      include: {
        stage: true,
        pipeline: {
          include: {
            stages: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException(
        `Sales Opportunity with ID ${opportunityId} not found in this organisation.`,
      );
    }

    // 2. Concurrency check (optimistic locking)
    if (opportunity.version !== dto.version) {
      throw new ConflictException(
        `Concurrent modification detected. Current opportunity version is ${opportunity.version}, but provided version was ${dto.version}. Please refresh and retry.`,
      );
    }

    const fromStage = opportunity.currentStage as SalesStage;
    const toStage = dto.toStage;

    // 3. Idempotent check
    if (fromStage === toStage) {
      return opportunity;
    }

    // 4. Policy validation
    this.policyService.validateTransition(fromStage, toStage, {
      lossReason: dto.lossReason,
      lossReasonDetails: dto.lossReasonDetails,
      actorType: dto.actorType,
      reopenReason: dto.reopenReason || dto.reason,
    });

    // 5. Find target stage entity in pipeline
    const targetStageEntity = opportunity.pipeline.stages.find(
      (s) => s.type === toStage,
    );
    if (!targetStageEntity) {
      throw new BadRequestException(
        `Stage ${toStage} is not configured in pipeline ${opportunity.pipeline.name}.`,
      );
    }

    // 6. Calculate stage duration
    const durationSeconds = this.policyService.calculateStageDurationSeconds(
      opportunity.stageEnteredAt,
      now,
    );

    // 7. Execute transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      // A. Update opportunity
      const isLost = toStage === 'LOST';
      const isConverted = toStage === 'CONVERTED';
      const isReopened = fromStage === 'LOST' && !isLost;

      const opp = await tx.salesOpportunity.update({
        where: { id: opportunityId },
        data: {
          currentStage: toStage,
          stageId: targetStageEntity.id,
          stageEnteredAt: now,
          version: { increment: 1 },
          lastActivityAt: now,
          lostAt: isLost ? now : isReopened ? null : undefined,
          convertedAt: isConverted ? now : undefined,
          lossReason: isLost ? dto.lossReason : isReopened ? null : undefined,
          lossNotes: isLost
            ? dto.lossReasonDetails || null
            : isReopened
            ? null
            : undefined,
        },
        include: {
          stage: true,
          lead: true,
          ownerStaff: {
            include: { user: true },
          },
        },
      });

      // B. Create immutable history entry
      await tx.salesStageHistory.create({
        data: {
          opportunityId: opp.id,
          fromStageId: opportunity.stageId,
          toStageId: targetStageEntity.id,
          fromStageType: fromStage,
          toStageType: toStage,
          actorType: (dto.actorType || 'STAFF'),
          actorId: dto.actorId || null,
          reason: dto.reason || null,
          durationSeconds,
          metadata: dto.metadata || {},
        },
      });

      // C. Record automated sales activity for timeline audit
      await tx.salesActivity.create({
        data: {
          opportunityId: opp.id,
          leadId: opp.leadId,
          organisationId,
          outletId: opp.outletId || null,
          type: 'STAGE_CHANGE',
          title: `Stage changed to ${targetStageEntity.name}`,
          summary:
            dto.reason ||
            (isLost ? `Opportunity marked as lost: ${dto.lossReason}` : undefined),
          actorType: (dto.actorType || 'STAFF'),
          actorId: dto.actorId || null,
          metadata: {
            fromStage,
            toStage,
            durationSeconds,
            ...(dto.lossReason ? { lossReason: dto.lossReason } : {}),
          },
        },
      });

      return opp;
    });

    // 8. Emit domain events
    await this.eventService.emitSalesEvent({
      organisationId,
      outletId: updated.outletId,
      eventType: 'sales.opportunity.stage_changed',
      payload: {
        opportunityId: updated.id,
        leadId: updated.leadId,
        fromStage,
        toStage,
        actorType: dto.actorType || 'STAFF',
        actorId: dto.actorId,
        durationSeconds,
      },
      idempotencyKey: `sales-trans-${updated.id}-${updated.version}`,
    });

    if (toStage === 'LOST') {
      await this.eventService.emitSalesEvent({
        organisationId,
        outletId: updated.outletId,
        eventType: 'sales.opportunity.lost',
        payload: {
          opportunityId: updated.id,
          leadId: updated.leadId,
          lossReason: dto.lossReason,
          lossReasonDetails: dto.lossReasonDetails,
        },
        idempotencyKey: `sales-lost-${updated.id}-${updated.version}`,
      });
    }

    if (toStage === 'CONVERTED') {
      await this.eventService.emitSalesEvent({
        organisationId,
        outletId: updated.outletId,
        eventType: 'sales.opportunity.converted',
        payload: {
          opportunityId: updated.id,
          leadId: updated.leadId,
          estimatedValue: updated.estimatedValue,
        },
        idempotencyKey: `sales-conv-${updated.id}-${updated.version}`,
      });
    }

    // 9. Audit log
    await this.auditService.log({
      organisationId,
      outletId: updated.outletId || undefined,
      action: 'SALES_OPPORTUNITY_STAGE_TRANSITIONED',
      resource: 'sales_opportunity',
      resourceId: updated.id,
      metadata: {
        fromStage,
        toStage,
        previousVersion: opportunity.version,
        newVersion: updated.version,
        actorType: dto.actorType || 'STAFF',
        actorId: dto.actorId,
        durationSeconds,
      },
    });

    return updated;
  }
}
