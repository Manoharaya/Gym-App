import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SalesPipelineService } from './sales-pipeline.service';
import { SalesPipelinePolicyService } from './sales-pipeline-policy.service';
import { SalesPipelineEventService } from './sales-pipeline-event.service';
import { SalesStageTransitionService } from './sales-stage-transition.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  OpportunityFilterDto,
  ReopenOpportunityDto,
} from '../dto/sales-pipeline.dto';
import { SalesStage } from '@fitcore/types';

@Injectable()
export class SalesOpportunityService {
  private readonly logger = new Logger(SalesOpportunityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelineService: SalesPipelineService,
    private readonly policyService: SalesPipelinePolicyService,
    private readonly eventService: SalesPipelineEventService,
    private readonly transitionService: SalesStageTransitionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new sales opportunity with duplicate detection and automatic default pipeline linkage.
   */
  async createOpportunity(organisationId: string, dto: CreateOpportunityDto) {
    // 1. Verify lead exists under organisation
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: dto.leadId,
        organisationId,
      },
    });
    if (!lead) {
      throw new NotFoundException(
        `Lead with ID ${dto.leadId} not found in this organisation.`,
      );
    }

    // 2. Resolve pipeline
    let pipelineId = dto.pipelineId;
    let pipeline;
    if (pipelineId) {
      pipeline = await this.pipelineService.getPipeline(organisationId, pipelineId);
    } else {
      pipeline = await this.pipelineService.getOrCreateDefaultPipeline(
        organisationId,
        dto.outletId || lead.outletId || undefined,
      );
      pipelineId = pipeline.id;
    }

    // 3. Duplicate Prevention: Check for existing active opportunity for this lead in the same pipeline
    const existingActiveOpp = await this.prisma.salesOpportunity.findFirst({
      where: {
        leadId: dto.leadId,
        pipelineId,
        currentStage: {
          notIn: ['CONVERTED', 'LOST'],
        },
      },
      include: {
        stage: true,
        pipeline: true,
        lead: true,
      },
    });

    if (existingActiveOpp) {
      this.logger.log(
        `Duplicate opportunity prevented: Lead ${dto.leadId} already has active opportunity ${existingActiveOpp.id} in pipeline ${pipelineId}. Returning existing.`,
      );
      return {
        ...existingActiveOpp,
        isStale: this.policyService.isOpportunityStale(
          existingActiveOpp.currentStage as SalesStage,
          existingActiveOpp.stageEnteredAt,
          existingActiveOpp.lastActivityAt,
        ),
        isExistingActive: true,
      };
    }

    // 4. Validate owner staff if provided
    if (dto.ownerStaffId) {
      const staff = await this.prisma.staffProfile.findFirst({
        where: {
          id: dto.ownerStaffId,
          organisationId,
        },
      });
      if (!staff) {
        throw new BadRequestException(
          `Staff with ID ${dto.ownerStaffId} does not belong to this organisation.`,
        );
      }
    }

    // 5. Find initial stage (NEW)
    const initialStage = pipeline.stages.find((s) => s.type === 'NEW');
    if (!initialStage) {
      throw new BadRequestException('Pipeline does not contain a initial NEW stage.');
    }

    const now = new Date();

    // 6. Create opportunity in transaction
    const opportunity = await this.prisma.$transaction(async (tx) => {
      const opp = await tx.salesOpportunity.create({
        data: {
          organisationId,
          outletId: dto.outletId || lead.outletId || null,
          leadId: dto.leadId,
          pipelineId,
          stageId: initialStage.id,
          currentStage: 'NEW',
          title: dto.title || 'Sales Opportunity',
          estimatedValue: dto.estimatedValue ?? 0,
          currency: dto.currency || 'USD',
          interestedPlanId: dto.interestedPlanId || null,
          membershipInterest: dto.interestedPlanId || null,
          source: (dto.source || lead.source) as any,
          ownerStaffId: dto.ownerStaffId || lead.assignedStaffId || null,
          expectedCloseDate: dto.expectedCloseDate
            ? new Date(dto.expectedCloseDate)
            : null,
          stageEnteredAt: now,
          lastActivityAt: now,
          metadata: dto.customFields || {},
        },
        include: {
          stage: true,
          pipeline: true,
          lead: true,
          ownerStaff: {
            include: { user: true },
          },
        },
      });

      // Initial history
      await tx.salesStageHistory.create({
        data: {
          opportunityId: opp.id,
          toStageId: initialStage.id,
          toStageType: 'NEW',
          actorType: 'SYSTEM',
          reason: 'Opportunity initialized',
          durationSeconds: 0,
        },
      });

      // Initial activity
      await tx.salesActivity.create({
        data: {
          opportunityId: opp.id,
          leadId: opp.leadId,
          organisationId,
          outletId: opp.outletId || null,
          type: 'NOTE',
          title: 'Opportunity Created',
          summary: `Opportunity created for lead ${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
          actorType: 'SYSTEM',
        },
      });

      return opp;
    });

    // 7. Emit domain event
    await this.eventService.emitSalesEvent({
      organisationId,
      outletId: opportunity.outletId,
      eventType: 'sales.opportunity.created',
      payload: {
        opportunityId: opportunity.id,
        leadId: opportunity.leadId,
        pipelineId: opportunity.pipelineId,
        title: opportunity.title,
        estimatedValue: opportunity.estimatedValue ? Number(opportunity.estimatedValue) : 0,
      },
      idempotencyKey: `sales-opp-created-${opportunity.id}`,
    });

    // 8. Audit log
    await this.auditService.log({
      organisationId,
      outletId: opportunity.outletId || undefined,
      action: 'SALES_OPPORTUNITY_CREATED',
      resource: 'sales_opportunity',
      resourceId: opportunity.id,
      metadata: {
        leadId: opportunity.leadId,
        pipelineId: opportunity.pipelineId,
        title: opportunity.title,
      },
    });

    return {
      ...opportunity,
      isStale: false,
    };
  }

  /**
   * Get single opportunity by ID with complete relationships and computed staleness.
   */
  async getOpportunity(organisationId: string, opportunityId: string) {
    const opp = await this.prisma.salesOpportunity.findFirst({
      where: {
        id: opportunityId,
        organisationId,
      },
      include: {
        stage: true,
        pipeline: {
          include: { stages: { orderBy: { position: 'asc' } } },
        },
        lead: true,
        ownerStaff: {
          include: { user: true },
        },
        stageHistories: {
          orderBy: { createdAt: 'desc' },
          include: {
            fromStage: true,
            toStage: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
          include: {
            assignedStaff: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!opp) {
      throw new NotFoundException(
        `Sales Opportunity with ID ${opportunityId} not found in this organisation.`,
      );
    }

    return {
      ...opp,
      isStale: this.policyService.isOpportunityStale(
        opp.currentStage as SalesStage,
        opp.stageEnteredAt,
        opp.lastActivityAt,
      ),
    };
  }

  /**
   * Update opportunity editable details.
   */
  async updateOpportunity(
    organisationId: string,
    opportunityId: string,
    dto: UpdateOpportunityDto,
  ) {
    const existing = await this.prisma.salesOpportunity.findFirst({
      where: { id: opportunityId, organisationId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Sales Opportunity with ID ${opportunityId} not found in this organisation.`,
      );
    }

    if (dto.ownerStaffId) {
      const staff = await this.prisma.staffProfile.findFirst({
        where: { id: dto.ownerStaffId, organisationId },
      });
      if (!staff) {
        throw new BadRequestException('Staff does not belong to this organisation.');
      }
    }

    const updated = await this.prisma.salesOpportunity.update({
      where: { id: opportunityId },
      data: {
        title: dto.title ?? undefined,
        estimatedValue: dto.estimatedValue !== undefined ? dto.estimatedValue : undefined,
        currency: dto.currency ?? undefined,
        interestedPlanId:
          dto.interestedPlanId !== undefined ? dto.interestedPlanId : undefined,
        membershipInterest:
          dto.interestedPlanId !== undefined ? dto.interestedPlanId : undefined,
        ownerStaffId:
          dto.ownerStaffId !== undefined ? dto.ownerStaffId : undefined,
        expectedCloseDate:
          dto.expectedCloseDate !== undefined
            ? dto.expectedCloseDate
              ? new Date(dto.expectedCloseDate)
              : null
            : undefined,
        metadata: dto.customFields ?? undefined,
      },
      include: {
        stage: true,
        lead: true,
        ownerStaff: {
          include: { user: true },
        },
      },
    });

    return {
      ...updated,
      isStale: this.policyService.isOpportunityStale(
        updated.currentStage as SalesStage,
        updated.stageEnteredAt,
        updated.lastActivityAt,
      ),
    };
  }

  /**
   * Reopen a lost opportunity.
   */
  async reopenOpportunity(
    organisationId: string,
    opportunityId: string,
    dto: ReopenOpportunityDto,
  ) {
    return this.transitionService.transitionStage(organisationId, opportunityId, {
      toStage: dto.toStage,
      version: dto.version,
      actorType: 'STAFF',
      actorId: dto.actorId,
      reason: `Reopened: ${dto.reopenReason}`,
      reopenReason: dto.reopenReason,
    });
  }

  /**
   * Filter and list opportunities with staleness indicators.
   */
  async listOpportunities(organisationId: string, filter: OpportunityFilterDto) {
    const where: any = {
      organisationId,
    };

    if (filter.pipelineId) {
      where.pipelineId = filter.pipelineId;
    }
    if (filter.stage) {
      where.currentStage = filter.stage;
    }
    if (filter.outletId) {
      where.outletId = filter.outletId;
    }
    if (filter.ownerStaffId) {
      where.ownerStaffId = filter.ownerStaffId;
    }
    if (filter.leadId) {
      where.leadId = filter.leadId;
    }

    const [items, total] = await Promise.all([
      this.prisma.salesOpportunity.findMany({
        where,
        include: {
          stage: true,
          lead: true,
          ownerStaff: {
            include: { user: true },
          },
          _count: {
            select: { activities: true, tasks: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: filter.limit || 50,
        skip: filter.offset || 0,
      }),
      this.prisma.salesOpportunity.count({ where }),
    ]);

    const enriched = items.map((opp) => ({
      ...opp,
      isStale: this.policyService.isOpportunityStale(
        opp.currentStage as SalesStage,
        opp.stageEnteredAt,
        opp.lastActivityAt,
      ),
    }));

    if (filter.isStale !== undefined) {
      const filtered = enriched.filter((o) => o.isStale === filter.isStale);
      return {
        items: filtered,
        total: filtered.length,
      };
    }

    return {
      items: enriched,
      total,
    };
  }
}
