/**
 * FitCore — Day 49: API Usage Analytics & Observability Service
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  DeveloperAnalyticsSummaryDto,
  DeveloperApiLogDto,
  DeveloperEnvironment,
} from '@fitcore/types';

@Injectable()
export class ApiUsageService {
  private readonly logger = new Logger(ApiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an API invocation asynchronously
   */
  async recordUsage(params: {
    applicationId: string;
    organisationId?: string | null;
    apiKeyId?: string | null;
    environment: DeveloperEnvironment;
    endpoint: string;
    method: string;
    statusCode: number;
    latencyMs: number;
    scope?: string | null;
    requestId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    try {
      await this.prisma.developerApiUsage.create({
        data: {
          applicationId: params.applicationId,
          organisationId: params.organisationId,
          apiKeyId: params.apiKeyId,
          environment: params.environment,
          endpoint: params.endpoint,
          method: params.method,
          statusCode: params.statusCode,
          latencyMs: params.latencyMs,
          scope: params.scope,
          requestId: params.requestId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record API usage: ${err.message}`);
    }
  }

  /**
   * Aggregates usage metrics for developer application dashboard
   */
  async getAnalyticsSummary(applicationId: string): Promise<DeveloperAnalyticsSummaryDto> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [todayCount, sevenDaysCount, thirtyDaysRecords, activeKeys, activeSubs, deliveries] =
      await Promise.all([
        this.prisma.developerApiUsage.count({
          where: { applicationId, timestamp: { gte: startOfToday } },
        }),
        this.prisma.developerApiUsage.count({
          where: { applicationId, timestamp: { gte: sevenDaysAgo } },
        }),
        this.prisma.developerApiUsage.findMany({
          where: { applicationId, timestamp: { gte: thirtyDaysAgo } },
          select: { endpoint: true, statusCode: true, latencyMs: true },
        }),
        this.prisma.developerApiKey.count({
          where: { applicationId, status: 'ACTIVE' },
        }),
        this.prisma.webhookSubscription.count({
          where: { applicationId, status: 'ACTIVE' },
        }),
        this.prisma.webhookDelivery.findMany({
          where: { subscription: { applicationId } },
          select: { status: true },
        }),
      ]);

    const total30d = thirtyDaysRecords.length;
    let successCount = 0;
    let rateLimitedCount = 0;
    let totalLatency = 0;
    const endpointMap = new Map<string, { count: number; errors: number; totalLat: number }>();
    const statusDist: Record<string, number> = {};

    for (const r of thirtyDaysRecords) {
      if (r.statusCode >= 200 && r.statusCode < 400) {
        successCount++;
      }
      if (r.statusCode === 429) {
        rateLimitedCount++;
      }
      totalLatency += r.latencyMs;

      const codeKey = `${Math.floor(r.statusCode / 100)}xx`;
      statusDist[codeKey] = (statusDist[codeKey] || 0) + 1;

      const existing = endpointMap.get(r.endpoint) || { count: 0, errors: 0, totalLat: 0 };
      existing.count++;
      if (r.statusCode >= 400) existing.errors++;
      existing.totalLat += r.latencyMs;
      endpointMap.set(r.endpoint, existing);
    }

    const avgLatency = total30d > 0 ? Math.round(totalLatency / total30d) : 0;
    const successRate = total30d > 0 ? Math.round((successCount / total30d) * 100) : 100;
    const errorRate = total30d > 0 ? 100 - successRate : 0;

    const topEndpoints = Array.from(endpointMap.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        errorRate: stats.count > 0 ? Math.round((stats.errors / stats.count) * 100) : 0,
        avgLatency: stats.count > 0 ? Math.round(stats.totalLat / stats.count) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const webhookFailures = deliveries.filter((d) => d.status === 'FAILED').length;

    return {
      requestsToday: todayCount,
      requestsLast7Days: sevenDaysCount,
      requestsLast30Days: total30d,
      successRatePercentage: successRate,
      errorRatePercentage: errorRate,
      rateLimitedRequests: rateLimitedCount,
      averageLatencyMs: avgLatency,
      webhookDeliveriesTotal: deliveries.length,
      webhookFailuresTotal: webhookFailures,
      activeApiKeys: activeKeys,
      activeWebhooks: activeSubs,
      topEndpoints,
      statusDistribution: statusDist,
    };
  }

  /**
   * Retrieves paginated developer API request logs (omitting raw bodies/secrets)
   */
  async listLogs(applicationId: string, limit = 50): Promise<DeveloperApiLogDto[]> {
    const records = await this.prisma.developerApiUsage.findMany({
      where: { applicationId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return records.map((r) => ({
      id: r.id,
      requestId: r.requestId,
      timestamp: r.timestamp.toISOString(),
      method: r.method,
      endpoint: r.endpoint,
      statusCode: r.statusCode,
      latencyMs: r.latencyMs,
      apiVersion: 'v1',
      scope: r.scope || undefined,
    }));
  }
}
