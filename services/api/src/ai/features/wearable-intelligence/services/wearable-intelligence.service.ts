import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AIOrchestratorService } from '../../../orchestrator/ai-orchestrator.service';
import { WearableMetricsService } from '../metrics/wearable-metrics.service';
import { WearableTrendService } from '../trends/wearable-trend.service';
import { WearableBaselineService } from '../trends/baseline.service';
import { TrainingCorrelationService } from '../correlation/training-correlation.service';
import { WearableIntelligenceContextService } from '../context/wearable-intelligence-context.service';
import { WearableIntelligenceSafetyService } from '../safety/wearable-intelligence-safety.service';
import { WearableIntelligenceCacheService } from './wearable-intelligence-cache.service';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';
import {
  WearableIntelligenceSummaryDto,
  WearableIntelligenceResponseDto,
  WearableInsightQueryDto,
  WearableInsightFeedbackDto,
  RecoverySummaryDto,
  WearableTrendDto,
  TrainingCorrelationDto,
  WearablePrivacyViewDto,
  WearableTrainerClientSummaryDto,
  SleepMetricsDto,
  ActivityMetricsDto,
} from '@fitcore/types';
import {
  WEARABLE_INTELLIGENCE_FEATURE,
  WEARABLE_INTELLIGENCE_PROMPT_KEY,
  NON_MEDICAL_DISCLAIMER,
} from '../wearable-intelligence.constants';
import { WEARABLE_INTELLIGENCE_OUTPUT_SCHEMA } from '../schemas/wearable-intelligence-output.schema';

@Injectable()
export class WearableIntelligenceService {
  private readonly logger = new Logger(WearableIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AIOrchestratorService,
    private readonly metricsService: WearableMetricsService,
    private readonly trendService: WearableTrendService,
    private readonly baselineService: WearableBaselineService,
    private readonly correlationService: TrainingCorrelationService,
    private readonly contextService: WearableIntelligenceContextService,
    private readonly safetyService: WearableIntelligenceSafetyService,
    private readonly cache: WearableIntelligenceCacheService,
  ) {}

  /**
   * Asserts that member has active WEARABLE_DATA consent.
   */
  async assertWearableConsent(memberId: string): Promise<void> {
    const consentType = await this.prisma.consentType.findUnique({
      where: { key: 'WEARABLE_DATA' },
      include: {
        records: {
          where: { memberProfileId: memberId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!consentType) return;

    const latest = consentType.records[0];
    if (!latest || latest.status !== 'CONSENTED') {
      throw new ForbiddenException(
        'WEARABLE_CONSENT_REQUIRED: Explicit member consent for WEARABLE_DATA is required before accessing wearable intelligence.',
      );
    }
  }

  /**
   * Returns comprehensive deterministic wearable summary.
   */
  async getSummary(
    memberId: string,
    organisationId: string,
    forceRefresh: boolean = false,
  ): Promise<WearableIntelligenceSummaryDto> {
    await this.assertWearableConsent(memberId);

    const cacheKey = 'full_summary_28d';
    if (!forceRefresh) {
      const cached = await this.cache.get<WearableIntelligenceSummaryDto>(organisationId, memberId, cacheKey);
      if (cached) return cached;
    }

    const metrics = await this.metricsService.getMetricsForMember(memberId, organisationId, 28);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const records = await this.prisma.healthDataRecord.findMany({
      where: { memberId, organisationId, startTime: { gte: thirtyDaysAgo } },
      orderBy: { startTime: 'desc' },
    });

    const trends = this.trendService.detectTrends(records);
    const correlations = await this.correlationService.findCorrelations({
      memberId,
      organisationId,
      sleep: metrics.sleep,
      activity: metrics.activity,
    });

    const summary: WearableIntelligenceSummaryDto = {
      memberId,
      dataQuality: metrics.dataQuality,
      dataDaysCount: metrics.dataDaysCount,
      connectedProviders: metrics.connectedProviders,
      sleep: metrics.sleep,
      activity: metrics.activity,
      heart: metrics.heart,
      recovery: metrics.recovery,
      trends,
      correlations,
    };

    await this.cache.set(organisationId, memberId, cacheKey, summary, 1800); // 30 min cache
    return summary;
  }

  /**
   * Returns recovery metrics only.
   */
  async getRecovery(memberId: string, organisationId: string): Promise<RecoverySummaryDto> {
    const summary = await this.getSummary(memberId, organisationId);
    return summary.recovery;
  }

  /**
   * Returns multi-day trends only.
   */
  async getTrends(memberId: string, organisationId: string): Promise<WearableTrendDto[]> {
    const summary = await this.getSummary(memberId, organisationId);
    return summary.trends;
  }

  /**
   * Returns sleep metrics only.
   */
  async getSleep(memberId: string, organisationId: string): Promise<SleepMetricsDto> {
    const summary = await this.getSummary(memberId, organisationId);
    return summary.sleep;
  }

  /**
   * Returns activity metrics only.
   */
  async getActivity(memberId: string, organisationId: string): Promise<ActivityMetricsDto> {
    const summary = await this.getSummary(memberId, organisationId);
    return summary.activity;
  }

  /**
   * Returns training correlations.
   */
  async getTrainingCorrelation(memberId: string, organisationId: string): Promise<TrainingCorrelationDto[]> {
    const summary = await this.getSummary(memberId, organisationId);
    return summary.correlations;
  }

  /**
   * Generates or retrieves an AI wearable intelligence insight.
   */
  async generateInsight(params: {
    user: AuthenticatedUser;
    memberId: string;
    organisationId: string;
    dto: WearableInsightQueryDto;
    idempotencyKey?: string;
  }): Promise<{ insight: WearableIntelligenceResponseDto; insightId?: string; cached: boolean }> {
    const { user, memberId, organisationId, dto, idempotencyKey } = params;

    await this.assertWearableConsent(memberId);

    // 1. Idempotency check in DB
    if (idempotencyKey) {
      const existing = await this.prisma.wearableInsight.findFirst({
        where: { organisationId, memberId, idempotencyKey },
      });
      if (existing) {
        return {
          insight: existing.structuredOutput as any,
          insightId: existing.id,
          cached: true,
        };
      }
    }

    // 2. Safety screening of member query/prompt
    if (dto.prompt) {
      const safetyCheck = await this.safetyService.evaluateQuery({
        prompt: dto.prompt,
        memberId,
        organisationId,
      });

      if (!safetyCheck.isSafe) {
        // Construct immediate safe redirection response without calling LLM
        const safeResponse: WearableIntelligenceResponseDto = {
          summary: 'Medical safety redirection: Concerning symptoms or medical questions require professional evaluation.',
          dataHighlights: [],
          recoveryInterpretation: {
            category: 'INSUFFICIENT_DATA',
            explanation: 'Analysis halted due to acute symptoms or clinical inquiry.',
          },
          trainingGuidance: [
            {
              type: 'RECOVER',
              recommendation: 'Halt exercise immediately and consult a healthcare professional.',
              reason: safetyCheck.redirectionMessage || 'Safety precaution for reported symptoms.',
            },
          ],
          caution: safetyCheck.redirectionMessage,
          escalation: {
            required: true,
            message: safetyCheck.redirectionMessage,
          },
          sourceSummary: ['SAFETY_GATEWAY_INTERCEPTION'],
          confidence: 'HIGH',
        };

        return { insight: safeResponse, cached: false };
      }
    }

    // 3. Assemble bounded context
    const context = await this.contextService.buildContext(memberId, organisationId);

    // 4. Execute AI synthesis via Day 19 AI Orchestrator
    const promptMessage = dto.prompt
      ? `Member asks: "${dto.prompt}". Provide grounded, non-medical recovery and activity guidance based on their wearable telemetry.`
      : 'Provide a comprehensive recovery, sleep, and training balance summary grounded in the member wearable context.';

    let aiOutput: WearableIntelligenceResponseDto;
    let modelUsed = 'development-default';

    try {
      const executionResult = await this.orchestrator.execute({
        feature: WEARABLE_INTELLIGENCE_FEATURE as any,
        prompt: promptMessage,
        organisationId,
        user,
        memberId,
        promptKey: WEARABLE_INTELLIGENCE_PROMPT_KEY,
        responseFormat: 'json',
        expectedSchema: WEARABLE_INTELLIGENCE_OUTPUT_SCHEMA,
        requestedSources: ['MEMBER_PROFILE', 'TRAINING', 'WEARABLE_HEALTH_DATA'],
      });

      if (executionResult.structuredOutput) {
        aiOutput = executionResult.structuredOutput as WearableIntelligenceResponseDto;
        modelUsed = executionResult.model;
      } else {
        throw new Error('Missing structured output from AI Orchestrator');
      }
    } catch (llmErr: any) {
      this.logger.warn(`AI Orchestrator unavailable or failed (${llmErr.message}), falling back to deterministic rule synthesis.`);
      aiOutput = this.generateDeterministicRuleFallback(context);
    }

    // 5. Persist insight for auditability, feedback, and caching
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 28);
    const windowEnd = new Date();

    const persisted = await this.prisma.wearableInsight.create({
      data: {
        organisationId,
        memberId,
        insightType: 'DAILY_SUMMARY',
        summary: aiOutput.summary,
        structuredOutput: aiOutput as any,
        sourceWindowStart: windowStart,
        sourceWindowEnd: windowEnd,
        dataVersion: 1,
        model: modelUsed,
        promptVersion: 1,
        recoveryCategory: aiOutput.recoveryInterpretation?.category,
        confidence: aiOutput.confidence,
        idempotencyKey,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiration
      },
    });

    return {
      insight: aiOutput,
      insightId: persisted.id,
      cached: false,
    };
  }

  /**
   * Retrieves past wearable intelligence insights for member.
   */
  async getPastInsights(memberId: string, organisationId: string, limit = 10) {
    await this.assertWearableConsent(memberId);
    return this.prisma.wearableInsight.findMany({
      where: { memberId, organisationId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
  }

  /**
   * Records member feedback (Helpful / Not Helpful) on an insight.
   */
  async submitFeedback(
    user: AuthenticatedUser,
    organisationId: string,
    dto: WearableInsightFeedbackDto,
  ): Promise<{ success: boolean; message: string }> {
    const insight = await this.prisma.wearableInsight.findFirst({
      where: { id: dto.insightId, organisationId },
    });

    if (!insight) {
      throw new NotFoundException('Wearable insight record not found.');
    }

    await this.prisma.wearableInsight.update({
      where: { id: dto.insightId },
      data: {
        feedbackRating: dto.rating,
        feedbackCategory: dto.category,
        feedbackComment: dto.comment,
      },
    });

    return { success: true, message: 'Thank you for your feedback.' };
  }

  /**
   * Scoped trainer client summary view guarded strictly by TrainerClientAssignment.
   */
  async getTrainerClientSummary(
    trainerUserId: string,
    targetMemberId: string,
    organisationId: string,
  ): Promise<WearableTrainerClientSummaryDto> {
    const trainerProfile = await this.prisma.trainerProfile.findFirst({
      where: {
        staffProfile: { userId: trainerUserId },
        organisationId,
      },
    });

    if (!trainerProfile) {
      throw new ForbiddenException('Only personal trainers can access client wearable telemetry summaries.');
    }

    const assignment = await this.prisma.trainerClientAssignment.findFirst({
      where: {
        trainerProfileId: trainerProfile.id,
        memberProfileId: targetMemberId,
        organisationId,
        status: 'ACTIVE',
      },
      include: {
        memberProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Trainer is not actively assigned to this member.');
    }

    const summary = await this.getSummary(targetMemberId, organisationId);

    const clientUser = assignment.memberProfile.user;
    const memberName = `${clientUser.firstName} ${clientUser.lastName}`.trim();

    return {
      memberId: targetMemberId,
      memberName,
      trainerAssignmentStatus: 'ACTIVE',
      todayActivity: {
        steps: summary.activity.todaySteps,
        activeCaloriesKcal: summary.activity.todayActiveCaloriesKcal,
        distanceKm: summary.activity.todayDistanceKm,
        restingHeartRateBpm: summary.heart.latestRestingHeartRateBpm,
      },
      weeklyAverages: {
        avgDailySteps: summary.activity.sevenDayAverageSteps,
        avgDailyCaloriesKcal: summary.activity.sevenDayAverageCaloriesKcal,
        avgSleepMinutes: summary.sleep.sevenDayAverageMinutes,
        workoutCount: summary.activity.activityFrequencyPerWeek,
      },
      connectedProviders: summary.connectedProviders,
      notice: NON_MEDICAL_DISCLAIMER,
    };
  }

  /**
   * Member privacy transparency view.
   */
  async getPrivacyView(memberId: string, organisationId: string): Promise<WearablePrivacyViewDto> {
    const consentType = await this.prisma.consentType.findUnique({
      where: { key: 'WEARABLE_DATA' },
      include: {
        records: {
          where: { memberProfileId: memberId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const latestRecord = consentType?.records[0];
    const latestVersion = consentType?.versions[0];

    const connections = await this.prisma.wearableConnection.findMany({
      where: { memberId, organisationId },
    });

    const trainerAssignment = await this.prisma.trainerClientAssignment.findFirst({
      where: { memberProfileId: memberId, organisationId, status: 'ACTIVE' },
      include: {
        trainerProfile: {
          include: { staffProfile: { include: { user: true } } },
        },
      },
    });

    const trainerUser = trainerAssignment?.trainerProfile?.staffProfile?.user;
    const assignedTrainerName = trainerUser ? `${trainerUser.firstName} ${trainerUser.lastName}` : null;

    return {
      memberId,
      activeConsent: {
        consented: latestRecord?.status === 'CONSENTED',
        consentKey: 'WEARABLE_DATA',
        consentedAt: latestRecord?.consentedAt ? latestRecord.consentedAt.toISOString() : null,
        version: latestVersion?.version || '1.0',
      },
      connectedProviders: connections.map((c) => ({
        provider: c.provider as any,
        status: c.status as any,
        connectedAt: c.connectedAt ? c.connectedAt.toISOString() : null,
        lastSyncAt: c.lastSyncAt ? c.lastSyncAt.toISOString() : null,
        authorizedDataTypes: (c.scopes || []) as any,
      })),
      storedDataCategories: [],
      trainerAccess: {
        isPermitted: !!trainerAssignment,
        assignedTrainerName,
        accessibleMetrics: ['Daily step totals', 'Weekly workout counts', 'Average sleep duration'],
        rawValuesExposed: false,
      },
      retentionPolicy: {
        normalizedHealthRecordsDays: 365,
        rawPayloadsDays: 7,
        selfServiceDeletionAllowed: true,
      },
    };
  }

  /**
   * Deterministic rule-based fallback when AI model is unavailable or offline.
   */
  private generateDeterministicRuleFallback(context: any): WearableIntelligenceResponseDto {
    const recoveryCat = context.recoverySummary.category;
    const isGood = recoveryCat === 'GOOD';
    const isModerate = recoveryCat === 'MODERATE';

    const highlights: any[] = [];
    if (context.sleepSummary.recentAverageMinutes) {
      highlights.push({
        metric: 'Sleep Average',
        value: `${Math.round(context.sleepSummary.recentAverageMinutes / 60)}h ${context.sleepSummary.recentAverageMinutes % 60}m`,
        trend: context.sleepSummary.trend || 'Steady',
      });
    }
    if (context.activitySummary.recentAverageSteps) {
      highlights.push({
        metric: 'Daily Steps',
        value: context.activitySummary.recentAverageSteps.toLocaleString(),
        trend: context.activitySummary.trend || 'Consistent',
      });
    }

    const guidance: any[] = [];
    if (isGood) {
      guidance.push({
        type: 'TRAIN',
        recommendation: 'Your recovery indicators look solid. Proceed with your planned workout program.',
        reason: 'Resting heart rate and sleep volume reflect stable recovery capacity.',
      });
    } else if (isModerate) {
      guidance.push({
        type: 'REDUCE_INTENSITY',
        recommendation: 'Consider moderating high-intensity training volume today if feeling fatigued.',
        reason: 'Recovery indicators are balanced but slightly mixed.',
      });
    } else {
      guidance.push({
        type: 'RECOVER',
        recommendation: 'Prioritize restorative movement, stretching, and early sleep tonight.',
        reason: 'Recent sleep and activity indicators suggest your body would benefit from active recovery.',
      });
    }

    return {
      summary: isGood
        ? 'Your recent recovery indicators appear favorable with steady sleep and balanced activity.'
        : isModerate
        ? 'Your recovery indicators are mixed. Your body is managing training load with moderate fatigue.'
        : 'Recovery indicators suggest prioritizing rest, with recent sleep or activity below your baseline.',
      dataHighlights: highlights,
      recoveryInterpretation: {
        category: recoveryCat,
        explanation: context.recoverySummary.explanation,
      },
      trainingGuidance: guidance,
      caution: NON_MEDICAL_DISCLAIMER,
      escalation: { required: false },
      sourceSummary: ['DETERMINISTIC_RULE_SYNTHESIS'],
      confidence: 'MEDIUM',
    };
  }
}
