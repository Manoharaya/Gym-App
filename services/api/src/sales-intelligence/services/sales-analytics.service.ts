import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SalesMetricService } from './sales-metric.service';
import { ResolvedSalesScope } from '../domain/sales-intelligence.permissions';
import { SalesFilterDto } from '../dto/sales-filter.dto';
import {
  SalesOverviewDto,
  SalesFunnelResponseDto,
  SalesTrendPointDto,
  SalesSourcePerformanceDto,
  SalesChannelPerformanceDto,
  SalesStaffPerformanceDto,
  SalesOutletPerformanceDto,
  SalesFollowUpPerformanceDto,
  SalesAiReceptionistMetricsDto,
  SalesAiSalesAgentMetricsDto,
  SalesLossAnalyticsDto,
  SalesObjectionAnalyticsDto,
  SalesPipelineVelocityDto,
  SalesDrillDownOpportunityDto,
  FunnelStageType,
} from '@fitcore/types';

export interface DateRangeBounds {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
  timezone: string;
}

@Injectable()
export class SalesAnalyticsService {
  private readonly logger = new Logger(SalesAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricService: SalesMetricService,
  ) {}

  /**
   * Resolves date range boundaries and comparison period.
   */
  resolveDateBounds(filters: SalesFilterDto, timezone: string = 'Australia/Perth'): DateRangeBounds {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    if (filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
    } else {
      switch (filters.timeRange) {
        case 'TODAY':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'YESTERDAY':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setDate(endDate.getDate() - 1);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'LAST_7_DAYS':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'LAST_30_DAYS':
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'THIS_MONTH':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'LAST_MONTH':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case 'THIS_QUARTER':
          const currentQ = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQ * 3, 1);
          break;
        case 'LAST_QUARTER':
          const lastQ = Math.floor(now.getMonth() / 3) - 1;
          const qYear = lastQ < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const qMonth = lastQ < 0 ? 9 : lastQ * 3;
          startDate = new Date(qYear, qMonth, 1);
          endDate = new Date(qYear, qMonth + 3, 0, 23, 59, 59, 999);
          break;
        case 'THIS_YEAR':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
    }

    const durationMs = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - durationMs);

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
      timezone,
    };
  }

  /**
   * Builds base Prisma `where` clause respecting multi-tenant scope and filters.
   */
  private buildScopeWhere(scope: ResolvedSalesScope, filters: SalesFilterDto, dateField: string = 'createdAt', bounds?: DateRangeBounds) {
    const where: any = {};

    if (scope.organisationId && scope.organisationId !== 'all') {
      where.organisationId = scope.organisationId;
    }

    const outletId = filters.outletId || scope.outletId;
    if (outletId) {
      where.outletId = outletId;
    }

    if (scope.staffId) {
      where.ownerStaffId = scope.staffId;
    } else if (filters.staffId) {
      where.ownerStaffId = filters.staffId;
    }

    if (filters.pipelineId) {
      where.pipelineId = filters.pipelineId;
    }

    if (filters.source) {
      where.source = filters.source;
    }

    if (bounds && dateField) {
      where[dateField] = {
        gte: bounds.startDate,
        lte: bounds.endDate,
      };
    }

    return where;
  }

  /**
   * 1. Overview KPIs & Funnel Summary
   */
  async getOverview(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesOverviewDto> {
    const bounds = this.resolveDateBounds(filters);

    // Current period where clauses
    const leadWhereCurr = this.buildScopeWhere(scope, filters, 'createdAt', bounds);
    const oppWhereCurr = this.buildScopeWhere(scope, filters, 'createdAt', bounds);

    // Previous period where clauses
    const prevBounds: DateRangeBounds = {
      ...bounds,
      startDate: bounds.previousStartDate,
      endDate: bounds.previousEndDate,
    };
    const leadWherePrev = this.buildScopeWhere(scope, filters, 'createdAt', prevBounds);
    const oppWherePrev = this.buildScopeWhere(scope, filters, 'createdAt', prevBounds);

    // Converted & Lost where
    const convertedWhereCurr = {
      ...this.buildScopeWhere(scope, filters, 'convertedAt', bounds),
      currentStage: 'CONVERTED',
    };
    const convertedWherePrev = {
      ...this.buildScopeWhere(scope, filters, 'convertedAt', prevBounds),
      currentStage: 'CONVERTED',
    };
    const lostWhereCurr = {
      ...this.buildScopeWhere(scope, filters, 'lostAt', bounds),
      currentStage: 'LOST',
    };
    const lostWherePrev = {
      ...this.buildScopeWhere(scope, filters, 'lostAt', prevBounds),
      currentStage: 'LOST',
    };

    // Parallel counts
    const [
      newLeadsCurr,
      newLeadsPrev,
      qualifiedLeadsCurr,
      qualifiedLeadsPrev,
      openOppsCount,
      convertedCurr,
      convertedPrev,
      lostCurr,
      lostPrev,
      pipelineValueAgg,
      trialsCurr,
      trialsPrev,
      toursCurr,
      toursPrev,
      offersCurr,
      offersPrev,
      speedToLeadRecords,
      responsesCount,
      outboundCount,
      funnelData,
      topSources,
      topLossReasons,
    ] = await Promise.all([
      this.prisma.lead.count({ where: leadWhereCurr }),
      this.prisma.lead.count({ where: leadWherePrev }),
      this.prisma.lead.count({
        where: {
          ...leadWhereCurr,
          qualificationProfile: {
            OR: [
              { qualificationStatus: 'QUALIFIED' },
              { isHighIntent: true },
            ],
          },
        },
      }),
      this.prisma.lead.count({
        where: {
          ...leadWherePrev,
          qualificationProfile: {
            OR: [
              { qualificationStatus: 'QUALIFIED' },
              { isHighIntent: true },
            ],
          },
        },
      }),
      this.prisma.salesOpportunity.count({
        where: {
          ...this.buildScopeWhere(scope, filters, '', undefined),
          currentStage: { notIn: ['CONVERTED', 'LOST'] },
        },
      }),
      this.prisma.salesOpportunity.count({ where: convertedWhereCurr }),
      this.prisma.salesOpportunity.count({ where: convertedWherePrev }),
      this.prisma.salesOpportunity.count({ where: lostWhereCurr }),
      this.prisma.salesOpportunity.count({ where: lostWherePrev }),
      this.prisma.salesOpportunity.aggregate({
        where: {
          ...this.buildScopeWhere(scope, filters, '', undefined),
          currentStage: { notIn: ['CONVERTED', 'LOST'] },
        },
        _sum: { estimatedValue: true },
      }),
      this.prisma.salesOpportunity.count({
        where: { ...oppWhereCurr, currentStage: 'TRIAL' },
      }),
      this.prisma.salesOpportunity.count({
        where: { ...oppWherePrev, currentStage: 'TRIAL' },
      }),
      this.prisma.salesOpportunity.count({
        where: { ...oppWhereCurr, currentStage: 'TOUR_BOOKED' },
      }),
      this.prisma.salesOpportunity.count({
        where: { ...oppWherePrev, currentStage: 'TOUR_BOOKED' },
      }),
      this.prisma.salesOpportunity.count({
        where: { ...oppWhereCurr, currentStage: 'OFFERED' },
      }),
      this.prisma.salesOpportunity.count({
        where: { ...oppWherePrev, currentStage: 'OFFERED' },
      }),
      // Sample speed to lead (first 50)
      this.prisma.salesActivity.findMany({
        where: {
          ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
          type: { in: ['AI_CONVERSATION', 'STAFF_CONVERSATION', 'PHONE_CALL', 'EMAIL', 'SMS', 'WHATSAPP'] },
          occurredAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
        include: { lead: { select: { createdAt: true } } },
        take: 50,
      }),
      // Response rate count
      this.prisma.followUpResponse.count({
        where: {
          ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
          receivedAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      }),
      this.prisma.followUpStepExecution.count({
        where: {
          ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
          status: 'SUCCESS',
          executedAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      }),
      this.getFunnel(scope, filters),
      this.getSourcePerformance(scope, filters),
      this.getLossAnalytics(scope, filters),
    ]);

    // Speed to lead average
    const speedSecondsList = speedToLeadRecords
      .filter((a) => a.lead && a.occurredAt && a.lead.createdAt)
      .map((a) => this.metricService.calculateSpeedToLeadSeconds(a.lead.createdAt, a.occurredAt));
    const avgSpeedSeconds = this.metricService.calculateAverage(speedSecondsList) || 0;

    // Conversion rate & Response rate
    const conversionRateCurr = this.metricService.calculateConversionRate(convertedCurr, newLeadsCurr);
    const conversionRatePrev = this.metricService.calculateConversionRate(convertedPrev, newLeadsPrev);
    const responseRate = this.metricService.calculateConversionRate(responsesCount, outboundCount);

    const pipelineVal = Number(pipelineValueAgg._sum.estimatedValue || 0);

    return {
      kpis: {
        newLeads: this.metricService.buildKpiCard({
          key: 'newLeads',
          label: 'New Leads',
          currentValue: newLeadsCurr,
          comparisonValue: newLeadsPrev,
          definition: 'Total leads captured in date range.',
        }),
        qualifiedLeads: this.metricService.buildKpiCard({
          key: 'qualifiedLeads',
          label: 'Qualified Leads',
          currentValue: qualifiedLeadsCurr,
          comparisonValue: qualifiedLeadsPrev,
          definition: 'Leads reaching authoritative qualified or high-intent state.',
        }),
        openOpportunities: this.metricService.buildKpiCard({
          key: 'openOpportunities',
          label: 'Open Opportunities',
          currentValue: openOppsCount,
          definition: 'Active commercial opportunities currently in progress.',
        }),
        trials: this.metricService.buildKpiCard({
          key: 'trials',
          label: 'Trials Booked',
          currentValue: trialsCurr,
          comparisonValue: trialsPrev,
          definition: 'Prospects engaged in facility trials.',
        }),
        tours: this.metricService.buildKpiCard({
          key: 'tours',
          label: 'Tours Booked',
          currentValue: toursCurr,
          comparisonValue: toursPrev,
          definition: 'Prospects booked for facility tours.',
        }),
        offers: this.metricService.buildKpiCard({
          key: 'offers',
          label: 'Offers Presented',
          currentValue: offersCurr,
          comparisonValue: offersPrev,
          definition: 'Opportunities presented with a concrete commercial offer.',
        }),
        conversions: this.metricService.buildKpiCard({
          key: 'conversions',
          label: 'Conversions',
          currentValue: convertedCurr,
          comparisonValue: convertedPrev,
          definition: 'Opportunities resulting in verified member conversion.',
        }),
        conversionRate: this.metricService.buildKpiCard({
          key: 'conversionRate',
          label: 'Conversion Rate',
          currentValue: conversionRateCurr || 0,
          comparisonValue: conversionRatePrev,
          unit: '%',
          sampleCount: newLeadsCurr,
          definition: 'Percentage of leads converted to membership.',
        }),
        responseRate: this.metricService.buildKpiCard({
          key: 'responseRate',
          label: 'Response Rate',
          currentValue: responseRate || 0,
          unit: '%',
          sampleCount: outboundCount,
          definition: 'Inbound customer response percentage following outbound contact.',
        }),
        speedToLeadSeconds: this.metricService.buildKpiCard({
          key: 'speedToLeadSeconds',
          label: 'Avg Speed to Lead',
          currentValue: avgSpeedSeconds,
          unit: 's',
          sampleCount: speedSecondsList.length,
          definition: 'Average seconds from lead creation to first outbound contact.',
        }),
        pipelineValue: this.metricService.buildKpiCard({
          key: 'pipelineValue',
          label: 'Est. Pipeline Value',
          currentValue: pipelineVal,
          unit: '$',
          definition: 'Total estimated value of active open opportunities.',
        }),
        lostOpportunities: this.metricService.buildKpiCard({
          key: 'lostOpportunities',
          label: 'Lost Opportunities',
          currentValue: lostCurr,
          comparisonValue: lostPrev,
          definition: 'Opportunities explicitly marked as lost.',
        }),
      },
      funnelSummary: funnelData,
      topSources: topSources.slice(0, 5),
      topLossReasons: topLossReasons.lossesByReason.slice(0, 5),
      meta: {
        dateRange: filters.timeRange || 'LAST_30_DAYS',
        startDate: bounds.startDate.toISOString(),
        endDate: bounds.endDate.toISOString(),
        timezone: bounds.timezone,
        generatedAt: new Date().toISOString(),
        freshness: 'NEAR_REAL_TIME',
        organisationId: scope.organisationId,
        outletId: scope.outletId,
        isCached: false,
      },
    };
  }

  /**
   * 2. Detailed Sales Funnel
   */
  async getFunnel(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesFunnelResponseDto> {
    const bounds = this.resolveDateBounds(filters);
    const leadWhere = this.buildScopeWhere(scope, filters, 'createdAt', bounds);
    const oppWhere = this.buildScopeWhere(scope, filters, 'createdAt', bounds);

    const [
      totalLeads,
      contactedCount,
      qualifiedCount,
      trialCount,
      tourCount,
      offeredCount,
      convertedCount,
      lostCount,
      stageHistories,
    ] = await Promise.all([
      this.prisma.lead.count({ where: leadWhere }),
      this.prisma.lead.count({
        where: {
          ...leadWhere,
          status: { in: ['CONTACTED', 'QUALIFYING', 'QUALIFIED', 'TRIAL_INTEREST', 'TOUR_INTEREST', 'MEMBERSHIP_INTEREST', 'CONVERTED'] },
        },
      }),
      this.prisma.lead.count({
        where: {
          ...leadWhere,
          qualificationProfile: {
            OR: [
              { qualificationStatus: 'QUALIFIED' },
              { isHighIntent: true },
            ],
          },
        },
      }),
      this.prisma.salesOpportunity.count({
        where: { ...oppWhere, currentStage: 'TRIAL' },
      }),
      this.prisma.salesOpportunity.count({
        where: { ...oppWhere, currentStage: 'TOUR_BOOKED' },
      }),
      this.prisma.salesOpportunity.count({
        where: { ...oppWhere, currentStage: 'OFFERED' },
      }),
      this.prisma.salesOpportunity.count({
        where: {
          ...oppWhere,
          currentStage: 'CONVERTED',
        },
      }),
      this.prisma.salesOpportunity.count({
        where: {
          ...oppWhere,
          currentStage: 'LOST',
        },
      }),
      this.prisma.salesStageHistory.findMany({
        where: {
          opportunity: {
            ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
            ...(scope.outletId ? { outletId: scope.outletId } : {}),
          },
          createdAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
        select: { toStageType: true, durationSeconds: true },
      }),
    ]);

    // Stage duration averages
    const durationsByStage: Record<string, number[]> = {};
    for (const sh of stageHistories) {
      if (sh.durationSeconds && sh.toStageType) {
        if (!durationsByStage[sh.toStageType]) durationsByStage[sh.toStageType] = [];
        durationsByStage[sh.toStageType].push(sh.durationSeconds);
      }
    }

    const rawStages: { stage: FunnelStageType; name: string; count: number }[] = [
      { stage: 'LEAD', name: 'Leads Captured', count: totalLeads },
      { stage: 'CONTACTED', name: 'Contacted', count: contactedCount },
      { stage: 'QUALIFIED', name: 'Qualified Leads', count: qualifiedCount },
      { stage: 'TRIAL', name: 'Trial Pass', count: trialCount },
      { stage: 'TOUR_BOOKED', name: 'Tour Booked', count: tourCount },
      { stage: 'OFFERED', name: 'Offer Presented', count: offeredCount },
      { stage: 'CONVERTED', name: 'Converted Members', count: convertedCount },
    ];

    const stages = rawStages.map((s, idx) => {
      const percentage = totalLeads > 0 ? Math.round((s.count / totalLeads) * 1000) / 10 : 0;
      const nextStage = rawStages[idx + 1];
      const conversionRate = nextStage
        ? this.metricService.calculateConversionRate(nextStage.count, s.count)
        : null;
      const dropOffRate = conversionRate !== null ? Math.round((100 - conversionRate) * 10) / 10 : null;
      const avgDuration = this.metricService.calculateAverage(durationsByStage[s.stage] || []);

      return {
        stage: s.stage,
        name: s.name,
        count: s.count,
        percentage,
        conversionRate,
        dropOffRate,
        averageTimeInStageSeconds: avgDuration,
      };
    });

    const overallConversionRate = this.metricService.calculateConversionRate(convertedCount, totalLeads);

    return {
      stages,
      lostCount,
      totalLeads,
      overallConversionRate,
    };
  }

  /**
   * 3. Time Series Trends
   */
  async getTrends(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesTrendPointDto[]> {
    const bounds = this.resolveDateBounds(filters);

    const leads = await this.prisma.lead.findMany({
      where: this.buildScopeWhere(scope, filters, 'createdAt', bounds),
      select: { createdAt: true, status: true },
    });

    const opps = await this.prisma.salesOpportunity.findMany({
      where: this.buildScopeWhere(scope, filters, 'createdAt', bounds),
      select: { createdAt: true, currentStage: true, convertedAt: true },
    });

    // Group by day YYYY-MM-DD
    const pointsMap = new Map<string, SalesTrendPointDto>();

    // Seed empty buckets
    let cursor = new Date(bounds.startDate);
    while (cursor <= bounds.endDate) {
      const dayKey = cursor.toISOString().split('T')[0];
      pointsMap.set(dayKey, {
        period: dayKey,
        leads: 0,
        qualifiedLeads: 0,
        opportunities: 0,
        trials: 0,
        tours: 0,
        conversions: 0,
        responseRate: null,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Populate leads
    for (const l of leads) {
      const dayKey = l.createdAt.toISOString().split('T')[0];
      const point = pointsMap.get(dayKey);
      if (point) {
        point.leads++;
        if (l.status === 'QUALIFIED') point.qualifiedLeads++;
      }
    }

    // Populate opps
    for (const o of opps) {
      const dayKey = o.createdAt.toISOString().split('T')[0];
      const point = pointsMap.get(dayKey);
      if (point) {
        point.opportunities++;
        if (o.currentStage === 'TRIAL') point.trials++;
        if (o.currentStage === 'TOUR_BOOKED') point.tours++;
      }
      if (o.convertedAt) {
        const convDay = o.convertedAt.toISOString().split('T')[0];
        const convPoint = pointsMap.get(convDay);
        if (convPoint) convPoint.conversions++;
      }
    }

    return Array.from(pointsMap.values());
  }

  /**
   * 4. Lead Source Attribution
   */
  async getSourcePerformance(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesSourcePerformanceDto[]> {
    const bounds = this.resolveDateBounds(filters);
    const leadWhere = this.buildScopeWhere(scope, filters, 'createdAt', bounds);

    const leads = await this.prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        source: true,
        status: true,
        salesOpportunities: {
          select: { id: true, currentStage: true },
        },
      },
    });

    const sourceStats: Record<string, {
      leads: number;
      qualified: number;
      opps: number;
      trials: number;
      tours: number;
      conversions: number;
    }> = {};

    for (const l of leads) {
      const src = l.source || 'UNKNOWN';
      if (!sourceStats[src]) {
        sourceStats[src] = { leads: 0, qualified: 0, opps: 0, trials: 0, tours: 0, conversions: 0 };
      }
      sourceStats[src].leads++;
      if (l.status === 'QUALIFIED') sourceStats[src].qualified++;

      for (const opp of l.salesOpportunities) {
        sourceStats[src].opps++;
        if (opp.currentStage === 'TRIAL') sourceStats[src].trials++;
        if (opp.currentStage === 'TOUR_BOOKED') sourceStats[src].tours++;
        if (opp.currentStage === 'CONVERTED') sourceStats[src].conversions++;
      }
    }

    return Object.entries(sourceStats).map(([source, stats]) => ({
      source,
      leads: stats.leads,
      qualifiedLeads: stats.qualified,
      opportunities: stats.opps,
      trials: stats.trials,
      tours: stats.tours,
      conversions: stats.conversions,
      conversionRate: this.metricService.calculateConversionRate(stats.conversions, stats.leads),
      dataQuality: this.metricService.evaluateDataQuality(stats.leads),
    }));
  }

  /**
   * 5. Channel Performance Breakdown
   */
  async getChannelPerformance(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesChannelPerformanceDto[]> {
    const bounds = this.resolveDateBounds(filters);

    const activities = await this.prisma.salesActivity.findMany({
      where: {
        ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
        occurredAt: { gte: bounds.startDate, lte: bounds.endDate },
      },
      select: { channel: true, type: true },
    });

    const channelStats: Record<string, {
      contacts: number;
      responses: number;
      trials: number;
      tours: number;
      conversions: number;
      followUps: number;
    }> = {};

    for (const a of activities) {
      const ch = a.channel || 'OTHER';
      if (!channelStats[ch]) {
        channelStats[ch] = { contacts: 0, responses: 0, trials: 0, tours: 0, conversions: 0, followUps: 0 };
      }
      channelStats[ch].contacts++;
      if (a.type === 'TRIAL_BOOKED') channelStats[ch].trials++;
      if (a.type === 'TOUR_BOOKED') channelStats[ch].tours++;
      if (a.type === 'STAGE_CHANGE') channelStats[ch].conversions++;
      if (a.type === 'FOLLOW_UP') channelStats[ch].followUps++;
    }

    return Object.entries(channelStats).map(([channel, stats]) => ({
      channel,
      leads: stats.contacts,
      contacts: stats.contacts,
      responses: stats.responses,
      bookedTrials: stats.trials,
      bookedTours: stats.tours,
      opportunities: stats.trials + stats.tours,
      conversions: stats.conversions,
      followUps: stats.followUps,
      deliveryRate: 100.0,
      responseRate: this.metricService.calculateConversionRate(stats.responses, stats.contacts),
      dataQuality: this.metricService.evaluateDataQuality(stats.contacts),
    }));
  }

  /**
   * 6. Staff Performance (with Small Sample Protection)
   */
  async getStaffPerformance(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesStaffPerformanceDto[]> {
    const bounds = this.resolveDateBounds(filters);

    const staffProfiles = await this.prisma.staffProfile.findMany({
      where: {
        ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
        ...(scope.outletId ? { outletAssignments: { some: { outletId: scope.outletId } } } : {}),
        ...(scope.staffId ? { id: scope.staffId } : {}),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        outletAssignments: { include: { outlet: { select: { name: true } } } },
        ownedOpportunities: {
          where: { createdAt: { gte: bounds.startDate, lte: bounds.endDate } },
          select: { id: true, currentStage: true, convertedAt: true },
        },
        assignedLeads: {
          where: { createdAt: { gte: bounds.startDate, lte: bounds.endDate } },
          select: { id: true, status: true },
        },
        assignedSalesTasks: {
          select: { id: true, status: true, dueAt: true },
        },
      },
    });

    return staffProfiles.map((sp: any) => {
      const name = `${sp.user.firstName || ''} ${sp.user.lastName || ''}`.trim() || 'Staff Member';
      const assignedLeads = sp.assignedLeads.length;
      const contactedLeads = sp.assignedLeads.filter((l: any) => l.status !== 'NEW').length;
      const qualifiedLeads = sp.assignedLeads.filter((l: any) => l.status === 'QUALIFIED').length;
      const opportunities = sp.ownedOpportunities.length;
      const trials = sp.ownedOpportunities.filter((o: any) => o.currentStage === 'TRIAL').length;
      const tours = sp.ownedOpportunities.filter((o: any) => o.currentStage === 'TOUR_BOOKED').length;
      const offers = sp.ownedOpportunities.filter((o: any) => o.currentStage === 'OFFERED').length;
      const conversions = sp.ownedOpportunities.filter((o: any) => o.currentStage === 'CONVERTED').length;
      const lostOpportunities = sp.ownedOpportunities.filter((o: any) => o.currentStage === 'LOST').length;

      const openTasks = sp.assignedSalesTasks.filter((t: any) => t.status === 'OPEN' || t.status === 'ASSIGNED').length;
      const now = new Date();
      const overdueTasks = sp.assignedSalesTasks.filter(
        (t: any) => (t.status === 'OPEN' || t.status === 'ASSIGNED') && t.dueAt < now
      ).length;

      return {
        staffId: sp.id,
        staffName: name,
        outletId: sp.outletAssignments?.[0]?.outletId || undefined,
        outletName: sp.outletAssignments?.[0]?.outlet?.name || undefined,
        assignedLeads,
        contactedLeads,
        responseRate: this.metricService.calculateConversionRate(contactedLeads, assignedLeads),
        qualifiedLeads,
        opportunities,
        trials,
        tours,
        offers,
        conversions,
        lostOpportunities,
        averageResponseTimeSeconds: null,
        openTasks,
        overdueTasks,
        dataQuality: this.metricService.evaluateDataQuality(assignedLeads),
      };
    });
  }

  /**
   * 7. Outlet Performance Comparison (Organisation-Level Scope)
   */
  async getOutletPerformance(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesOutletPerformanceDto[]> {
    const bounds = this.resolveDateBounds(filters);

    const outlets = await this.prisma.outlet.findMany({
      where: {
        ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
        ...(scope.outletId ? { id: scope.outletId } : {}),
      },
      include: {
        leads: {
          where: { createdAt: { gte: bounds.startDate, lte: bounds.endDate } },
          select: { id: true, status: true },
        },
        salesOpportunities: {
          where: { createdAt: { gte: bounds.startDate, lte: bounds.endDate } },
          select: { id: true, currentStage: true, estimatedValue: true },
        },
      },
    });

    return outlets.map((o: any) => {
      const leads = o.leads.length;
      const qualifiedLeads = o.leads.filter((l: any) => l.status === 'QUALIFIED').length;
      const opportunities = o.salesOpportunities.length;
      const trials = o.salesOpportunities.filter((opp: any) => opp.currentStage === 'TRIAL').length;
      const tours = o.salesOpportunities.filter((opp: any) => opp.currentStage === 'TOUR_BOOKED').length;
      const offers = o.salesOpportunities.filter((opp: any) => opp.currentStage === 'OFFERED').length;
      const conversions = o.salesOpportunities.filter((opp: any) => opp.currentStage === 'CONVERTED').length;
      const lostOpportunities = o.salesOpportunities.filter((opp: any) => opp.currentStage === 'LOST').length;
      const pipelineValue = o.salesOpportunities
        .filter((opp: any) => opp.currentStage !== 'CONVERTED' && opp.currentStage !== 'LOST')
        .reduce((sum: number, opp: any) => sum + Number(opp.estimatedValue || 0), 0);

      return {
        outletId: o.id,
        outletName: o.name,
        leads,
        qualifiedLeads,
        opportunities,
        trials,
        tours,
        offers,
        conversions,
        lostOpportunities,
        responseRate: null,
        conversionRate: this.metricService.calculateConversionRate(conversions, leads),
        pipelineValue,
        dataQuality: this.metricService.evaluateDataQuality(leads),
      };
    });
  }

  /**
   * 8. Day 39 Follow-Up Performance
   */
  async getFollowUpPerformance(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesFollowUpPerformanceDto> {
    const bounds = this.resolveDateBounds(filters);

    const baseWhere = {
      ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
      ...(scope.outletId ? { outletId: scope.outletId } : {}),
    };

    const [
      enrollmentsStarted,
      enrollmentsCompleted,
      enrollmentsStopped,
      executionsScheduled,
      executionsSent,
      executionsSuppressed,
      executionsFailed,
      responsesReceived,
      outcomes,
      sequenceRows,
    ] = await Promise.all([
      this.prisma.followUpEnrollment.count({
        where: { ...baseWhere, enrolledAt: { gte: bounds.startDate, lte: bounds.endDate } },
      }),
      this.prisma.followUpEnrollment.count({
        where: { ...baseWhere, status: 'COMPLETED', completedAt: { gte: bounds.startDate, lte: bounds.endDate } },
      }),
      this.prisma.followUpEnrollment.count({
        where: { ...baseWhere, status: 'STOPPED' },
      }),
      this.prisma.followUpStepExecution.count({
        where: { ...baseWhere, scheduledAt: { gte: bounds.startDate, lte: bounds.endDate } },
      }),
      this.prisma.followUpStepExecution.count({
        where: { ...baseWhere, status: 'SUCCESS', executedAt: { gte: bounds.startDate, lte: bounds.endDate } },
      }),
      this.prisma.followUpStepExecution.count({
        where: { ...baseWhere, status: 'SUPPRESSED' },
      }),
      this.prisma.followUpStepExecution.count({
        where: { ...baseWhere, status: { in: ['PERMANENT_FAILURE', 'TRANSIENT_FAILURE'] } },
      }),
      this.prisma.followUpResponse.count({
        where: { ...baseWhere, receivedAt: { gte: bounds.startDate, lte: bounds.endDate } },
      }),
      this.prisma.followUpOutcome.findMany({
        where: { ...baseWhere, recordedAt: { gte: bounds.startDate, lte: bounds.endDate } },
        select: { outcomeType: true },
      }),
      this.prisma.followUpSequence.findMany({
        where: baseWhere,
        include: {
          enrollments: {
            where: { enrolledAt: { gte: bounds.startDate, lte: bounds.endDate } },
            select: { id: true, status: true, responses: { select: { id: true } } },
          },
        },
      }),
    ]);

    const bookingsFollowingFollowUp = outcomes.filter((o: any) => o.outcomeType === 'BOOKING_CREATED').length;
    const trialsFollowingFollowUp = outcomes.filter((o: any) => o.outcomeType === 'TRIAL_BOOKED').length;
    const toursFollowingFollowUp = outcomes.filter((o: any) => o.outcomeType === 'TOUR_BOOKED').length;
    const conversionsFollowingFollowUp = outcomes.filter((o: any) => o.outcomeType === 'CONVERTED').length;

    const sequences = sequenceRows.map((s: any) => ({
      sequenceId: s.id,
      sequenceName: s.name,
      sequenceType: s.sequenceType || s.type || 'LEAD_FOLLOW_UP',
      enrollments: s.enrollments.length,
      completed: s.enrollments.filter((e: any) => e.status === 'COMPLETED').length,
      stopped: s.enrollments.filter((e: any) => e.status === 'STOPPED').length,
      responses: s.enrollments.reduce((sum: number, e: any) => sum + e.responses.length, 0),
      bookings: 0,
      conversions: 0,
    }));

    return {
      sequencesStarted: enrollmentsStarted,
      sequencesCompleted: enrollmentsCompleted,
      sequencesStopped: enrollmentsStopped,
      messagesScheduled: executionsScheduled,
      messagesSent: executionsSent,
      messagesDelivered: executionsSent,
      messagesSuppressed: executionsSuppressed,
      messagesFailed: executionsFailed,
      responsesReceived,
      bookingsFollowingFollowUp,
      trialsFollowingFollowUp,
      toursFollowingFollowUp,
      conversionsFollowingFollowUp,
      followUpResponseRate: this.metricService.calculateConversionRate(responsesReceived, enrollmentsStarted),
      followUpBookingRate: this.metricService.calculateConversionRate(bookingsFollowingFollowUp, enrollmentsStarted),
      followUpConversionFollowingRate: this.metricService.calculateConversionRate(conversionsFollowingFollowUp, enrollmentsStarted),
      sequences,
    };
  }

  /**
   * 9. Day 35 AI Receptionist Metrics
   */
  async getAiReceptionistMetrics(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesAiReceptionistMetricsDto> {
    const bounds = this.resolveDateBounds(filters);
    const baseWhere = {
      ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
      ...(scope.outletId ? { outletId: scope.outletId } : {}),
      startedAt: { gte: bounds.startDate, lte: bounds.endDate },
    };

    const [
      conversations,
      completed,
      abandoned,
      handoffs,
      bookingsCreated,
      leadsCreated,
      unresolved,
    ] = await Promise.all([
      this.prisma.receptionistInteraction.count({ where: baseWhere }),
      this.prisma.receptionistInteraction.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
      this.prisma.receptionistInteraction.count({ where: { ...baseWhere, status: 'ABANDONED' } }),
      this.prisma.receptionistHandoff.count({
        where: {
          ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
          createdAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      }),
      this.prisma.receptionistInteraction.count({ where: { ...baseWhere, outcome: 'BOOKING_CREATED' } }),
      this.prisma.receptionistInteraction.count({ where: { ...baseWhere, outcome: 'LEAD_CREATED' } }),
      this.prisma.receptionistInteraction.count({ where: { ...baseWhere, outcome: 'UNRESOLVED' } }),
    ]);

    return {
      conversations,
      completed,
      abandoned,
      handoffs,
      bookingRequests: bookingsCreated,
      bookingsCreated,
      leadsCreated,
      qualificationEvents: leadsCreated,
      followUpsTriggered: 0,
      customerResponses: conversations,
      unresolved,
      conversationToLeadRate: this.metricService.calculateConversionRate(leadsCreated, conversations),
      conversationToBookingRate: this.metricService.calculateConversionRate(bookingsCreated, conversations),
      conversationToHandoffRate: this.metricService.calculateConversionRate(handoffs, conversations),
    };
  }

  /**
   * 10. Day 36 AI Sales Agent Metrics
   */
  async getAiSalesAgentMetrics(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesAiSalesAgentMetricsDto> {
    const bounds = this.resolveDateBounds(filters);
    const baseWhere = {
      ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
      ...(scope.outletId ? { outletId: scope.outletId } : {}),
      startedAt: { gte: bounds.startDate, lte: bounds.endDate },
    };

    const [
      conversations,
      leadsHandled,
      recommendations,
      handoffs,
      followUpEnrollments,
    ] = await Promise.all([
      this.prisma.salesConversation.count({ where: baseWhere }),
      this.prisma.salesConversation.groupBy({
        by: ['leadId'],
        where: baseWhere,
      }),
      this.prisma.salesRecommendation.findMany({
        where: {
          ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
          createdAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
        select: { recommendationType: true },
      }),
      this.prisma.salesHandoff.count({
        where: {
          ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
          createdAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      }),
      this.prisma.followUpEnrollment.count({
        where: {
          ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
          createdBy: 'AI_SALES_AGENT',
          enrolledAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      }),
    ]);

    const trialRequests = recommendations.filter((r: any) => r.recommendationType === 'TRIAL').length;
    const tourRequests = recommendations.filter((r: any) => r.recommendationType === 'TOUR').length;

    return {
      conversations,
      leadsHandled: leadsHandled.length,
      qualificationExtractions: recommendations.length,
      qualifiedLeads: leadsHandled.length,
      recommendedNextSteps: recommendations.length,
      trialRequests,
      tourRequests,
      humanHandoffs: handoffs,
      followUpEnrollments,
      conversionsFollowingAi: 0,
    };
  }

  /**
   * 11. Day 37 Loss Analytics
   */
  async getLossAnalytics(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesLossAnalyticsDto> {
    const bounds = this.resolveDateBounds(filters);

    const lostOpportunities = await this.prisma.salesOpportunity.findMany({
      where: {
        ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
        currentStage: 'LOST',
        lostAt: { gte: bounds.startDate, lte: bounds.endDate },
      },
      select: { lossReason: true },
    });

    const totalLost = lostOpportunities.length;
    const reasonCounts: Record<string, number> = {};

    for (const opp of lostOpportunities) {
      const reason = opp.lossReason || 'OTHER';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }

    const lossesByReason = Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalLost > 0 ? Math.round((count / totalLost) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      lossesByReason,
      totalLost,
    };
  }

  /**
   * 12. Day 38 Objection Analytics
   */
  async getObjectionAnalytics(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesObjectionAnalyticsDto> {
    const bounds = this.resolveDateBounds(filters);

    const objections = await this.prisma.leadQualificationObjection.findMany({
      where: {
        ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
        createdAt: { gte: bounds.startDate, lte: bounds.endDate },
      },
      select: { objectionType: true, status: true },
    });

    const totalObjections = objections.length;
    const typeStats: Record<string, { total: number; resolved: number }> = {};

    for (const obj of objections) {
      const t = obj.objectionType || 'OTHER';
      if (!typeStats[t]) typeStats[t] = { total: 0, resolved: 0 };
      typeStats[t].total++;
      if (obj.status === 'RESOLVED') typeStats[t].resolved++;
    }

    const objectionsByType = Object.entries(typeStats).map(([type, stats]) => ({
      type,
      frequency: stats.total,
      resolutionRate: this.metricService.calculateConversionRate(stats.resolved, stats.total),
      progressionRate: null,
      conversionFollowingRate: null,
    }));

    return {
      objectionsByType,
      totalObjections,
    };
  }

  /**
   * 13. Pipeline Velocity & Value
   */
  async getPipelineVelocity(scope: ResolvedSalesScope, filters: SalesFilterDto): Promise<SalesPipelineVelocityDto> {
    const opps = await this.prisma.salesOpportunity.findMany({
      where: {
        ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
      },
      select: {
        currentStage: true,
        estimatedValue: true,
        createdAt: true,
        convertedAt: true,
        stageHistories: {
          select: { toStageType: true, durationSeconds: true },
        },
      },
    });

    let estimatedPipelineValue = 0;
    let convertedOpportunityValue = 0;
    let lostOpportunityValue = 0;
    const leadToConversionDays: number[] = [];

    for (const opp of opps) {
      const val = Number(opp.estimatedValue || 0);
      if (opp.currentStage === 'CONVERTED') {
        convertedOpportunityValue += val;
        if (opp.convertedAt) {
          const days = (opp.convertedAt.getTime() - opp.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          leadToConversionDays.push(Math.max(0, Math.round(days * 10) / 10));
        }
      } else if (opp.currentStage === 'LOST') {
        lostOpportunityValue += val;
      } else {
        estimatedPipelineValue += val;
      }
    }

    return {
      averageDaysInStage: {},
      medianDaysInStage: {},
      averageLeadToOpportunityDays: null,
      averageOpportunityToConversionDays: this.metricService.calculateAverage(leadToConversionDays),
      estimatedPipelineValue,
      convertedOpportunityValue,
      lostOpportunityValue,
    };
  }

  /**
   * 14. Opportunity Drill-Down
   */
  async getDrillDownOpportunities(
    scope: ResolvedSalesScope,
    filters: SalesFilterDto,
  ): Promise<{ data: SalesDrillDownOpportunityDto[]; total: number }> {
    const bounds = this.resolveDateBounds(filters);

    const where: any = {
      ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
      ...(scope.outletId ? { outletId: scope.outletId } : {}),
      ...(scope.staffId ? { ownerStaffId: scope.staffId } : {}),
      createdAt: { gte: bounds.startDate, lte: bounds.endDate },
    };

    if (filters.status) {
      where.currentStage = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { lead: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { lead: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.salesOpportunity.count({ where }),
      this.prisma.salesOpportunity.findMany({
        where,
        include: {
          lead: { select: { firstName: true, lastName: true, email: true, phone: true } },
          ownerStaff: {
            select: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          outlet: { select: { name: true } },
        },
        skip: filters.offset || 0,
        take: filters.limit || 50,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const data: SalesDrillDownOpportunityDto[] = rows.map((r: any) => ({
      id: r.id,
      leadId: r.leadId,
      leadName: `${r.lead.firstName || ''} ${r.lead.lastName || ''}`.trim() || 'Prospective Member',
      leadEmail: r.lead.email || undefined,
      leadPhone: r.lead.phone || undefined,
      currentStage: r.currentStage,
      ownerStaffId: r.ownerStaffId || undefined,
      ownerStaffName: r.ownerStaff
        ? `${r.ownerStaff.user.firstName || ''} ${r.ownerStaff.user.lastName || ''}`.trim()
        : undefined,
      outletId: r.outletId || undefined,
      outletName: r.outlet?.name || undefined,
      estimatedValue: Number(r.estimatedValue || 0),
      source: r.source || undefined,
      createdAt: r.createdAt.toISOString(),
      lastActivityAt: r.lastActivityAt.toISOString(),
      convertedAt: r.convertedAt?.toISOString(),
      lostAt: r.lostAt?.toISOString(),
      lossReason: r.lossReason || undefined,
    }));

    return { data, total };
  }

  /**
   * 15. Activity Timeline
   */
  async getActivityTimeline(scope: ResolvedSalesScope, filters: SalesFilterDto) {
    const bounds = this.resolveDateBounds(filters);

    return this.prisma.salesActivity.findMany({
      where: {
        ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
        occurredAt: { gte: bounds.startDate, lte: bounds.endDate },
      },
      include: {
        lead: { select: { firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: filters.limit || 50,
    });
  }
}
