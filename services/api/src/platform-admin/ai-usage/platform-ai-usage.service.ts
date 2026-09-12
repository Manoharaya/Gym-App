import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueryAIUsageDto } from '../dto/platform-admin.dto';

@Injectable()
export class PlatformAIUsageService {
  private readonly logger = new Logger(PlatformAIUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregates platform-wide AI usage, tokens, and cost.
   * Strictly avoids leaking credentials, keys, or private prompt secrets.
   */
  async getAIUsageMetrics(query: QueryAIUsageDto) {
    const where: any = {};
    if (query.organisationId) where.organisationId = query.organisationId;
    if (query.outletId) where.outletId = query.outletId;
    if (query.feature) where.feature = query.feature;
    if (query.provider) where.provider = query.provider;

    const fromDate = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = query.to ? new Date(query.to) : new Date();

    where.createdAt = { gte: fromDate, lte: toDate };

    // 1. Core aggregates
    const [aggregates, totalRequests, totalFailed] = await Promise.all([
      this.prisma.aIUsageRecord.aggregate({
        where,
        _count: { id: true },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          estimatedCost: true,
        },
        _avg: {
          latencyMs: true,
        },
      }),
      this.prisma.aIRequest.count({ where }),
      this.prisma.aIRequest.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    const requestsCount = totalRequests || aggregates._count.id || 0;
    const successCount = requestsCount - totalFailed;
    const successRate = requestsCount > 0 ? Number(((successCount / requestsCount) * 100).toFixed(2)) : 100;
    const failureRate = requestsCount > 0 ? Number(((totalFailed / requestsCount) * 100).toFixed(2)) : 0;

    // 2. Breakdown by feature
    const byFeatureRaw = await this.prisma.aIUsageRecord.groupBy({
      by: ['feature'],
      where,
      _count: { id: true },
      _sum: { totalTokens: true, estimatedCost: true },
      _avg: { latencyMs: true },
    });

    const byFeature = byFeatureRaw.map((f) => ({
      feature: f.feature,
      requests: f._count.id,
      totalTokens: f._sum.totalTokens || 0,
      estimatedCostCents: Number(f._sum.estimatedCost || 0),
      avgLatencyMs: Math.round(f._avg.latencyMs || 0),
    }));

    // 3. Breakdown by provider & model
    const byProviderRaw = await this.prisma.aIUsageRecord.groupBy({
      by: ['provider', 'model'],
      where,
      _count: { id: true },
      _sum: { totalTokens: true, estimatedCost: true },
      _avg: { latencyMs: true },
    });

    const byProvider = byProviderRaw.map((p) => ({
      provider: p.provider,
      model: p.model,
      requests: p._count.id,
      totalTokens: p._sum.totalTokens || 0,
      estimatedCostCents: Number(p._sum.estimatedCost || 0),
      avgLatencyMs: Math.round(p._avg.latencyMs || 0),
    }));

    // 4. Trend calculation (compare current window to previous window)
    const windowDurationMs = toDate.getTime() - fromDate.getTime();
    const prevFromDate = new Date(fromDate.getTime() - windowDurationMs);
    const prevToDate = fromDate;

    const prevAggregates = await this.prisma.aIUsageRecord.aggregate({
      where: {
        ...where,
        createdAt: { gte: prevFromDate, lte: prevToDate },
      },
      _count: { id: true },
      _sum: { totalTokens: true, estimatedCost: true },
    });

    const prevTokens = prevAggregates._sum.totalTokens || 0;
    const currentTokens = aggregates._sum.totalTokens || 0;
    const tokenPercentageChange =
      prevTokens > 0
        ? Number((((currentTokens - prevTokens) / prevTokens) * 100).toFixed(1))
        : 0;

    return {
      summary: {
        totalRequests: requestsCount,
        inputTokens: aggregates._sum.inputTokens || 0,
        outputTokens: aggregates._sum.outputTokens || 0,
        totalTokens: currentTokens,
        estimatedCostCents: Number(aggregates._sum.estimatedCost || 0),
        avgLatencyMs: Math.round(aggregates._avg.latencyMs || 0),
        successRate,
        failureRate,
      },
      trend: {
        currentPeriodTokens: currentTokens,
        previousPeriodTokens: prevTokens,
        tokenPercentageChange,
        trendDescription:
          tokenPercentageChange >= 0
            ? `AI token volume increased by ${tokenPercentageChange}% compared with previous period.`
            : `AI token volume decreased by ${Math.abs(tokenPercentageChange)}% compared with previous period.`,
      },
      byFeature,
      byProvider,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
    };
  }

  /**
   * Health of active AI features (latency, error rate, status).
   */
  async getAIFeatureHealth() {
    const features = [
      'FITNESS_COACH',
      'NUTRITION_COACH',
      'DAILY_CHECKIN',
      'WEARABLE_INTELLIGENCE',
      'RETENTION_INTELLIGENCE',
      'RECEPTIONIST',
      'SALES_AGENT',
      'FINANCE_ASSISTANT',
    ];

    const records = await Promise.all(
      features.map(async (feature) => {
        const [recentTotal, recentFailed, latencyAgg] = await Promise.all([
          this.prisma.aIUsageRecord.count({
            where: {
              feature: feature as any,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          }),
          this.prisma.aIRequest.count({
            where: {
              feature: feature as any,
              status: 'FAILED',
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          }),
          this.prisma.aIUsageRecord.aggregate({
            where: {
              feature: feature as any,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            _avg: { latencyMs: true },
          }),
        ]);

        const failureRate = recentTotal > 0 ? (recentFailed / recentTotal) * 100 : 0;
        let status: 'HEALTHY' | 'DEGRADED' | 'DOWN' = 'HEALTHY';
        if (failureRate > 25) {
          status = 'DOWN';
        } else if (failureRate > 5 || (latencyAgg._avg.latencyMs || 0) > 4000) {
          status = 'DEGRADED';
        }

        return {
          feature,
          requestsLast24h: recentTotal,
          failureRate: Number(failureRate.toFixed(2)),
          avgLatencyMs: Math.round(latencyAgg._avg.latencyMs || 0),
          status,
        };
      }),
    );

    return records;
  }
}
