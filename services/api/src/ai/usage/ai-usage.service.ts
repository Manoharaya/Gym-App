import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AIUsageSummary, AIFeature } from '@fitcore/types';
import { AIUsageQueryDto } from '../dto/ai.dto';
import { Prisma } from '@prisma/client';

export interface RecordUsageOptions {
  organisationId: string;
  outletId?: string | null;
  userId: string;
  memberId?: string | null;
  feature: AIFeature;
  provider: string;
  model: string;
  modelId?: string;
  requestId?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  inputCostPer1M?: number;
  outputCostPer1M?: number;
}

@Injectable()
export class AIUsageService {
  private readonly logger = new Logger(AIUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates cost and records an immutable AI usage record.
   */
  async recordUsage(options: RecordUsageOptions) {
    const {
      organisationId,
      outletId,
      userId,
      memberId,
      feature,
      provider,
      model,
      modelId,
      requestId,
      inputTokens,
      outputTokens,
      latencyMs,
      inputCostPer1M = 0,
      outputCostPer1M = 0,
    } = options;

    const totalTokens = inputTokens + outputTokens;

    // Calculate estimated cost in cents (Decimal)
    // (inputTokens * rate + outputTokens * rate) / 1,000,000
    const rawCostCents =
      (inputTokens * inputCostPer1M + outputTokens * outputCostPer1M) / 1000000;
    const estimatedCost = new Prisma.Decimal(rawCostCents.toFixed(4));

    return this.prisma.aIUsageRecord.create({
      data: {
        organisationId,
        outletId,
        userId,
        memberId,
        feature,
        provider,
        model,
        modelId,
        requestId,
        inputTokens,
        outputTokens,
        totalTokens,
        latencyMs,
        estimatedCost,
      },
    });
  }

  /**
   * Aggregates usage summary for an organisation or user.
   */
  async getUsageSummary(organisationId: string, query?: AIUsageQueryDto): Promise<AIUsageSummary> {
    const where: Prisma.AIUsageRecordWhereInput = {
      organisationId,
      ...(query?.feature ? { feature: query.feature } : {}),
      ...(query?.userId ? { userId: query.userId } : {}),
      ...(query?.memberId ? { memberId: query.memberId } : {}),
      ...(query?.outletId ? { outletId: query.outletId } : {}),
      ...(query?.from || query?.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const aggregates = await this.prisma.aIUsageRecord.aggregate({
      where,
      _count: { id: true },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        estimatedCost: true,
      },
    });

    return {
      organisationId,
      feature: query?.feature,
      totalRequests: aggregates._count.id,
      totalTokens: aggregates._sum.totalTokens ?? 0,
      inputTokens: aggregates._sum.inputTokens ?? 0,
      outputTokens: aggregates._sum.outputTokens ?? 0,
      estimatedCostCents: Number(aggregates._sum.estimatedCost ?? 0),
    };
  }

  /**
   * Platform-wide usage summary for Superadmin.
   */
  async getPlatformUsageSummary(query?: AIUsageQueryDto) {
    const where: Prisma.AIUsageRecordWhereInput = {
      ...(query?.feature ? { feature: query.feature } : {}),
      ...(query?.from || query?.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const aggregates = await this.prisma.aIUsageRecord.aggregate({
      where,
      _count: { id: true },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        estimatedCost: true,
      },
    });

    return {
      totalRequests: aggregates._count.id,
      totalTokens: aggregates._sum.totalTokens ?? 0,
      inputTokens: aggregates._sum.inputTokens ?? 0,
      outputTokens: aggregates._sum.outputTokens ?? 0,
      estimatedCostCents: Number(aggregates._sum.estimatedCost ?? 0),
    };
  }
}
