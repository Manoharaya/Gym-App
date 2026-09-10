import { Injectable, Logger } from '@nestjs/common';
import { SalesAnalyticsService } from './sales-analytics.service';
import { SalesMetricService } from './sales-metric.service';
import { SalesCacheService } from './sales-cache.service';
import { SalesExportService } from './sales-export.service';
import { SalesAiInsightService } from './sales-ai-insight.service';
import { AuditService } from '../../audit/audit.service';
import { SalesIntelligencePermissions, RequestUser } from '../domain/sales-intelligence.permissions';
import { SalesFilterDto } from '../dto/sales-filter.dto';
import { SalesInsightRequestDto } from '../dto/sales-insight-request.dto';
import {
  CANONICAL_METRIC_DEFINITIONS,
  SALES_INTELLIGENCE_AUDIT_ACTIONS,
} from '../domain/sales-intelligence.constants';
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
  SalesMetricDefinitionDto,
  SalesAiInsightDto,
} from '@fitcore/types';

@Injectable()
export class SalesIntelligenceService {
  private readonly logger = new Logger(SalesIntelligenceService.name);

  constructor(
    private readonly analyticsService: SalesAnalyticsService,
    private readonly metricService: SalesMetricService,
    private readonly cacheService: SalesCacheService,
    private readonly exportService: SalesExportService,
    private readonly aiInsightService: SalesAiInsightService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 1. Overview KPIs & Funnel Summary
   */
  async getOverview(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesOverviewDto> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);

    const cacheKey = this.cacheService.generateKey({
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      roleScope: scope.roleScope,
      endpoint: 'overview',
      filters: filters as any,
    });

    const cached = this.cacheService.get<SalesOverviewDto>(cacheKey, scope.organisationId);
    if (cached) {
      return { ...cached, meta: { ...cached.meta, isCached: true } };
    }

    const data = await this.analyticsService.getOverview(scope, filters);
    this.cacheService.set({
      key: cacheKey,
      data,
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      roleScope: scope.roleScope,
    });

    this.logAudit(scope.organisationId, scope.outletId, SALES_INTELLIGENCE_AUDIT_ACTIONS.SALES_DASHBOARD_VIEWED, {
      roleScope: scope.roleScope,
      timeRange: filters.timeRange,
    });

    return data;
  }

  /**
   * 2. Funnel
   */
  async getFunnel(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesFunnelResponseDto> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getFunnel(scope, filters);
  }

  /**
   * 3. Trends
   */
  async getTrends(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesTrendPointDto[]> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getTrends(scope, filters);
  }

  /**
   * 4. Sources
   */
  async getSourcePerformance(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesSourcePerformanceDto[]> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getSourcePerformance(scope, filters);
  }

  /**
   * 5. Channels
   */
  async getChannelPerformance(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesChannelPerformanceDto[]> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getChannelPerformance(scope, filters);
  }

  /**
   * 6. Staff Performance
   */
  async getStaffPerformance(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesStaffPerformanceDto[]> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getStaffPerformance(scope, filters);
  }

  /**
   * 7. Outlet Performance
   */
  async getOutletPerformance(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesOutletPerformanceDto[]> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getOutletPerformance(scope, filters);
  }

  /**
   * 8. Day 39 Follow-Up Analytics
   */
  async getFollowUpPerformance(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesFollowUpPerformanceDto> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getFollowUpPerformance(scope, filters);
  }

  /**
   * 9. Day 35 AI Receptionist Metrics
   */
  async getAiReceptionistMetrics(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesAiReceptionistMetricsDto> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getAiReceptionistMetrics(scope, filters);
  }

  /**
   * 10. Day 36 AI Sales Agent Metrics
   */
  async getAiSalesAgentMetrics(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesAiSalesAgentMetricsDto> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getAiSalesAgentMetrics(scope, filters);
  }

  /**
   * 11. Day 37 Loss Analytics
   */
  async getLossAnalytics(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesLossAnalyticsDto> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getLossAnalytics(scope, filters);
  }

  /**
   * 12. Day 38 Objection Analytics
   */
  async getObjectionAnalytics(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesObjectionAnalyticsDto> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getObjectionAnalytics(scope, filters);
  }

  /**
   * 13. Pipeline Velocity
   */
  async getPipelineVelocity(user: RequestUser, filters: SalesFilterDto = {}): Promise<SalesPipelineVelocityDto> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getPipelineVelocity(scope, filters);
  }

  /**
   * 14. Activity Timeline
   */
  async getActivityTimeline(user: RequestUser, filters: SalesFilterDto = {}) {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getActivityTimeline(scope, filters);
  }

  /**
   * 15. Drill-Down Opportunities
   */
  async getDrillDownOpportunities(
    user: RequestUser,
    filters: SalesFilterDto = {},
  ): Promise<{ data: SalesDrillDownOpportunityDto[]; total: number }> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getDrillDownOpportunities(scope, filters);
  }

  /**
   * 16. CSV Export
   */
  async exportOpportunitiesCsv(user: RequestUser, filters: SalesFilterDto = {}): Promise<string> {
    const scope = SalesIntelligencePermissions.resolveScope(user, filters.outletId);

    const { data } = await this.analyticsService.getDrillDownOpportunities(scope, {
      ...filters,
      limit: 5000,
      offset: 0,
    });

    const csv = this.exportService.generateOpportunityCsv(data, true);

    await this.exportService.logExport({
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      userId: user.id,
      recordCount: data.length,
      exportFormat: 'CSV',
    });

    return csv;
  }

  /**
   * 17. Metric Definitions API
   */
  getMetricDefinitions(): SalesMetricDefinitionDto[] {
    return CANONICAL_METRIC_DEFINITIONS;
  }

  /**
   * 18. Optional AI Sales Insights
   */
  async generateAiInsights(user: RequestUser, dto: SalesInsightRequestDto = {}): Promise<SalesAiInsightDto> {
    const scope = SalesIntelligencePermissions.resolveScope(user, dto.filters?.outletId);
    const overview = await this.analyticsService.getOverview(scope, dto.filters || {});

    const insights = await this.aiInsightService.generateInsights({
      organisationId: scope.organisationId,
      overview,
      focusArea: dto.focusArea,
      userQuery: dto.query,
      userId: user.id,
    });

    this.logAudit(scope.organisationId, scope.outletId, SALES_INTELLIGENCE_AUDIT_ACTIONS.SALES_AI_INSIGHT_GENERATED, {
      focusArea: dto.focusArea,
      confidence: insights.confidence,
    });

    return insights;
  }

  /**
   * Helper to write audit logs safely.
   */
  private async logAudit(
    organisationId: string,
    outletId: string | undefined,
    action: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      await this.auditService.log({
        action,
        resource: 'SalesIntelligence',
        organisationId: organisationId !== 'all' ? organisationId : undefined,
        outletId,
        metadata,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record sales audit log: ${err.message}`);
    }
  }
}
