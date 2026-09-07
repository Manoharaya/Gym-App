import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AIObservabilityService {
  private readonly logger = new Logger(AIObservabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns aggregated observability metrics across AI requests for an organisation.
   */
  async getMetrics(organisationId?: string) {
    const where: any = organisationId ? { organisationId } : {};

    const totalRequests = await this.prisma.aIRequest.count({ where });
    const succeededRequests = await this.prisma.aIRequest.count({
      where: { ...where, status: 'SUCCEEDED' },
    });
    const failedRequests = await this.prisma.aIRequest.count({
      where: { ...where, status: 'FAILED' },
    });
    const blockedRequests = await this.prisma.aIRequest.count({
      where: { ...where, status: 'BLOCKED' },
    });

    const usageAggregates = await this.prisma.aIUsageRecord.aggregate({
      where,
      _sum: {
        totalTokens: true,
        estimatedCost: true,
      },
      _avg: {
        latencyMs: true,
      },
    });

    const successRate = totalRequests > 0 ? (succeededRequests / totalRequests) * 100 : 100;

    return {
      totalRequests,
      succeededRequests,
      failedRequests,
      blockedRequests,
      successRate: parseFloat(successRate.toFixed(2)),
      totalTokens: usageAggregates._sum.totalTokens ?? 0,
      totalCostCents: Number(usageAggregates._sum.estimatedCost ?? 0),
      avgLatencyMs: Math.round(usageAggregates._avg.latencyMs ?? 0),
    };
  }
}
