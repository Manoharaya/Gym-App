import { Injectable, Logger } from '@nestjs/common';
import { FinancialCacheService } from './financial-cache.service';
import { FinancialAnalyticsService } from './financial-analytics.service';
import { FinancialReconciliationService } from './financial-reconciliation.service';
import { FinancialDataQualityService } from './financial-data-quality.service';
import { FinancialContextService } from './financial-context.service';
import { FinancialExportService } from './financial-export.service';
import {
  FinancialIntelligencePermissions,
  FinancialRequestUser,
} from '../domain/financial-intelligence.permissions';
import { FinancialFilterDto } from '../dto/financial-filter.dto';
import { CANONICAL_FINANCIAL_METRIC_DEFINITIONS } from '../domain/financial-intelligence.constants';
import {
  FinancialOverviewDto,
  FinancialTrendPointDto,
  OutletFinancialPerformanceDto,
  PlanFinancialPerformanceDto,
  FinancialTransactionDrillDownDto,
  FinancialInvoiceSummaryDto,
  FinancialRefundSummaryDto,
  FinancialReconciliationReportDto,
  FinancialDataQualityDto,
  FinancialContextDto,
  FinancialMetricDefinitionDto,
} from '@fitcore/types';

@Injectable()
export class FinancialIntelligenceService {
  private readonly logger = new Logger(FinancialIntelligenceService.name);

  constructor(
    private readonly cacheService: FinancialCacheService,
    private readonly analyticsService: FinancialAnalyticsService,
    private readonly reconciliationService: FinancialReconciliationService,
    private readonly dataQualityService: FinancialDataQualityService,
    private readonly contextService: FinancialContextService,
    private readonly exportService: FinancialExportService,
  ) {}

  /**
   * 1. Financial Overview
   */
  async getOverview(
    user: FinancialRequestUser,
    filters: FinancialFilterDto = {},
  ): Promise<FinancialOverviewDto> {
    const scope = FinancialIntelligencePermissions.resolveScope(user, filters.outletId);

    const cacheKey = this.cacheService.generateKey({
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      currency: filters.currency,
      roleScope: scope.roleScope,
      endpoint: 'overview',
      filters,
    });

    const cached = this.cacheService.get<FinancialOverviewDto>(cacheKey, scope.organisationId);
    if (cached) return cached;

    const data = await this.analyticsService.getOverview(scope, filters);
    this.cacheService.set({
      key: cacheKey,
      data,
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      currency: filters.currency,
      roleScope: scope.roleScope,
    });

    return data;
  }

  /**
   * 2. Daily/Weekly Revenue Trends
   */
  async getRevenueTrends(
    user: FinancialRequestUser,
    filters: FinancialFilterDto = {},
  ): Promise<FinancialTrendPointDto[]> {
    const scope = FinancialIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getRevenueTrends(scope, filters);
  }

  /**
   * 3. Outlet Financial Breakdown
   */
  async getOutletPerformance(
    user: FinancialRequestUser,
    filters: FinancialFilterDto = {},
  ): Promise<OutletFinancialPerformanceDto[]> {
    const scope = FinancialIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getOutletPerformance(scope, filters);
  }

  /**
   * 4. Plan Performance Breakdown
   */
  async getPlanPerformance(
    user: FinancialRequestUser,
    filters: FinancialFilterDto = {},
  ): Promise<PlanFinancialPerformanceDto[]> {
    const scope = FinancialIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getPlanPerformance(scope, filters);
  }

  /**
   * 5. Paginated Transaction Drill-Down
   */
  async getTransactionsDrillDown(
    user: FinancialRequestUser,
    filters: FinancialFilterDto = {},
  ): Promise<{ data: FinancialTransactionDrillDownDto[]; total: number }> {
    const scope = FinancialIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getTransactionsDrillDown(scope, filters);
  }

  /**
   * 6. Invoices List Drill-Down
   */
  async getInvoices(
    user: FinancialRequestUser,
    filters: FinancialFilterDto = {},
  ): Promise<{ data: FinancialInvoiceSummaryDto[]; total: number }> {
    const scope = FinancialIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getInvoices(scope, filters);
  }

  /**
   * 7. Refunds Drill-Down
   */
  async getRefunds(
    user: FinancialRequestUser,
    filters: FinancialFilterDto = {},
  ): Promise<{ data: FinancialRefundSummaryDto[]; total: number }> {
    const scope = FinancialIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.analyticsService.getRefunds(scope, filters);
  }

  /**
   * 8. Reconciliation Engine
   */
  async runReconciliation(
    user: FinancialRequestUser,
    currency?: string,
  ): Promise<FinancialReconciliationReportDto> {
    const scope = FinancialIntelligencePermissions.resolveScope(user);
    return this.reconciliationService.runReconciliation(scope, currency || 'AUD');
  }

  /**
   * 8b. Trigger Projection Synchronization
   */
  async syncProjections(
    user: FinancialRequestUser,
  ): Promise<{ success: boolean; syncedCount: number }> {
    const scope = FinancialIntelligencePermissions.resolveScope(user);
    const result = await this.reconciliationService.syncTransactionProjections(scope.organisationId);
    return { success: true, ...result };
  }

  /**
   * 9. Data Quality Assessment
   */
  async assessDataQuality(user: FinancialRequestUser): Promise<FinancialDataQualityDto> {
    const scope = FinancialIntelligencePermissions.resolveScope(user);
    return this.dataQualityService.assessDataQuality(scope);
  }

  /**
   * 10. AI Finance Context Provider (Day 44 Preparation)
   */
  async buildFinancialContext(
    user: FinancialRequestUser,
    filters: FinancialFilterDto = {},
  ): Promise<FinancialContextDto> {
    const scope = FinancialIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.contextService.buildFinancialContext(scope, filters);
  }

  /**
   * 11. Sanitized CSV Export
   */
  async exportTransactionsCsv(
    user: FinancialRequestUser,
    filters: FinancialFilterDto = {},
  ): Promise<string> {
    const scope = FinancialIntelligencePermissions.resolveScope(user, filters.outletId);
    return this.exportService.exportTransactionsCsv(scope, filters, user.id);
  }

  /**
   * 12. Canonical Metric Definitions Dictionary
   */
  getMetricDefinitions(): FinancialMetricDefinitionDto[] {
    return CANONICAL_FINANCIAL_METRIC_DEFINITIONS;
  }

  /**
   * 13. Member Self Financial History View
   */
  async getMemberSelfHistory(
    user: FinancialRequestUser,
    filters: FinancialFilterDto = {},
  ): Promise<{
    transactions: FinancialTransactionDrillDownDto[];
    invoices: FinancialInvoiceSummaryDto[];
  }> {
    const scope = FinancialIntelligencePermissions.resolveScope(user, undefined, true);
    const [txs, invs] = await Promise.all([
      this.analyticsService.getTransactionsDrillDown(scope, filters),
      this.analyticsService.getInvoices(scope, filters),
    ]);

    return {
      transactions: txs.data,
      invoices: invs.data,
    };
  }
}
