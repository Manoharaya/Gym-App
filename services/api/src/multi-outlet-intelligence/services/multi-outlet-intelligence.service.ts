import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OutletMetricService, RawOutletMetrics } from './outlet-metric.service';
import { OutletNormalisationService } from './outlet-normalisation.service';
import { OutletBenchmarkService } from './outlet-benchmark.service';
import { OutletRankingService } from './outlet-ranking.service';
import { OutletComparisonService } from './outlet-comparison.service';
import { OutletTrendService } from './outlet-trend.service';
import { OutletHealthService } from './outlet-health.service';
import { OutletDataQualityService } from './outlet-data-quality.service';
import { OutletCacheService } from './outlet-cache.service';
import { OutletInsightService } from './outlet-insight.service';
import { OutletMetricRegistryService } from '../domain/outlet-metric-registry';
import { AuditService } from '../../audit/audit.service';
import { ComparisonService } from '../../business-intelligence/services/comparison.service';
import { BusinessBiRequestUser } from '../../business-intelligence/domain/business-intelligence.permissions';
import { OutletIntelligencePermissionService } from '../domain/outlet-permission.service';
import { MultiOutletFilterDto } from '../dto/multi-outlet-filter.dto';
import { MultiOutletAiQueryDto } from '../dto/multi-outlet-ai-query.dto';
import {
  MultiOutletOverviewDto,
  OutletOverviewSummaryDto,
  OutletHealthReport,
  OutletBenchmarkSummaryDto,
  OutletTrendSeriesDto,
  OutletMetricComparison,
  MultiOutletAIInsight,
} from '@fitcore/types';

@Injectable()
export class MultiOutletIntelligenceService {
  private readonly logger = new Logger(MultiOutletIntelligenceService.name);

  constructor(
    private readonly metricService: OutletMetricService,
    private readonly normalisationService: OutletNormalisationService,
    private readonly benchmarkService: OutletBenchmarkService,
    private readonly rankingService: OutletRankingService,
    private readonly comparisonService: OutletComparisonService,
    private readonly trendService: OutletTrendService,
    private readonly healthService: OutletHealthService,
    private readonly dataQualityService: OutletDataQualityService,
    private readonly cacheService: OutletCacheService,
    private readonly insightService: OutletInsightService,
    private readonly registryService: OutletMetricRegistryService,
    private readonly auditService: AuditService,
    private readonly biComparisonService: ComparisonService,
  ) {}

  /**
   * Generates the comprehensive Multi-Outlet Overview with caching and audit logging.
   */
  async getOverview(
    user: BusinessBiRequestUser,
    filters: MultiOutletFilterDto,
  ): Promise<MultiOutletOverviewDto> {
    const scope = OutletIntelligencePermissionService.resolveScope(user, filters.outletId);
    const bounds = this.biComparisonService.resolveDateBounds(filters as any);

    const cacheKey = this.cacheService.buildKey({
      organisationId: scope.organisationId,
      outletScope: scope.outletId || 'all',
      userRole: scope.userRole,
      dateRange: `${bounds.startDate.toISOString()}_${bounds.endDate.toISOString()}`,
      currency: filters.currency,
      normalisation: filters.normalisation,
      filters: filters as any,
    });

    const cached = await this.cacheService.get<MultiOutletOverviewDto>(cacheKey);
    if (cached) return cached;

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      action: 'MULTI_OUTLET_DASHBOARD_VIEWED' as any,
      resource: 'multi_outlet_intelligence',
      metadata: { filters, scope: scope.roleScope },
    });

    // 1. Fetch raw metrics for all outlets in scope
    const { outlets: rawOutlets, unattributed } = await this.metricService.queryRawOutletMetrics(
      scope,
      bounds,
      filters,
    );

    const totalOutlets = rawOutlets.length;
    const isSingleOutlet = totalOutlets === 1;

    // 2. Health Reports & Summaries per outlet
    const healthReports: Record<string, OutletHealthReport> = {};
    const outletSummaries: OutletOverviewSummaryDto[] = [];
    const qualityRatings: Record<string, any> = {};

    for (const outlet of rawOutlets) {
      const health = this.healthService.evaluateOutletHealth(outlet);
      healthReports[outlet.outletId] = health;

      const quality = this.dataQualityService.assessOutlet(outlet);
      qualityRatings[outlet.outletId] = quality.rating;

      const growthRate = outlet.priorActiveMembers > 0
        ? Math.round((outlet.netMemberChange / outlet.priorActiveMembers) * 1000) / 10
        : null;

      const conversionRate = outlet.newLeads > 0
        ? Math.round((outlet.conversions / outlet.newLeads) * 1000) / 10
        : null;

      const revPerMember = outlet.activeMembers > 0
        ? Math.round((outlet.netRevenue / outlet.activeMembers) * 100) / 100
        : null;

      const visitsPerMember = outlet.activeMembers > 0
        ? Math.round((outlet.totalVisits / outlet.activeMembers) * 100) / 100
        : null;

      const fillRate = outlet.totalCapacity > 0
        ? Math.round((outlet.attendedBookings / outlet.totalCapacity) * 1000) / 10
        : null;

      const riskPct = outlet.activeMembers > 0
        ? Math.round((outlet.highRiskRetentionCount / outlet.activeMembers) * 1000) / 10
        : null;

      outletSummaries.push({
        outletId: outlet.outletId,
        outletName: outlet.outletName,
        code: outlet.code,
        currency: outlet.currency,
        activeMembers: outlet.activeMembers,
        netMemberChange: outlet.netMemberChange,
        memberGrowthRate: growthRate,
        newLeads: outlet.newLeads,
        conversionRate,
        conversionDenominator: outlet.newLeads,
        grossRevenue: outlet.grossRevenue,
        netRevenue: outlet.netRevenue,
        revenuePerActiveMember: revPerMember,
        totalVisits: outlet.totalVisits,
        visitsPerActiveMember: visitsPerMember,
        classFillRate: fillRate,
        averageEngagementScore: outlet.averageEngagementScore,
        highRiskRetentionCount: outlet.highRiskRetentionCount,
        highRiskPercentage: riskPct,
        healthStatus: health.overallStatus,
        attentionFlagsCount: health.attentionFlags.length,
        dataQuality: quality.rating,
        freshness: quality.freshness,
      });
    }

    // 3. Currency Grouping
    const currencyGroups: Record<string, any> = {};
    for (const summary of outletSummaries) {
      const c = summary.currency;
      if (!currencyGroups[c]) {
        currencyGroups[c] = {
          currency: c,
          outlets: [],
          totalGrossRevenue: 0,
          totalNetRevenue: 0,
          averageRevenuePerMember: 0,
        };
      }
      currencyGroups[c].outlets.push(summary);
      currencyGroups[c].totalGrossRevenue += summary.grossRevenue;
      currencyGroups[c].totalNetRevenue += summary.netRevenue;
    }

    // Calculate currency group averages
    for (const c of Object.keys(currencyGroups)) {
      const g = currencyGroups[c];
      const totalMembers = g.outlets.reduce((acc: number, o: any) => acc + o.activeMembers, 0);
      g.averageRevenuePerMember =
        totalMembers > 0 ? Math.round((g.totalNetRevenue / totalMembers) * 100) / 100 : null;
      g.totalGrossRevenue = Math.round(g.totalGrossRevenue * 100) / 100;
      g.totalNetRevenue = Math.round(g.totalNetRevenue * 100) / 100;
    }

    // 4. Categorical Leaders (only if multi-outlet)
    const leaders = !isSingleOutlet
      ? this.rankingService.evaluateLeaders(rawOutlets, filters.currency)
      : {};

    const currencies = Array.from(new Set(rawOutlets.map((o) => o.currency)));

    const result: MultiOutletOverviewDto = {
      organisationId: scope.organisationId,
      period: {
        start: bounds.startDate.toISOString(),
        end: bounds.endDate.toISOString(),
        timezone: bounds.timezone,
        timeRange: (filters.timeRange || 'LAST_30_DAYS') as any,
      },
      isSingleOutlet,
      singleOutletStatus: isSingleOutlet ? 'SINGLE_OUTLET' : undefined,
      totalOutlets,
      activeComparableOutlets: totalOutlets,
      currencies: currencies.length > 0 ? currencies : ['AUD'],
      leaders,
      outlets: outletSummaries,
      currencyGroups,
      unattributedRevenue: unattributed,
      healthOverview: healthReports,
      dataQualityRatings: qualityRatings,
      generatedAt: new Date().toISOString(),
    };

    await this.cacheService.set(cacheKey, result, 180);
    return result;
  }

  /**
   * Retrieves categorical rankings for a selected metric.
   */
  async getRankings(
    user: BusinessBiRequestUser,
    filters: MultiOutletFilterDto,
  ): Promise<OutletMetricComparison[]> {
    const scope = OutletIntelligencePermissionService.resolveScope(user, filters.outletId);
    const bounds = this.biComparisonService.resolveDateBounds(filters as any);

    const { outlets } = await this.metricService.queryRawOutletMetrics(scope, bounds, filters);
    const metricKey = filters.metricKey || 'finance.net_revenue';
    const metricDef = this.registryService.getMetric(metricKey);

    return this.rankingService.rankOutletsByMetric({
      metricKey,
      metricLabel: metricDef?.label || 'Metric',
      domain: metricDef?.domain || 'FINANCE',
      unit: (metricDef?.unit as string) || 'CURRENCY',
      currency: filters.currency,
      mode: filters.normalisation || 'PER_ACTIVE_MEMBER',
      outlets,
      valueExtractor: (o) => {
        switch (metricKey) {
          case 'finance.net_revenue':
            return { absolute: o.netRevenue, denominator: o.activeMembers };
          case 'membership.active_members':
            return { absolute: o.activeMembers, baseline: o.priorActiveMembers };
          case 'membership.growth_rate':
            return { absolute: o.netMemberChange, denominator: o.priorActiveMembers, baseline: o.priorActiveMembers };
          case 'sales.conversion_rate':
            return { absolute: o.conversions, denominator: o.newLeads };
          case 'attendance.total_visits':
            return { absolute: o.totalVisits, denominator: o.activeMembers };
          case 'bookings.fill_rate':
            return { absolute: o.attendedBookings, denominator: o.totalCapacity };
          default:
            return { absolute: o.netRevenue, denominator: o.activeMembers };
        }
      },
    });
  }

  /**
   * Retrieves organisation benchmark distributions.
   */
  async getBenchmarks(
    user: BusinessBiRequestUser,
    filters: MultiOutletFilterDto,
  ): Promise<OutletBenchmarkSummaryDto> {
    const scope = OutletIntelligencePermissionService.resolveScope(user, filters.outletId);
    const bounds = this.biComparisonService.resolveDateBounds(filters as any);

    const { outlets } = await this.metricService.queryRawOutletMetrics(scope, bounds, filters);
    const metricKey = filters.metricKey || 'finance.net_revenue';
    const metricDef = this.registryService.getMetric(metricKey);

    return this.benchmarkService.computeBenchmark({
      metricKey,
      domain: metricDef?.domain || 'FINANCE',
      unit: (metricDef?.unit as string) || 'CURRENCY',
      currency: filters.currency,
      outlets,
      extractor: (o) => {
        if (metricKey === 'finance.net_revenue') {
          return filters.normalisation === 'PER_ACTIVE_MEMBER' && o.activeMembers > 0
            ? Math.round((o.netRevenue / o.activeMembers) * 100) / 100
            : o.netRevenue;
        }
        if (metricKey === 'sales.conversion_rate') {
          return o.newLeads > 0 ? Math.round((o.conversions / o.newLeads) * 1000) / 10 : null;
        }
        if (metricKey === 'attendance.total_visits') {
          return filters.normalisation === 'PER_ACTIVE_MEMBER' && o.activeMembers > 0
            ? Math.round((o.totalVisits / o.activeMembers) * 100) / 100
            : o.totalVisits;
        }
        return o.netRevenue;
      },
    });
  }

  /**
   * Retrieves trend points across outlets.
   */
  async getTrends(
    user: BusinessBiRequestUser,
    filters: MultiOutletFilterDto,
  ): Promise<OutletTrendSeriesDto[]> {
    const scope = OutletIntelligencePermissionService.resolveScope(user, filters.outletId);
    const bounds = this.biComparisonService.resolveDateBounds(filters as any);

    const { outlets } = await this.metricService.queryRawOutletMetrics(scope, bounds, filters);
    const outletIds = outlets.map((o) => o.outletId);

    return this.trendService.getOutletTrends({
      organisationId: scope.organisationId,
      outletIds,
      metricKey: filters.metricKey || 'finance.net_revenue',
      bounds,
      filters,
    });
  }

  /**
   * Side-by-side outlet comparison.
   */
  async getComparison(
    user: BusinessBiRequestUser,
    filters: MultiOutletFilterDto,
  ) {
    const scope = OutletIntelligencePermissionService.resolveScope(user, filters.outletId);
    const bounds = this.biComparisonService.resolveDateBounds(filters as any);

    const { outlets } = await this.metricService.queryRawOutletMetrics(scope, bounds, filters);
    const selectedIds = filters.outletIds ? filters.outletIds.split(',') : undefined;
    const metricKey = filters.metricKey || 'finance.net_revenue';
    const metricDef = this.registryService.getMetric(metricKey);

    return this.comparisonService.compareOutlets({
      metricKey,
      metricLabel: metricDef?.label || 'Metric',
      domain: metricDef?.domain || 'FINANCE',
      unit: (metricDef?.unit as string) || 'CURRENCY',
      currency: filters.currency,
      mode: filters.normalisation || 'PER_ACTIVE_MEMBER',
      outlets,
      selectedOutletIds: selectedIds,
      valueExtractor: (o) => ({
        absolute: o.netRevenue,
        denominator: o.activeMembers,
      }),
    });
  }

  /**
   * Generates grounded AI insights for multi-outlet intelligence.
   */
  async generateAiInsights(
    user: BusinessBiRequestUser,
    query: MultiOutletAiQueryDto,
  ): Promise<MultiOutletAIInsight> {
    const overview = await this.getOverview(user, {
      currency: query.outletId,
    } as any);

    return this.insightService.generateInsights({
      organisationId: overview.organisationId,
      overview,
      query,
      userId: user.id,
    });
  }

  /**
   * Exports RFC 4180 compliant CSV with formula injection defense.
   */
  async exportCsv(
    user: BusinessBiRequestUser,
    filters: MultiOutletFilterDto,
  ): Promise<string> {
    const overview = await this.getOverview(user, filters);

    const sanitize = (val: any): string => {
      if (val === null || val === undefined) return '';
      let str = String(val).trim();
      // RFC 4180 & Excel Formula Injection Defense: prepend quote if starting with =, +, -, @
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [];
    lines.push('FITCORE MULTI-OUTLET INTELLIGENCE & BENCHMARKING EXPORT');
    lines.push(`Generated At,${sanitize(overview.generatedAt)}`);
    lines.push(`Period Start,${sanitize(overview.period.start)}`);
    lines.push(`Period End,${sanitize(overview.period.end)}`);
    lines.push(`Total Outlets,${sanitize(overview.totalOutlets)}`);
    lines.push(`Currencies,${sanitize(overview.currencies.join('; '))}`);
    lines.push('');

    // Outlet Table
    lines.push('OUTLET PERFORMANCE COMPARISON TABLE');
    lines.push('Outlet ID,Outlet Name,Code,Currency,Active Members,Net Change,Growth %,New Leads,Conversion %,Net Revenue,Rev/Member,Visits,Visits/Member,Class Fill %,Health Status,Quality');

    for (const o of overview.outlets) {
      lines.push([
        sanitize(o.outletId),
        sanitize(o.outletName),
        sanitize(o.code),
        sanitize(o.currency),
        sanitize(o.activeMembers),
        sanitize(o.netMemberChange),
        sanitize(o.memberGrowthRate !== null ? `${o.memberGrowthRate}%` : 'N/A'),
        sanitize(o.newLeads),
        sanitize(o.conversionRate !== null ? `${o.conversionRate}%` : 'N/A'),
        sanitize(o.netRevenue),
        sanitize(o.revenuePerActiveMember !== null ? o.revenuePerActiveMember : 'N/A'),
        sanitize(o.totalVisits),
        sanitize(o.visitsPerActiveMember !== null ? o.visitsPerActiveMember : 'N/A'),
        sanitize(o.classFillRate !== null ? `${o.classFillRate}%` : 'N/A'),
        sanitize(o.healthStatus),
        sanitize(o.dataQuality),
      ].join(','));
    }

    lines.push('');
    lines.push('UNATTRIBUTED REVENUE');
    lines.push('Currency,Gross Revenue,Net Revenue,Transaction Count');
    for (const [curr, un] of Object.entries(overview.unattributedRevenue)) {
      lines.push([
        sanitize(curr),
        sanitize(un.grossRevenue),
        sanitize(un.netRevenue),
        sanitize(un.transactionCount),
      ].join(','));
    }

    return lines.join('\n');
  }

  getMetricDefinitions() {
    return this.registryService.getAllMetrics();
  }

  async getOutlets(user: BusinessBiRequestUser, filters: MultiOutletFilterDto) {
    const overview = await this.getOverview(user, filters);
    return {
      organisationId: overview.organisationId,
      period: overview.period,
      totalOutlets: overview.totalOutlets,
      isSingleOutlet: overview.isSingleOutlet,
      singleOutletStatus: overview.singleOutletStatus,
      outlets: overview.outlets,
    };
  }

  async getMetrics(user: BusinessBiRequestUser, filters: MultiOutletFilterDto) {
    const definitions = this.registryService.getAllMetrics();
    const rankings = await this.getRankings(user, filters);
    return {
      definitions,
      metricKey: filters.metricKey || 'finance.net_revenue',
      comparison: rankings,
    };
  }

  async getHealth(user: BusinessBiRequestUser, filters: MultiOutletFilterDto) {
    const overview = await this.getOverview(user, filters);
    return {
      organisationId: overview.organisationId,
      period: overview.period,
      healthOverview: overview.healthOverview,
    };
  }

  async getAttention(user: BusinessBiRequestUser, filters: MultiOutletFilterDto) {
    const overview = await this.getOverview(user, filters);
    const attentionOutlets = overview.outlets.filter(
      (o) =>
        o.attentionFlagsCount > 0 ||
        o.healthStatus === 'ATTENTION_REQUIRED' ||
        o.healthStatus === 'WATCH',
    );
    return {
      organisationId: overview.organisationId,
      period: overview.period,
      totalAttentionRequired: attentionOutlets.length,
      outlets: attentionOutlets.map((o) => ({
        outletId: o.outletId,
        outletName: o.outletName,
        code: o.code,
        healthStatus: o.healthStatus,
        attentionFlags: overview.healthOverview[o.outletId]?.attentionFlags || [],
        recommendations: overview.healthOverview[o.outletId]?.opportunities || [],
        dataQuality: o.dataQuality,
      })),
    };
  }

  async getDataQuality(user: BusinessBiRequestUser, filters: MultiOutletFilterDto) {
    const scope = OutletIntelligencePermissionService.resolveScope(user, filters.outletId);
    const bounds = this.biComparisonService.resolveDateBounds(filters as any);
    const { outlets } = await this.metricService.queryRawOutletMetrics(scope, bounds, filters);
    const assessments = outlets.map((o) => this.dataQualityService.assessOutlet(o));
    return {
      organisationId: scope.organisationId,
      assessments,
    };
  }

  getFreshness() {
    return {
      timestamp: new Date().toISOString(),
      cacheTtlSeconds: 180,
      freshnessLevel: 'NEAR_REALTIME',
      source: 'FitCore Operational Aggregations',
    };
  }

  async getOutletDetail(
    user: BusinessBiRequestUser,
    outletId: string,
    filters: MultiOutletFilterDto,
  ) {
    OutletIntelligencePermissionService.assertCanAccessOutlet(user, outletId);
    const overview = await this.getOverview(user, { ...filters, outletId });
    const outlet = overview.outlets.find((o) => o.outletId === outletId);
    if (!outlet) {
      throw new NotFoundException(`Outlet ${outletId} not found or inaccessible`);
    }
    return {
      outlet,
      health: overview.healthOverview[outletId],
      quality: overview.dataQualityRatings[outletId],
    };
  }
}
