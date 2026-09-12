import {
  Injectable,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RecordUsageEventDto } from '../dto/saas-billing.dto';

@Injectable()
export class SaasUsageService {
  private readonly logger = new Logger(SaasUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an immutable, idempotent usage event.
   */
  async recordUsageEvent(organisationId: string, dto: RecordUsageEventDto) {
    const existing = await this.prisma.saasUsageEvent.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existing) {
      // Return existing record idempotently without double-counting
      return { duplicate: true, event: existing };
    }

    const event = await this.prisma.saasUsageEvent.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        meterKey: dto.meterKey,
        quantity: dto.quantity,
        unit: dto.unit,
        source: dto.source,
        sourceReferenceId: dto.sourceReferenceId,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    // Update aggregate asynchronously or inline
    await this.incrementAggregate(
      organisationId,
      dto.meterKey,
      dto.quantity,
      dto.unit,
    );

    return { duplicate: false, event };
  }

  /**
   * Increments the running aggregate for current billing period.
   */
  private async incrementAggregate(
    organisationId: string,
    meterKey: string,
    quantity: number,
    unit: string,
  ) {
    const sub = await this.prisma.saasSubscription.findFirst({
      where: { organisationId, status: { in: ['ACTIVE', 'TRIALING'] } },
      orderBy: { createdAt: 'desc' },
    });

    const periodStart = sub ? sub.currentPeriodStart : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd = sub ? sub.currentPeriodEnd : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

    await this.prisma.saasUsageAggregate.upsert({
      where: {
        organisationId_meterKey_periodStart_periodEnd: {
          organisationId,
          meterKey,
          periodStart,
          periodEnd,
        },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        organisationId,
        meterKey,
        periodStart,
        periodEnd,
        quantity,
        unit,
      },
    });
  }

  /**
   * Aggregates usage from authoritative sources (Day 19 AI, Day 28 Communication, Day 49 API, Voice).
   */
  async aggregateAuthoritativeSources(organisationId: string, periodStart: Date, periodEnd: Date) {
    // 1. AI Tokens from Day 19
    const aiAgg = await this.prisma.aIUsageRecord.aggregate({
      where: {
        organisationId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { totalTokens: true },
    });
    const aiTokens = aiAgg._sum.totalTokens || 0;

    // 2. Communications from Day 28
    const smsCount = await this.prisma.communication.count({
      where: {
        organisationId,
        channel: 'SMS',
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const emailCount = await this.prisma.communication.count({
      where: {
        organisationId,
        channel: 'EMAIL',
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    // 3. Developer API Calls from Day 49
    const apiCalls = await this.prisma.developerApiUsage.count({
      where: {
        organisationId,
        timestamp: { gte: periodStart, lte: periodEnd },
      },
    });

    // 4. Voice Minutes from Day 34
    const voiceAgg = await this.prisma.voiceSession.aggregate({
      where: {
        organisationId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { durationSeconds: true },
    });
    const voiceMinutes = Math.ceil((voiceAgg._sum.durationSeconds || 0) / 60);

    // Upsert aggregates
    const metrics = [
      { key: 'AI_TOKEN', quantity: aiTokens, unit: 'tokens' },
      { key: 'SMS_MESSAGE', quantity: smsCount, unit: 'messages' },
      { key: 'EMAIL_MESSAGE', quantity: emailCount, unit: 'messages' },
      { key: 'API_REQUEST', quantity: apiCalls, unit: 'requests' },
      { key: 'VOICE_MINUTE', quantity: voiceMinutes, unit: 'minutes' },
    ];

    for (const m of metrics) {
      await this.prisma.saasUsageAggregate.upsert({
        where: {
          organisationId_meterKey_periodStart_periodEnd: {
            organisationId,
            meterKey: m.key,
            periodStart,
            periodEnd,
          },
        },
        update: { quantity: m.quantity },
        create: {
          organisationId,
          meterKey: m.key,
          periodStart,
          periodEnd,
          quantity: m.quantity,
          unit: m.unit,
        },
      });
    }

    return metrics;
  }

  /**
   * Retrieves usage summary and limits for the organisation's active subscription.
   */
  async getUsageSummary(organisationId: string) {
    const sub = await this.prisma.saasSubscription.findFirst({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
      include: {
        planVersion: {
          include: {
            entitlements: {
              include: { entitlement: true },
            },
          },
        },
      },
    });

    const periodStart = sub ? sub.currentPeriodStart : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd = sub ? sub.currentPeriodEnd : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

    const aggregates = await this.prisma.saasUsageAggregate.findMany({
      where: {
        organisationId,
        periodStart: { gte: periodStart },
      },
    });

    const aggMap = new Map(aggregates.map((a) => [a.meterKey, a.quantity]));

    const items = (sub?.planVersion?.entitlements || []).map((pe) => {
      const current = aggMap.get(pe.entitlement.meterKey || pe.entitlement.code) || 0;
      const included = pe.includedAllowance;
      const remaining = Math.max(0, included - current);
      const overage = Math.max(0, current - included);
      const batches = pe.overageBatchSize > 0 ? Math.ceil(overage / pe.overageBatchSize) : overage;
      const estimatedCharge = batches * (pe.overageUnitMinor || 0);

      const percent = included > 0 ? Math.min(100, Math.round((current / included) * 100)) : 0;

      let limitStatus = 'ALLOWED';
      if (current > included) {
        limitStatus = pe.overageAllowed ? 'OVERAGE_ALLOWED' : 'LIMIT_REACHED';
      } else if (percent >= pe.softLimitThresholdPercent) {
        limitStatus = 'WARNING';
      }

      return {
        meterKey: pe.entitlement.meterKey || pe.entitlement.code,
        meterName: pe.entitlement.name,
        unit: pe.entitlement.type,
        currentUsage: current,
        includedAllowance: included,
        remainingAllowance: remaining,
        overageQuantity: overage,
        overageUnitMinor: pe.overageUnitMinor,
        estimatedOverageChargeMinor: estimatedCharge,
        thresholdReachedPercent: percent,
        limitStatus,
      };
    });

    return items;
  }
}
