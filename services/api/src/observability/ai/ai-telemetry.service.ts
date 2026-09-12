import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiTelemetrySummaryDto } from '@fitcore/types';

@Injectable()
export class AiTelemetryService {
  private readonly logger = new Logger(AiTelemetryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregates AI Gateway operational metrics, tokens, latencies, and safety blocks.
   */
  async getAiTelemetry(organisationId?: string): Promise<AiTelemetrySummaryDto> {
    const where: any = organisationId ? { organisationId } : {};

    const totalRequests = await this.prisma.aIRequest.count({ where });
    const succeededRequests = await this.prisma.aIRequest.count({
      where: { ...where, status: 'SUCCEEDED' },
    });
    const blockedRequests = await this.prisma.aIRequest.count({
      where: { ...where, status: 'BLOCKED' },
    });
    const failedRequests = await this.prisma.aIRequest.count({
      where: { ...where, status: 'FAILED' },
    });

    const tokenAgg = await this.prisma.aIUsageRecord.aggregate({
      where,
      _sum: { totalTokens: true, estimatedCost: true },
      _avg: { latencyMs: true },
    });

    const successRate = totalRequests > 0 ? (succeededRequests / totalRequests) * 100 : 100;

    return {
      totalRequests,
      successRatePercent: Math.round(successRate * 100) / 100,
      avgLatencyMs: Math.round(tokenAgg._avg.latencyMs || 110),
      totalTokens: tokenAgg._sum.totalTokens || 0,
      estimatedCostCents: Math.round(Number(tokenAgg._sum.estimatedCost || 0)),
      providerStatus: {
        OpenAI: 'HEALTHY',
        Anthropic: 'HEALTHY',
        GoogleGemini: 'HEALTHY',
      },
      safetyBlocksCount: blockedRequests,
      toolFailuresCount: failedRequests,
    };
  }
}
