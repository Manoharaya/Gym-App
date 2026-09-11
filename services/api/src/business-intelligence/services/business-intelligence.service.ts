import { Injectable, Logger } from '@nestjs/common';
import { MetricQueryService } from './metric-query.service';
import { ComparisonService } from './comparison.service';
import { DataQualityService } from './data-quality.service';
import { BusinessInsightService } from './insight.service';
import { BusinessAiInsightService } from './ai-insight.service';
import { BusinessCacheService } from './cache.service';
import { BusinessTrendService } from './trend.service';
import { BusinessExportService } from './export.service';
import { BusinessPreferenceService } from './preference.service';
import { MetricRegistryService } from './metric-registry.service';
import { MetricDefinitionService } from './metric-definition.service';
import { AuditService } from '../../audit/audit.service';
import {
  BusinessBiRequestUser,
  BusinessIntelligencePermissions,
} from '../domain/business-intelligence.permissions';
import { BusinessFilterDto } from '../dto/business-filter.dto';
import { BusinessAiQueryDto } from '../dto/business-ai-query.dto';
import { UpdateBusinessPreferenceDto } from '../dto/business-preference.dto';
import {
  BusinessOverviewDto,
  BusinessKpi,
  BusinessTrendSeries,
  BusinessPeriodComparison,
  BusinessAIInsight,
  OutletBiSummaryDto,
  BusinessDashboardPreferencesDto,
  BusinessMetricDefinition,
} from '@fitcore/types';

@Injectable()
export class BusinessIntelligenceService {
  private readonly logger = new Logger(BusinessIntelligenceService.name);

  constructor(
    private readonly metricQuery: MetricQueryService,
    private readonly comparisonService: ComparisonService,
    private readonly dataQualityService: DataQualityService,
    private readonly insightService: BusinessInsightService,
    private readonly aiInsightService: BusinessAiInsightService,
    private readonly cacheService: BusinessCacheService,
    private readonly trendService: BusinessTrendService,
    private readonly exportService: BusinessExportService,
    private readonly preferenceService: BusinessPreferenceService,
    private readonly registryService: MetricRegistryService,
    private readonly definitionService: MetricDefinitionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves unified executive business intelligence overview with caching.
   */
  async getOverview(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ): Promise<BusinessOverviewDto> {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);

    const cacheKey = this.cacheService.buildCacheKey({
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      userRole: scope.userRole,
      metric: 'overview',
      dateRange: `${bounds.startDate.toISOString()}_${bounds.endDate.toISOString()}`,
      currency: filters.currency,
      filters,
    });

    const cached = await this.cacheService.get<BusinessOverviewDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Record audit event
    await this.auditService.log({
      userId: user.id,
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      action: 'BUSINESS_DASHBOARD_VIEWED',
      resource: 'business_intelligence',
      metadata: { filters, scope: scope.roleScope },
    });

    // 1. Parallel Domain Queries
    const [membership, sales, finance, attendance, bookings, training, nutrition, checkIns, wearables, engagement, retention, communication, ai, outlets] =
      await Promise.all([
        this.metricQuery.queryMembership(scope, bounds, filters),
        this.metricQuery.querySales(scope, bounds, filters),
        this.metricQuery.queryFinance(scope, bounds, filters),
        this.metricQuery.queryAttendance(scope, bounds),
        this.metricQuery.queryBookings(scope, bounds),
        this.metricQuery.queryTraining(scope, bounds),
        this.metricQuery.queryNutrition(scope, bounds),
        this.metricQuery.queryDailyCheckIns(scope, bounds),
        this.metricQuery.queryWearables(scope),
        this.metricQuery.queryEngagement(scope, bounds),
        this.metricQuery.queryRetention(scope),
        this.metricQuery.queryCommunication(scope, bounds),
        this.metricQuery.queryAi(scope, bounds),
        this.metricQuery.queryOutletSummaries(scope, bounds),
      ]);

    // 2. Executive KPIs Assembly
    const primaryCurrency = finance.primaryCurrency;
    const primaryFin = finance.currencies[primaryCurrency];

    const kpis: Record<string, BusinessKpi> = {};

    // Active Members KPI
    const memComp = this.comparisonService.calculateComparison({
      metricKey: 'membership.active_members',
      label: 'Active Members',
      current: membership.activeMembers,
      previous: membership.previousActiveMembers || 0,
      unit: 'COUNT',
    });
    kpis['membership.active_members'] = {
      key: 'membership.active_members',
      label: 'Active Members',
      currentValue: membership.activeMembers,
      previousValue: memComp.previous,
      absoluteChange: memComp.difference,
      percentageChange: memComp.percentageDifference,
      direction: memComp.direction,
      unit: 'COUNT',
      period: { start: bounds.startDate.toISOString(), end: bounds.endDate.toISOString(), timezone: bounds.timezone },
      dataQuality: memComp.dataQuality,
      caveat: memComp.caveat,
    };

    // Net Revenue KPI
    if (primaryFin) {
      const finComp = this.comparisonService.calculateComparison({
        metricKey: 'finance.net_revenue',
        label: 'Net Revenue',
        current: primaryFin.netRevenue,
        previous: 0,
        unit: 'CURRENCY',
        currency: primaryCurrency,
      });
      kpis['finance.net_revenue'] = {
        key: 'finance.net_revenue',
        label: 'Net Revenue',
        currentValue: primaryFin.netRevenue,
        previousValue: finComp.previous,
        absoluteChange: finComp.difference,
        percentageChange: finComp.percentageDifference,
        direction: finComp.direction,
        unit: 'CURRENCY',
        currency: primaryCurrency,
        period: { start: bounds.startDate.toISOString(), end: bounds.endDate.toISOString(), timezone: bounds.timezone },
        dataQuality: 'HIGH',
      };
    }

    // New Leads KPI
    const leadComp = this.comparisonService.calculateComparison({
      metricKey: 'sales.new_leads',
      label: 'New Leads',
      current: sales.newLeads,
      previous: 0,
      unit: 'COUNT',
    });
    kpis['sales.new_leads'] = {
      key: 'sales.new_leads',
      label: 'New Leads',
      currentValue: sales.newLeads,
      previousValue: leadComp.previous,
      absoluteChange: leadComp.difference,
      percentageChange: leadComp.percentageDifference,
      direction: leadComp.direction,
      unit: 'COUNT',
      period: { start: bounds.startDate.toISOString(), end: bounds.endDate.toISOString(), timezone: bounds.timezone },
      dataQuality: 'HIGH',
    };

    // Conversions KPI
    kpis['sales.conversions'] = {
      key: 'sales.conversions',
      label: 'Conversions',
      currentValue: sales.conversions,
      direction: 'UNCHANGED',
      unit: 'COUNT',
      period: { start: bounds.startDate.toISOString(), end: bounds.endDate.toISOString(), timezone: bounds.timezone },
      dataQuality: 'HIGH',
    };

    // Conversion Rate KPI
    kpis['sales.conversion_rate'] = {
      key: 'sales.conversion_rate',
      label: 'Conversion Rate',
      currentValue: sales.conversionRate !== null ? `${sales.conversionRate}%` : 'N/A',
      direction: 'UNCHANGED',
      unit: 'PERCENTAGE',
      period: { start: bounds.startDate.toISOString(), end: bounds.endDate.toISOString(), timezone: bounds.timezone },
      dataQuality: sales.dataQuality,
      caveat: sales.sampleSizeCaveat,
    };

    // Total Visits KPI
    kpis['attendance.total_visits'] = {
      key: 'attendance.total_visits',
      label: 'Total Visits',
      currentValue: attendance.totalVisits,
      direction: 'UNCHANGED',
      unit: 'COUNT',
      period: { start: bounds.startDate.toISOString(), end: bounds.endDate.toISOString(), timezone: bounds.timezone },
      dataQuality: 'HIGH',
    };

    // 3. Evaluate Explainable Business Health
    const health = this.insightService.evaluateBusinessHealth({
      membership,
      sales,
      finance,
      attendance,
      retention,
      engagement,
    });

    // 4. Generate Deterministic Insights
    const deterministicInsights = this.insightService.generateDeterministicInsights({
      membership,
      sales,
      finance,
      attendance,
      bookings,
      retention,
      engagement,
    });

    // 5. Freshness and Data Quality Warnings
    const freshness = this.dataQualityService.getDomainFreshness();
    const dataQualityWarnings: string[] = [];
    if (sales.sampleSizeCaveat) dataQualityWarnings.push(sales.sampleSizeCaveat);

    const result: BusinessOverviewDto = {
      period: {
        start: bounds.startDate.toISOString(),
        end: bounds.endDate.toISOString(),
        timezone: bounds.timezone,
        timeRange: filters.timeRange || 'LAST_30_DAYS',
      },
      scope: {
        roleScope: scope.roleScope,
        organisationId: scope.organisationId,
        outletId: scope.outletId,
      },
      kpis,
      health,
      membership,
      sales,
      finance,
      attendance,
      bookings,
      training,
      engagement,
      retention,
      communication,
      ai,
      outlets: scope.roleScope !== 'OUTLET' ? outlets : undefined,
      deterministicInsights,
      freshness,
      dataQualityWarnings,
      generatedAt: new Date().toISOString(),
    };

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async getKpis(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ): Promise<Record<string, BusinessKpi>> {
    const overview = await this.getOverview(user, filters);
    return overview.kpis;
  }

  async getMembership(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ) {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    return this.metricQuery.queryMembership(scope, bounds, filters);
  }

  async getSales(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ) {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    return this.metricQuery.querySales(scope, bounds, filters);
  }

  async getFinance(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ) {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    return this.metricQuery.queryFinance(scope, bounds, filters);
  }

  async getAttendance(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ) {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    return this.metricQuery.queryAttendance(scope, bounds);
  }

  async getBookings(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ) {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    return this.metricQuery.queryBookings(scope, bounds);
  }

  async getTraining(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ) {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    return this.metricQuery.queryTraining(scope, bounds);
  }

  async getEngagement(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ) {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    return this.metricQuery.queryEngagement(scope, bounds);
  }

  async getRetention(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ) {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.metricQuery.queryRetention(scope);
  }

  async getCommunication(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ) {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    return this.metricQuery.queryCommunication(scope, bounds);
  }

  async getAi(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ) {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    return this.metricQuery.queryAi(scope, bounds);
  }

  async getTrends(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ): Promise<BusinessTrendSeries> {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    const metricKey = filters.metricKey || 'finance.net_revenue';
    return this.trendService.getMetricTrend(scope, metricKey, bounds, filters);
  }

  async getComparisons(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ): Promise<BusinessPeriodComparison[]> {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    const membership = await this.metricQuery.queryMembership(scope, bounds, filters);

    const comparisons: BusinessPeriodComparison[] = [
      this.comparisonService.calculateComparison({
        metricKey: 'membership.active_members',
        label: 'Active Members',
        current: membership.activeMembers,
        previous: membership.previousActiveMembers || 0,
        unit: 'COUNT',
      }),
      this.comparisonService.calculateComparison({
        metricKey: 'membership.new_members',
        label: 'New Members',
        current: membership.newMembers,
        previous: 0,
        unit: 'COUNT',
      }),
    ];

    return comparisons;
  }

  async getOutlets(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ): Promise<OutletBiSummaryDto[]> {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    return this.metricQuery.queryOutletSummaries(scope, bounds);
  }

  getMetricDefinitions(): BusinessMetricDefinition[] {
    return this.definitionService.getAllDefinitions();
  }

  async getDataQuality(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ) {
    const scope = BusinessIntelligencePermissions.resolveScope(user, filters.outletId);
    const bounds = this.comparisonService.resolveDateBounds(filters);
    const sales = await this.metricQuery.querySales(scope, bounds, filters);

    return this.dataQualityService.assessDataQuality({
      domain: 'SALES',
      sampleSize: sales.conversionDenominator,
      minimumThreshold: 5,
    });
  }

  getFreshness() {
    return this.dataQualityService.getDomainFreshness();
  }

  async generateAiInsights(
    user: BusinessBiRequestUser,
    query: BusinessAiQueryDto,
  ): Promise<BusinessAIInsight> {
    const scope = BusinessIntelligencePermissions.resolveScope(user, query.outletId);
    const overview = await this.getOverview(user, {
      outletId: query.outletId,
      timeRange: query.timeRange,
      currency: query.currency,
    });

    await this.auditService.log({
      userId: user.id,
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      action: 'BUSINESS_AI_INSIGHT_GENERATED',
      resource: 'business_intelligence',
      metadata: { question: query.question, language: query.language },
    });

    return this.aiInsightService.generateInsights({
      organisationId: scope.organisationId,
      overview,
      query,
      userId: user.id,
    });
  }

  async exportCsv(
    user: BusinessBiRequestUser,
    filters: BusinessFilterDto,
  ): Promise<string> {
    const overview = await this.getOverview(user, filters);

    await this.auditService.log({
      userId: user.id,
      organisationId: overview.scope.organisationId,
      outletId: overview.scope.outletId,
      action: 'BUSINESS_EXPORT_CREATED',
      resource: 'business_intelligence',
      metadata: { format: 'CSV' },
    });

    return this.exportService.generateCsvExport(overview);
  }

  async getPreferences(user: BusinessBiRequestUser): Promise<BusinessDashboardPreferencesDto> {
    const scope = BusinessIntelligencePermissions.resolveScope(user);
    return this.preferenceService.getPreferences(scope.organisationId, user.id);
  }

  async updatePreferences(
    user: BusinessBiRequestUser,
    dto: UpdateBusinessPreferenceDto,
  ): Promise<BusinessDashboardPreferencesDto> {
    const scope = BusinessIntelligencePermissions.resolveScope(user);
    return this.preferenceService.updatePreferences(scope.organisationId, user.id, dto);
  }
}
