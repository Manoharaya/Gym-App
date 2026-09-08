import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AIOrchestratorService } from '../../../orchestrator/ai-orchestrator.service';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';
import { EngagementSignalService } from '../signals/engagement-signal.service';
import { MemberEngagementProfileService } from '../profile/member-engagement-profile.service';
import { MemberEngagementBaselineService } from '../profile/member-engagement-baseline.service';
import { EngagementTrendService } from '../trends/engagement-trend.service';
import { RetentionRiskService } from '../risk/retention-risk.service';
import { EngagementContextService } from '../context/engagement-context.service';
import { EngagementSafetyService } from '../safety/engagement-safety.service';
import { EngagementIntelligenceCacheService } from './engagement-intelligence-cache.service';
import {
  MemberEngagementProfileDto,
  EngagementTrendItem,
  RetentionRiskAssessment,
  EngagementIntelligenceResponse,
  TrainerClientEngagementDto,
  EngagementPrivacyViewDto,
  ReactivationWorkflowState,
} from '@fitcore/types';
import {
  ENGAGEMENT_INTELLIGENCE_FEATURE,
  ENGAGEMENT_INTELLIGENCE_PROMPT_KEY,
} from '../engagement-intelligence.constants';
import { ENGAGEMENT_INTELLIGENCE_OUTPUT_SCHEMA } from '../schemas/engagement-output.schema';

@Injectable()
export class EngagementIntelligenceService {
  private readonly logger = new Logger(EngagementIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AIOrchestratorService,
    private readonly signalService: EngagementSignalService,
    private readonly profileService: MemberEngagementProfileService,
    private readonly baselineService: MemberEngagementBaselineService,
    private readonly trendService: EngagementTrendService,
    private readonly retentionRiskService: RetentionRiskService,
    private readonly contextService: EngagementContextService,
    private readonly safetyService: EngagementSafetyService,
    private readonly cacheService: EngagementIntelligenceCacheService,
  ) {}

  /**
   * Returns deterministic member engagement profile.
   */
  async getSummary(
    memberId: string,
    organisationId: string,
    refresh: boolean = false,
  ): Promise<MemberEngagementProfileDto> {
    if (!refresh) {
      const cached = await this.cacheService.get<MemberEngagementProfileDto>(
        organisationId,
        memberId,
        'summary',
      );
      if (cached) return cached;
    }

    const signals = await this.signalService.collectAllSignals(memberId, organisationId);
    const profile = await this.profileService.buildProfile(signals);
    await this.cacheService.set(organisationId, memberId, 'summary', profile);
    return profile;
  }

  /**
   * Returns multi-pillar engagement trends comparing recent activity against personal baseline.
   */
  async getTrends(
    memberId: string,
    organisationId: string,
    refresh: boolean = false,
  ): Promise<EngagementTrendItem[]> {
    if (!refresh) {
      const cached = await this.cacheService.get<EngagementTrendItem[]>(
        organisationId,
        memberId,
        'trends',
      );
      if (cached) return cached;
    }

    const signals = await this.signalService.collectAllSignals(memberId, organisationId);
    const baseline = await this.baselineService.computeBaseline(memberId, organisationId);
    const trends = this.trendService.detectTrends(signals, baseline);
    await this.cacheService.set(organisationId, memberId, 'trends', trends);
    return trends;
  }

  /**
   * Returns internal retention risk foundation assessment.
   */
  async getRetentionRisk(
    memberId: string,
    organisationId: string,
    refresh: boolean = false,
  ): Promise<RetentionRiskAssessment> {
    if (!refresh) {
      const cached = await this.cacheService.get<RetentionRiskAssessment>(
        organisationId,
        memberId,
        'risk',
      );
      if (cached) return cached;
    }

    const signals = await this.signalService.collectAllSignals(memberId, organisationId);
    const baseline = await this.baselineService.computeBaseline(memberId, organisationId);
    const risk = this.retentionRiskService.evaluateRetentionRisk(signals, baseline);
    await this.cacheService.set(organisationId, memberId, 'risk', risk);
    return risk;
  }

  /**
   * Generates or retrieves an AI engagement intelligence insight.
   */
  async generateInsight(params: {
    user: AuthenticatedUser;
    memberId: string;
    organisationId: string;
    promptQuery?: string;
    idempotencyKey?: string;
  }): Promise<{ insight: EngagementIntelligenceResponse; insightId?: string; cached: boolean }> {
    const { user, memberId, organisationId, promptQuery, idempotencyKey } = params;

    // 1. Idempotency check
    if (idempotencyKey) {
      const existing = await this.prisma.engagementInsight.findFirst({
        where: { organisationId, memberId, idempotencyKey },
      });
      if (existing) {
        return {
          insight: existing.structuredOutput as unknown as EngagementIntelligenceResponse,
          insightId: existing.id,
          cached: true,
        };
      }
    }

    // 2. Input safety validation
    if (promptQuery) {
      this.safetyService.validateInputQuery(promptQuery);
    }

    // 3. Collect domain signals, baseline, profile, trends, and risk
    const now = new Date();
    const signals = await this.signalService.collectAllSignals(memberId, organisationId, now);
    const baseline = await this.baselineService.computeBaseline(memberId, organisationId, now);
    const profile = await this.profileService.buildProfile(signals, now);
    const trends = this.trendService.detectTrends(signals, baseline);
    const risk = this.retentionRiskService.evaluateRetentionRisk(signals, baseline, 'NO_ACTION', now);

    // 4. Assemble sanitized AI context
    const context = await this.contextService.buildContext(
      memberId,
      organisationId,
      signals,
      profile,
      trends,
      risk,
      now,
    );

    // 5. Invoke AI Orchestrator with fallback to deterministic rule synthesis
    const promptMessage = promptQuery
      ? `Member/Trainer asks: "${promptQuery}". Provide grounded engagement interpretation and actionable recommendations.`
      : 'Provide a structured, encouraging engagement intelligence summary with observed signals and recommended actions.';

    let aiOutput: EngagementIntelligenceResponse;
    let modelUsed = 'development-default';

    try {
      const executionResult = await this.orchestrator.execute({
        feature: ENGAGEMENT_INTELLIGENCE_FEATURE as any,
        prompt: promptMessage,
        organisationId,
        user,
        memberId,
        promptKey: ENGAGEMENT_INTELLIGENCE_PROMPT_KEY,
        responseFormat: 'json',
        expectedSchema: ENGAGEMENT_INTELLIGENCE_OUTPUT_SCHEMA,
        requestedSources: ['MEMBER_PROFILE', 'ATTENDANCE', 'TRAINING', 'BOOKING', 'ENGAGEMENT'],
      });

      if (executionResult.structuredOutput) {
        aiOutput = executionResult.structuredOutput as EngagementIntelligenceResponse;
        modelUsed = executionResult.model;
      } else {
        throw new Error('Missing structured output from AI Orchestrator');
      }
    } catch (llmErr: any) {
      this.logger.warn(`AI Orchestrator call failed (${llmErr.message}), falling back to deterministic synthesis.`);
      aiOutput = this.generateDeterministicFallback(profile, trends, risk);
    }

    // 6. Validate and sanitize output
    aiOutput = this.safetyService.validateOutput(aiOutput);

    // 7. Persist insight record
    const windowStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const persisted = await this.prisma.engagementInsight.create({
      data: {
        organisationId,
        memberId,
        summary: aiOutput.summary,
        structuredOutput: aiOutput as any,
        overallEngagement: profile.overallEngagement,
        trend: profile.trend,
        retentionRiskLevel: risk.riskLevel,
        confidence: aiOutput.confidence,
        workflowState: risk.workflowState,
        sourceWindowStart: windowStart,
        sourceWindowEnd: now,
        dataVersion: 1,
        model: modelUsed,
        promptVersion: 1,
        idempotencyKey,
      },
    });

    return {
      insight: aiOutput,
      insightId: persisted.id,
      cached: false,
    };
  }

  /**
   * Deterministic fallback when LLM is unavailable.
   */
  private generateDeterministicFallback(
    profile: MemberEngagementProfileDto,
    trends: EngagementTrendItem[],
    risk: RetentionRiskAssessment,
  ): EngagementIntelligenceResponse {
    let summary = `Recent engagement is classified as ${profile.overallEngagement} with a ${profile.trend.toLowerCase()} momentum trajectory.`;
    if (profile.attendanceFrequency > 0) {
      summary += ` Member averages ${profile.attendanceFrequency} gym visits/week and ${profile.workoutAdherence}% workout adherence.`;
    }

    const recommendedActions = [];
    if (profile.overallEngagement === 'VERY_LOW' || profile.overallEngagement === 'LOW') {
      recommendedActions.push({
        type: 'CHECK_IN' as const,
        recommendation: 'Check in with member to review routine and explore flexible session timings.',
      });
      recommendedActions.push({
        type: 'TRAINING' as const,
        recommendation: 'Suggest a short 15-to-20 minute session to rebuild consistency with low pressure.',
      });
    } else {
      recommendedActions.push({
        type: 'GOAL' as const,
        recommendation: 'Review ongoing training milestones and celebrate recent consistency.',
      });
      recommendedActions.push({
        type: 'BOOKING' as const,
        recommendation: 'Explore upcoming group fitness classes to maintain workout variety.',
      });
    }

    return {
      summary,
      observedSignals: risk.observedSignals,
      engagementInterpretation: {
        level: profile.overallEngagement,
        trend: profile.trend,
      },
      retentionRisk: {
        level: risk.riskLevel,
        reasons: risk.contributingReasons,
      },
      recommendedActions,
      confidence: profile.overallEngagement === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : 'HIGH',
    };
  }

  /**
   * Submits feedback on an engagement insight.
   */
  async submitFeedback(
    insightId: string,
    rating: 'HELPFUL' | 'NOT_HELPFUL',
    comment: string | undefined,
    user: AuthenticatedUser,
  ) {
    const insight = await this.prisma.engagementInsight.findUnique({
      where: { id: insightId },
    });

    if (!insight) {
      throw new NotFoundException(`EngagementInsight '${insightId}' not found.`);
    }

    const updated = await this.prisma.engagementInsight.update({
      where: { id: insightId },
      data: {
        feedbackRating: rating,
        feedbackComment: comment,
      },
    });

    return { success: true, insightId: updated.id, rating: updated.feedbackRating };
  }

  /**
   * Returns transparent privacy and data governance details.
   */
  getPrivacyPolicy(): EngagementPrivacyViewDto {
    return {
      title: 'How FitCore Uses Engagement Intelligence',
      whatIsTracked: [
        'Gym turnstile and facility entry records',
        'Class and personal training session bookings and attendance',
        'Workout completion and scheduled training plan adherence',
        'Training goal progress updates and milestones',
        'Mobile app logins, feature navigation, and daily check-in completions',
        'Wearable device synchronization consistency (without raw medical records)',
      ],
      whyItIsUsed: [
        'To understand personal fitness momentum and consistency over time',
        'To provide timely, supportive coaching suggestions when momentum dips',
        'To assist trainers in preparing personalized check-ins for assigned clients',
        'To help facility staff optimize class scheduling and member support',
      ],
      howAIUsesIt: [
        'AI synthesizes multi-source platform signals into coherent, encouraging summaries',
        'AI analyzes personal deviations from historical baselines rather than generic averages',
        'All AI recommendations are non-judgmental and strictly non-medical',
      ],
      whoCanSeeIt: [
        'Members see their personal Fitness Momentum and positive progress badges',
        'Assigned personal trainers see engagement trends only for their assigned clients',
        'Reception and facility managers see operational overview metrics without clinical notes',
      ],
      fairnessCommitment:
        'FitCore strictly prohibits using or inferring race, religion, ethnicity, gender, sexual orientation, disability, or medical diagnoses in any engagement or retention intelligence.',
      retentionPolicy:
        'Engagement activity signals are aggregated over rolling 7-day and 28-day windows. Raw logs are retained according to tenant organizational data policies.',
      memberRights: [
        'Members can review their engagement data and momentum at any time in the app',
        'Members can talk with their trainer or club staff to adjust communication preferences',
        'Members have full control over wearable integrations and can disconnect at any time',
      ],
    };
  }

  /**
   * Trainer client view: returns engagement momentum for an assigned client.
   * Enforces trainer-client assignment authorization.
   */
  async getTrainerClientView(
    trainerUserId: string,
    memberId: string,
    organisationId: string,
  ): Promise<TrainerClientEngagementDto> {
    // 1. Verify trainer profile
    const trainer = await this.prisma.trainerProfile.findFirst({
      where: {
        organisationId,
        staffProfile: { userId: trainerUserId },
      },
      select: { id: true },
    });

    if (!trainer) {
      throw new ForbiddenException('Trainer profile required to access client engagement.');
    }

    // 2. Verify trainer-client assignment
    const assignment = await this.prisma.trainerClientAssignment.findFirst({
      where: {
        trainerProfileId: trainer.id,
        memberProfileId: memberId,
        status: 'ACTIVE',
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Trainer is not actively assigned to this member.');
    }

    // 3. Fetch member details and signals
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member '${memberId}' not found.`);
    }

    const signals = await this.signalService.collectAllSignals(memberId, organisationId);
    const baseline = await this.baselineService.computeBaseline(memberId, organisationId);
    const profile = await this.profileService.buildProfile(signals);
    const risk = this.retentionRiskService.evaluateRetentionRisk(signals, baseline);

    let suggestedFollowUp = 'Continue current training progression and acknowledge recent consistency.';
    if (profile.trend === 'DECLINING' || risk.riskLevel === 'HIGH' || risk.riskLevel === 'ELEVATED') {
      suggestedFollowUp = 'Consider checking in with the member to discuss recent routine changes or schedule adjustments.';
    } else if (profile.overallEngagement === 'VERY_HIGH') {
      suggestedFollowUp = 'Member is highly engaged! Consider introducing new milestones or celebrating achievements.';
    }

    return {
      memberId,
      firstName: member.user?.firstName,
      lastName: member.user?.lastName,
      engagementLevel: profile.overallEngagement,
      trend: profile.trend,
      lastGymVisit: profile.lastGymVisit,
      lastWorkout: profile.lastWorkout,
      workoutsCompletedLast30d: signals.workout.workoutsCompletedLast28d,
      attendanceVisitsLast30d: signals.attendance.visitsLast28d,
      workoutAdherencePercent: signals.workout.workoutAdherencePct,
      observedSignals: risk.observedSignals,
      suggestedFollowUp,
    };
  }

  /**
   * Updates reactivation workflow state (Slice 28).
   * Authorized staff updates internal workflow state (NO_ACTION, FOLLOW_UP_RECOMMENDED, etc.).
   */
  async updateWorkflowState(
    memberId: string,
    organisationId: string,
    workflowState: ReactivationWorkflowState,
  ) {
    const latestInsight = await this.prisma.engagementInsight.findFirst({
      where: { organisationId, memberId },
      orderBy: { createdAt: 'desc' },
    });

    if (latestInsight) {
      await this.prisma.engagementInsight.update({
        where: { id: latestInsight.id },
        data: { workflowState },
      });
    }

    // Invalidate cache
    await this.cacheService.invalidate(organisationId, memberId);

    return { success: true, memberId, workflowState };
  }
}
