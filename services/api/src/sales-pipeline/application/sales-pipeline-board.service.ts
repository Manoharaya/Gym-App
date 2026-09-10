import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SalesPipelineService } from './sales-pipeline.service';
import { SalesPipelinePolicyService } from './sales-pipeline-policy.service';
import {
  SalesPipelineColumnDto,
  SalesPipelineBoardDto,
  SalesPipelineMetricsDto,
  SalesOpportunityCardDto,
  PipelineStageType,
} from '@fitcore/types';
import { PipelineMetricsQueryDto } from '../dto/sales-pipeline.dto';

const CANONICAL_STAGES: PipelineStageType[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'TRIAL',
  'TOUR_BOOKED',
  'OFFERED',
  'CONVERTED',
  'LOST',
];

@Injectable()
export class SalesPipelineBoardService {
  private readonly logger = new Logger(SalesPipelineBoardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelineService: SalesPipelineService,
    private readonly policyService: SalesPipelinePolicyService,
  ) {}

  /**
   * Generates a Kanban board view grouped by pipeline stages.
   */
  async getPipelineBoard(
    organisationId: string,
    pipelineId?: string,
    outletId?: string,
    staffId?: string,
  ): Promise<SalesPipelineBoardDto> {
    const pipeline = pipelineId
      ? await this.pipelineService.getPipeline(organisationId, pipelineId)
      : await this.pipelineService.getOrCreateDefaultPipeline(organisationId, outletId);

    const stages = pipeline.stages.sort((a, b) => a.position - b.position);

    const where: any = {
      organisationId,
      pipelineId: pipeline.id,
      ...(outletId ? { outletId } : {}),
      ...(staffId ? { ownerStaffId: staffId } : {}),
    };

    const opportunities = await this.prisma.salesOpportunity.findMany({
      where,
      include: {
        stage: true,
        lead: {
          include: {
            qualificationProfile: true,
          },
        },
        ownerStaff: {
          include: { user: true },
        },
        outlet: true,
        _count: {
          select: { tasks: true, activities: true },
        },
      },
      orderBy: [{ stageEnteredAt: 'asc' }],
    });

    const now = new Date();
    let totalPipelineValue = 0;

    const columns: SalesPipelineColumnDto[] = stages.map((stage) => {
      const stageOpps = opportunities.filter((o) => o.stageId === stage.id);
      const stageValue = stageOpps.reduce(
        (sum, o) => sum + (o.estimatedValue ? Number(o.estimatedValue) : 0),
        0,
      );
      totalPipelineValue += stageValue;

      const opportunityCards: SalesOpportunityCardDto[] = stageOpps.map((opp) => {
        const isStale = this.policyService.isOpportunityStale(
          opp.currentStage as PipelineStageType,
          opp.stageEnteredAt,
          opp.lastActivityAt,
          now,
        );

        const daysInCurrentStage = Math.max(
          0,
          Math.floor((now.getTime() - opp.stageEnteredAt.getTime()) / (1000 * 3600 * 24)),
        );

        const leadName = [opp.lead.firstName, opp.lead.lastName].filter(Boolean).join(' ') || 'Unknown Lead';

        return {
          id: opp.id,
          leadId: opp.leadId,
          leadName,
          leadEmail: opp.lead.email || null,
          leadPhone: opp.lead.phone || null,
          outletId: opp.outletId || null,
          outletName: opp.outlet?.name || null,
          ownerStaffId: opp.ownerStaffId || null,
          ownerStaffName: opp.ownerStaff?.user ? `${opp.ownerStaff.user.firstName} ${opp.ownerStaff.user.lastName}` : null,
          source: opp.source || null,
          serviceInterest: Array.isArray(opp.serviceInterest) ? (opp.serviceInterest as string[]) : [],
          membershipInterest: opp.membershipInterest || opp.interestedPlanId || null,
          estimatedValue: opp.estimatedValue ? Number(opp.estimatedValue) : 0,
          currency: opp.currency || 'USD',
          probability: opp.probability || 0.1,
          currentStage: opp.currentStage as PipelineStageType,
          lastActivityAt: opp.lastActivityAt,
          nextActionType: opp.nextActionType || null,
          nextActionAt: opp.nextActionAt || null,
          isStale,
          daysInCurrentStage,
          qualificationStatus: opp.lead.qualificationProfile?.qualificationStatus || undefined,
        };
      });

      return {
        stageId: stage.id,
        stageType: stage.type as PipelineStageType,
        stageName: stage.name,
        color: stage.color,
        position: stage.position,
        isTerminal: stage.isTerminal,
        opportunityCount: stageOpps.length,
        totalEstimatedValue: stageValue,
        opportunities: opportunityCards,
      };
    });

    return {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      columns,
      totalOpportunities: opportunities.length,
      totalValue: totalPipelineValue,
    };
  }

  /**
   * Generates deterministic sales metrics (funnel conversion, velocity, loss reasons).
   */
  async getPipelineMetrics(
    organisationId: string,
    query: PipelineMetricsQueryDto,
  ): Promise<SalesPipelineMetricsDto> {
    const pipeline = query.pipelineId
      ? await this.pipelineService.getPipeline(organisationId, query.pipelineId)
      : await this.pipelineService.getOrCreateDefaultPipeline(organisationId, query.outletId);

    const dateFilter: any = {};
    if (query.startDate) {
      dateFilter.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      dateFilter.lte = new Date(query.endDate);
    }

    const where: any = {
      organisationId,
      pipelineId: pipeline.id,
      ...(query.outletId ? { outletId: query.outletId } : {}),
      ...(query.startDate || query.endDate ? { createdAt: dateFilter } : {}),
    };

    const opportunities = await this.prisma.salesOpportunity.findMany({
      where,
      include: {
        stage: true,
      },
    });

    const totalCreated = opportunities.length;
    const converted = opportunities.filter((o) => o.currentStage === 'CONVERTED');
    const lost = opportunities.filter((o) => o.currentStage === 'LOST');
    const active = opportunities.filter(
      (o) => !['CONVERTED', 'LOST'].includes(o.currentStage),
    );

    const conversions = converted.length;
    const losses = lost.length;
    const activeOpportunities = active.length;

    const totalFinished = conversions + losses;
    const winRate =
      totalFinished > 0
        ? Math.round((conversions / totalFinished) * 10000) / 100
        : totalCreated > 0
        ? Math.round((conversions / totalCreated) * 10000) / 100
        : 0;

    // Stage breakdown initialization
    const stageBreakdown: Record<PipelineStageType, { count: number; value: number }> = {
      NEW: { count: 0, value: 0 },
      CONTACTED: { count: 0, value: 0 },
      QUALIFIED: { count: 0, value: 0 },
      TRIAL: { count: 0, value: 0 },
      TOUR_BOOKED: { count: 0, value: 0 },
      OFFERED: { count: 0, value: 0 },
      CONVERTED: { count: 0, value: 0 },
      LOST: { count: 0, value: 0 },
    };

    opportunities.forEach((opp) => {
      const stage = opp.currentStage as PipelineStageType;
      const val = opp.estimatedValue ? Number(opp.estimatedValue) : 0;
      if (stageBreakdown[stage]) {
        stageBreakdown[stage].count += 1;
        stageBreakdown[stage].value += val;
      }
    });

    // Funnel rates
    const qualifiedCount = stageBreakdown.QUALIFIED.count + stageBreakdown.TRIAL.count + stageBreakdown.TOUR_BOOKED.count + stageBreakdown.OFFERED.count + conversions;
    const trialCount = stageBreakdown.TRIAL.count + conversions;
    const tourCount = stageBreakdown.TOUR_BOOKED.count + conversions;
    const offeredCount = stageBreakdown.OFFERED.count + conversions;

    const qualifiedToTrialRate = qualifiedCount > 0 ? Math.round((trialCount / qualifiedCount) * 10000) / 100 : 0;
    const trialToConvertedRate = trialCount > 0 ? Math.round((conversions / trialCount) * 10000) / 100 : 0;
    const tourToConvertedRate = tourCount > 0 ? Math.round((conversions / tourCount) * 10000) / 100 : 0;
    const offeredToConvertedRate = offeredCount > 0 ? Math.round((conversions / offeredCount) * 10000) / 100 : 0;
    const overallConversionRate = totalCreated > 0 ? Math.round((conversions / totalCreated) * 10000) / 100 : 0;

    // Stage velocity
    const histories = await this.prisma.salesStageHistory.findMany({
      where: {
        opportunity: {
          organisationId,
          pipelineId: pipeline.id,
        },
        durationSeconds: { gt: 0 },
      },
    });

    const stageVelocityMap: Record<string, { totalSeconds: number; count: number }> = {};
    let totalConversionSeconds = 0;
    let totalConvertedHistories = 0;

    histories.forEach((h) => {
      const st = h.fromStageType;
      if (st) {
        if (!stageVelocityMap[st]) {
          stageVelocityMap[st] = { totalSeconds: 0, count: 0 };
        }
        stageVelocityMap[st].totalSeconds += h.durationSeconds || 0;
        stageVelocityMap[st].count += 1;
      }

      if (h.toStageType === 'CONVERTED') {
        totalConversionSeconds += h.durationSeconds || 0;
        totalConvertedHistories += 1;
      }
    });

    const averageDaysInStage: Record<PipelineStageType, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      TRIAL: 0,
      TOUR_BOOKED: 0,
      OFFERED: 0,
      CONVERTED: 0,
      LOST: 0,
    };

    for (const [st, val] of Object.entries(stageVelocityMap)) {
      if (averageDaysInStage[st as PipelineStageType] !== undefined) {
        averageDaysInStage[st as PipelineStageType] =
          Math.round((val.totalSeconds / val.count / 86400) * 10) / 10;
      }
    }

    const averageDaysToConversion =
      totalConvertedHistories > 0
        ? Math.round((totalConversionSeconds / totalConvertedHistories / 86400) * 10) / 10
        : 0;

    return {
      pipelineId: pipeline.id,
      totalOpportunities: totalCreated,
      activeOpportunities,
      conversions,
      losses,
      winRate,
      stageBreakdown,
      stageConversionRates: {
        qualifiedToTrialRate,
        trialToConvertedRate,
        tourToConvertedRate,
        offeredToConvertedRate,
        overallConversionRate,
      },
      velocity: {
        averageDaysInStage,
        averageDaysToConversion,
      },
    };
  }
}
