import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AIOrchestratorService } from '../../../orchestrator/ai-orchestrator.service';
import { AuditService } from '../../../../audit/audit.service';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';
import { EngagementSignalService } from '../../engagement-intelligence/signals/engagement-signal.service';
import { MemberEngagementBaselineService } from '../../engagement-intelligence/profile/member-engagement-baseline.service';
import { RetentionRiskService } from '../../engagement-intelligence/risk/retention-risk.service';
import { InactivityAnalysisService } from './inactivity-analysis.service';
import { RecoverySignalService } from './recovery-signal.service';
import { ReactivationEligibilityService } from '../eligibility/reactivation-eligibility.service';
import { RecoveryStrategyService } from './recovery-strategy.service';
import { ReactivationContextService } from '../context/reactivation-context.service';
import { ReactivationSafetyService } from '../safety/reactivation-safety.service';
import {
  ReactivationIntelligenceResponse,
  ReactivationStrategyRecommendation,
} from '@fitcore/types';
import {
  AI_REACTIVATION_FEATURE,
  REACTIVATION_PROMPT_KEY,
  REACTIVATION_AUDIT_ACTIONS,
  REACTIVATION_ANALYSIS_CACHE_TTL_SECONDS,
} from '../reactivation.constants';
import { REACTIVATION_OUTPUT_SCHEMA } from '../schemas/reactivation-output.schema';

@Injectable()
export class ReactivationAnalysisService {
  private readonly logger = new Logger(ReactivationAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AIOrchestratorService,
    private readonly auditService: AuditService,
    private readonly signalService: EngagementSignalService,
    private readonly baselineService: MemberEngagementBaselineService,
    private readonly retentionRiskService: RetentionRiskService,
    private readonly inactivityService: InactivityAnalysisService,
    private readonly recoverySignalService: RecoverySignalService,
    private readonly eligibilityService: ReactivationEligibilityService,
    private readonly strategyService: RecoveryStrategyService,
    private readonly contextService: ReactivationContextService,
    private readonly safetyService: ReactivationSafetyService,
  ) {}

  /**
   * Generates or retrieves grounded AI Reactivation & Recovery Intelligence for a member.
   */
  async analyzeMember(params: {
    user: AuthenticatedUser;
    memberId: string;
    organisationId: string;
    forceRefresh?: boolean;
    includeAIAssessment?: boolean;
    now?: Date;
  }): Promise<{
    analysis: ReactivationIntelligenceResponse;
    profileId: string;
    cached: boolean;
    generatedBy: 'AI' | 'DETERMINISTIC';
  }> {
    const { user, memberId, organisationId, forceRefresh, includeAIAssessment = true } = params;
    const now = params.now || new Date();

    // 1. Cache / existing profile check (if not force refreshed)
    if (!forceRefresh) {
      const existing = await this.prisma.memberReactivationProfile.findFirst({
        where: {
          organisationId,
          memberId,
          updatedAt: {
            gt: new Date(now.getTime() - REACTIVATION_ANALYSIS_CACHE_TTL_SECONDS * 1000),
          },
        },
      });

      if (existing && existing.rawAnalysis) {
        return {
          analysis: existing.rawAnalysis as unknown as ReactivationIntelligenceResponse,
          profileId: existing.id,
          cached: true,
          generatedBy: 'AI',
        };
      }
    }

    // 2. Collect Signals & Personal Baseline
    const signals = await this.signalService.collectAllSignals(memberId, organisationId, now);
    const baseline = await this.baselineService.computeBaseline(memberId, organisationId, now);

    // 3. Inactivity Analysis
    const { inactivityAnalysis, barriers, mostRecentActivity } =
      await this.inactivityService.analyzeInactivity(memberId, organisationId, signals, baseline, now);

    // 4. Recovery Signal & State Evaluation
    const { recoveryState, positiveSignals, reengagementDetectedAt } =
      this.recoverySignalService.evaluateRecoveryState({
        activities: mostRecentActivity ? [mostRecentActivity] : [],
        daysInactive: inactivityAnalysis.daysInactive,
        baseline,
        now,
      });

    // 5. Retention Risk Check (Optional / Read-only)
    let riskAssessment = null;
    try {
      riskAssessment = this.retentionRiskService.evaluateRetentionRisk(
        signals,
        baseline,
        'NO_ACTION',
      );
    } catch {
      // Graceful fallback if retention calculation is not available
    }

    // 6. Member status check
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { status: true, trainerClientAssignments: { where: { status: 'ACTIVE' }, take: 1 } },
    });
    const memberStatus = member?.status || 'ACTIVE';

    // 7. Deterministic Eligibility Check
    const activePlan = await this.prisma.memberRecoveryPlan.findFirst({
      where: {
        organisationId,
        memberId,
        status: { in: ['PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS'] },
      },
    });

    const eligibility = this.eligibilityService.evaluateEligibility({
      memberId,
      memberStatus,
      inactivityDays: inactivityAnalysis.daysInactive,
      lastMeaningfulActivityAt: inactivityAnalysis.lastMeaningfulActivityAt
        ? new Date(inactivityAnalysis.lastMeaningfulActivityAt)
        : null,
      retentionRiskLevel: riskAssessment?.riskLevel || 'LOW',
      engagementDropPct: inactivityAnalysis.activityDropPercent,
      recoveryState,
      hasActiveRecoveryPlan: Boolean(activePlan),
    });

    // 8. Deterministic Strategy Selection (Taxonomy baseline)
    const deterministicRecommendation = this.strategyService.evaluateStrategy({
      inactivityDays: inactivityAnalysis.daysInactive,
      recoveryState,
      hasAssignedTrainer: (member?.trainerClientAssignments?.length || 0) > 0,
      hasActiveGoals: (signals.goals?.activeGoalsCount || 0) > 0,
      previousClassAttendanceCount: signals.attendance?.classAttendanceCount || 0,
      recentClassBooking: (signals.booking?.bookingsLast7d || 0) > 0,
      membershipExpiringSoon: Boolean(signals.membership?.isExpiringSoon),
      totalHistoricalObservations:
        (signals.attendance?.visitsLast28d || 0) +
        (signals.booking?.bookingsLast28d || 0) +
        (signals.workout?.workoutsCompletedLast28d || 0),
    });

    // 9. Assemble Reactivation Context
    const context = await this.contextService.buildContext({
      memberId,
      organisationId,
      lifecycleState: eligibility.lifecycleState,
      reactivationStatus: eligibility.reactivationStatus,
      recoveryState,
      inactivityAnalysis,
      barriers,
      recoverySignals: positiveSignals,
      signals,
      baseline,
      riskAssessment,
      now,
    });

    // 10. AI Orchestration
    let aiResponse: ReactivationIntelligenceResponse;
    let generatedBy: 'AI' | 'DETERMINISTIC' = 'AI';

    if (includeAIAssessment) {
      try {
        const executionResult = await this.orchestrator.execute({
          feature: AI_REACTIVATION_FEATURE as any,
          prompt: `Analyze member inactivity and recovery telemetry for member ${memberId}. Provide grounded recovery strategy and draft message.`,
          organisationId,
          user,
          memberId,
          promptKey: REACTIVATION_PROMPT_KEY,
          responseFormat: 'json',
          expectedSchema: REACTIVATION_OUTPUT_SCHEMA,
          requestedSources: ['MEMBER_PROFILE', 'ATTENDANCE', 'TRAINING', 'BOOKING', 'ENGAGEMENT'],
        });

        if (executionResult.structuredOutput) {
          aiResponse = executionResult.structuredOutput as ReactivationIntelligenceResponse;

          // Preserve deterministic eligibility and status progression
          aiResponse.reactivation = {
            eligible: eligibility.eligible,
            status: eligibility.reactivationStatus,
            recoveryState: recoveryState,
            confidence: context.dataQuality.sufficientData ? 'HIGH' : 'INSUFFICIENT_DATA',
          };

          // Sanitize
          aiResponse = this.safetyService.validateAndSanitizeOutput(aiResponse);
        } else {
          throw new Error('No structured output from AI Orchestrator');
        }
      } catch (err: any) {
        this.logger.warn(`AI invocation failed (${err.message}). Using deterministic recovery synthesis.`);
        generatedBy = 'DETERMINISTIC';
        aiResponse = this.buildDeterministicResponse(
          eligibility,
          recoveryState,
          inactivityAnalysis,
          deterministicRecommendation,
          barriers,
          positiveSignals,
        );
      }
    } else {
      generatedBy = 'DETERMINISTIC';
      aiResponse = this.buildDeterministicResponse(
        eligibility,
        recoveryState,
        inactivityAnalysis,
        deterministicRecommendation,
        barriers,
        positiveSignals,
      );
    }

    const primaryStrategy =
      aiResponse.recommendedStrategies?.[0]?.type || deterministicRecommendation.type;

    // 11. Upsert MemberReactivationProfile in DB
    const profile = await this.prisma.memberReactivationProfile.upsert({
      where: {
        organisationId_memberId: {
          organisationId,
          memberId,
        },
      },
      create: {
        organisationId,
        memberId,
        lifecycleState: eligibility.lifecycleState,
        reactivationStatus: eligibility.reactivationStatus,
        recoveryState,
        inactivityDays: inactivityAnalysis.daysInactive,
        lastMeaningfulActivityAt: inactivityAnalysis.lastMeaningfulActivityAt
          ? new Date(inactivityAnalysis.lastMeaningfulActivityAt)
          : null,
        lastMeaningfulActivityType: inactivityAnalysis.lastMeaningfulActivityType,
        baselineWeeklyVisits: inactivityAnalysis.baselineActivityVisitsPerWeek,
        currentWeeklyVisits: inactivityAnalysis.recentActivityFrequencyPerWeek,
        dropPct: inactivityAnalysis.activityDropPercent,
        recommendedStrategy: primaryStrategy,
        confidenceScore: 0.9,
        explanationSummary: aiResponse.summary,
        draftMessage: aiResponse.suggestedStaffMessage || null,
        primaryBarriers: (barriers as any) || [],
        positiveSignals: (positiveSignals as any) || [],
        reengagementDetectedAt,
        aiGeneratedAt: now,
        rawAnalysis: aiResponse as any,
      },
      update: {
        lifecycleState: eligibility.lifecycleState,
        reactivationStatus: eligibility.reactivationStatus,
        recoveryState,
        inactivityDays: inactivityAnalysis.daysInactive,
        lastMeaningfulActivityAt: inactivityAnalysis.lastMeaningfulActivityAt
          ? new Date(inactivityAnalysis.lastMeaningfulActivityAt)
          : null,
        lastMeaningfulActivityType: inactivityAnalysis.lastMeaningfulActivityType,
        baselineWeeklyVisits: inactivityAnalysis.baselineActivityVisitsPerWeek,
        currentWeeklyVisits: inactivityAnalysis.recentActivityFrequencyPerWeek,
        dropPct: inactivityAnalysis.activityDropPercent,
        recommendedStrategy: primaryStrategy,
        explanationSummary: aiResponse.summary,
        draftMessage: aiResponse.suggestedStaffMessage || null,
        primaryBarriers: (barriers as any) || [],
        positiveSignals: (positiveSignals as any) || [],
        reengagementDetectedAt: reengagementDetectedAt || undefined,
        aiGeneratedAt: now,
        rawAnalysis: aiResponse as any,
        updatedAt: now,
      },
    });

    // 12. Audit Log
    await this.auditService.log({
      action: REACTIVATION_AUDIT_ACTIONS.RECOMMENDATION_GENERATED,
      resource: 'MemberReactivationProfile',
      resourceId: profile.id,
      userId: user.id,
      organisationId,
      metadata: {
        memberId,
        lifecycleState: eligibility.lifecycleState,
        reactivationStatus: eligibility.reactivationStatus,
        recoveryState,
        recommendedStrategy: profile.recommendedStrategy,
        generatedBy,
      },
    });

    return {
      analysis: aiResponse,
      profileId: profile.id,
      cached: false,
      generatedBy,
    };
  }

  private buildDeterministicResponse(
    eligibility: any,
    recoveryState: any,
    inactivityAnalysis: any,
    recommendation: ReactivationStrategyRecommendation,
    barriers: any[],
    positiveSignals: any[],
  ): ReactivationIntelligenceResponse {
    return {
      summary: `Member has been inactive for ${inactivityAnalysis.daysInactive} days with a ${inactivityAnalysis.activityDropPercent}% reduction in weekly visit frequency. Suggested next step: ${recommendation.suggestedNextStep}.`,
      reactivation: {
        eligible: eligibility.eligible,
        status: eligibility.reactivationStatus,
        recoveryState: recoveryState,
        confidence: 'HIGH',
      },
      inactivity: {
        observation: `No facility visits or workouts recorded for ${inactivityAnalysis.daysInactive} days.`,
        timeframe: `Past ${inactivityAnalysis.daysInactive} days`,
        evidence: [
          `Last activity: ${inactivityAnalysis.lastMeaningfulActivityType} on ${inactivityAnalysis.lastMeaningfulActivityAt || 'N/A'}`,
          `Baseline weekly frequency: ${inactivityAnalysis.baselineActivityVisitsPerWeek}/wk, current: ${inactivityAnalysis.recentActivityFrequencyPerWeek}/wk`,
        ],
      },
      primaryFactors: barriers.map((b) => ({
        type: b.type,
        observation: b.observation,
        evidence: b.evidence,
      })),
      positiveSignals: positiveSignals.map((s) => ({
        type: s.type,
        observation: s.observation,
      })),
      recommendedStrategies: [recommendation],
      suggestedStaffMessage: recommendation.suggestedStaffMessage || 'Hi! We noticed it has been a little while since your last visit. We would love to help you get back into your groove—feel free to drop in for a quick session whenever you are ready!',
      suggestedNextStep: recommendation.suggestedNextStep || 'Reach out to member via preferred communication channel with a warm check-in.',
    };
  }
}
