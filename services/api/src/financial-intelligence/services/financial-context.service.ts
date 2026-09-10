import { Injectable, Logger } from '@nestjs/common';
import { FinancialAnalyticsService } from './financial-analytics.service';
import { ResolvedFinancialScope } from '../domain/financial-intelligence.permissions';
import { FinancialFilterDto } from '../dto/financial-filter.dto';
import { FinancialContextDto } from '@fitcore/types';

/**
 * Prepares authorized, structured, grounded financial context for the future
 * Day 44 AI Finance Assistant.
 *
 * CRITICAL SAFETY BOUNDARY:
 * - Pure data retrieval and structuring ONLY.
 * - Zero LLM API calls.
 * - Zero autonomous financial advice or recommendations.
 */
@Injectable()
export class FinancialContextService {
  private readonly logger = new Logger(FinancialContextService.name);

  constructor(private readonly analyticsService: FinancialAnalyticsService) {}

  /**
   * Generates a grounded financial snapshot for an authorized scope.
   */
  async buildFinancialContext(
    scope: ResolvedFinancialScope,
    filters: FinancialFilterDto,
  ): Promise<FinancialContextDto> {
    const currency = (filters.currency || 'AUD').toUpperCase();

    const [overview, outletPerf, planPerf] = await Promise.all([
      this.analyticsService.getOverview(scope, { ...filters, currency }),
      this.analyticsService.getOutletPerformance(scope, { ...filters, currency }),
      this.analyticsService.getPlanPerformance(scope, { ...filters, currency }),
    ]);

    const primaryCurrency = overview.currencies.find((c) => c.currency === currency) || overview.currencies[0];

    const totalNetRevenue = primaryCurrency ? primaryCurrency.netRevenue : 0;

    const topPlans = planPerf
      .sort((a, b) => b.netRevenue - a.netRevenue)
      .slice(0, 5)
      .map((p) => ({
        name: p.planName,
        netRevenue: p.netRevenue,
        percentage:
          totalNetRevenue > 0
            ? Math.round((p.netRevenue / totalNetRevenue) * 1000) / 10
            : 0,
      }));

    const outletPerformance = outletPerf.map((o) => ({
      outletName: o.outletName,
      netRevenue: o.netRevenue,
      share:
        totalNetRevenue > 0
          ? Math.round((o.netRevenue / totalNetRevenue) * 1000) / 10
          : 0,
    }));

    const grossRev = primaryCurrency ? primaryCurrency.grossRevenue : 0;
    const refundsRev = primaryCurrency ? primaryCurrency.refunds : 0;
    const netRev = totalNetRevenue;
    const outstanding = primaryCurrency ? primaryCurrency.outstandingInvoices : 0;

    return {
      organisationId: scope.organisationId,
      period: overview.period.timeRange,
      currency,
      metrics: {
        grossRevenue: grossRev,
        netRevenue: netRev,
        totalRefunds: refundsRev,
        outstandingBalance: outstanding,
      },
      integrityRating: overview.dataQuality?.rating || 'EXCELLENT',
      outlets: outletPerf.map((o) => ({
        outletId: o.outletId,
        name: o.outletName,
        gross: o.grossRevenue,
        net: o.netRevenue,
      })),
      revenueSummary: {
        gross: grossRev,
        refunds: refundsRev,
        net: netRev,
        growthPercentage: overview.comparison?.changes?.netRevenueChange ?? null,
      },
      paymentHealth: {
        total: (primaryCurrency?.successfulPayments || 0) + (primaryCurrency?.failedPayments || 0),
        successful: primaryCurrency?.successfulPayments || 0,
        failed: primaryCurrency?.failedPayments || 0,
        successRate: primaryCurrency?.paymentSuccessRate ?? null,
      },
      invoiceHealth: {
        openCount: primaryCurrency?.overdueInvoicesCount || 0,
        overdueCount: primaryCurrency?.overdueInvoicesCount || 0,
        outstandingBalance: outstanding,
      },
      topPlans,
      outletPerformance,
      dataFreshnessUtc: new Date().toISOString(),
    } as any;
  }
}
