import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AIOrchestratorService } from '../../../orchestrator/ai-orchestrator.service';
import { AuditService } from '../../../../audit/audit.service';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';
import { EngagementSignalService } from '../../engagement-intelligence/signals/engagement-signal.service';
import { MemberEngagementBaselineService } from '../../engagement-intelligence/profile/member-engagement-baseline.service';
import { RetentionRiskService } from '../../engagement-intelligence/risk/retention-risk.service';
import { RiskFactorService } from './risk-factor.service';
import { InterventionSelectionService } from './intervention-selection.service';
import { RetentionContextService } from '../context/retention-context.service';
import { RetentionSafetyService } from '../safety/retention-safety.service';
import {
  RetentionIntelligenceResponse,
  RetentionRiskLevel,
  RetentionRiskTrend,
  RetentionRiskFactor,
  RetentionPositiveSignal,
  RetentionInterventionRecommendation,
} from '@fitcore/types';
import {
  RETENTION_INTELLIGENCE_FEATURE,
  RETENTION_INTELLIGENCE_PROMPT_KEY,
  RETENTION_INTELLIGENCE_PROMPT_VERSION,
  RETENTION_EVENTS,
  RETENTION_AUDIT_ACTIONS,
  RETENTION_ANALYSIS_CACHE_TTL_SECONDS,
} from '../retention-intelligence.constants';
import { RETENTION_INTELLIGENCE_OUTPUT_SCHEMA } from '../schemas/retention-output.schema';

@Injectable()
export class RetentionAnalysisService {
  private readonly logger = new Logger(RetentionAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AIOrchestratorService,
    private readonly auditService: AuditService,
    private readonly signalService: EngagementSignalService,
    private readonly baselineService: MemberEngagementBaselineService,
    private readonly retentionRiskService: RetentionRiskService,
    private readonly riskFactorService: RiskFactorService,
    private readonly interventionSelectionService: InterventionSelectionService,
    private readonly contextService: RetentionContextService,
    private readonly safetyService: RetentionSafetyService,
  ) {}

  /**
   * Generates or retrieves grounded AI Retention Intelligence for a member.
   */
  async analyzeMember(params: {
    user: AuthenticatedUser;
    memberId: string;
    organisationId: string;
    promptQuery?: string;
    idempotencyKey?: string;
    forceRecalculate?: boolean;
    now?: Date;
  }): Promise<{
    analysis: RetentionIntelligenceResponse;
    analysisId: string;
    cached: boolean;
    generatedBy: 'AI' | 'DETERMINISTIC';
  }> {
    const { user, memberId, organisationId, promptQuery, idempotencyKey, forceRecalculate } = params;
    const now = params.now || new Date();

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingByIdempotency = await this.prisma.retentionAnalysis.findFirst({
        where: { organisationId, memberId, idempotencyKey },
      });

      if (existingByIdempotency) {
        return {
          analysis: {
            summary: existingByIdempotency.summary,
            risk: {
              level: existingByIdempotency.riskLevel as RetentionRiskLevel,
              trend: existingByIdempotency.riskTrend as RetentionRiskTrend,
            },
            primaryFactors: existingByIdempotency.primaryFactors as unknown as RetentionRiskFactor[],
            positiveSignals: (existingByIdempotency.positiveSignals as unknown as RetentionPositiveSignal[]) || [],
            recommendedInterventions: existingByIdempotency.recommendedInterventions as unknown as RetentionInterventionRecommendation[],
            suggestedStaffNote: existingByIdempotency.suggestedStaffNote || undefined,
            confidence: existingByIdempotency.confidence as any,
          },
          analysisId: existingByIdempotency.id,
          cached: true,
          generatedBy: existingByIdempotency.generatedBy as any,
        };
      }
    }

    // 2. Cache Check (if not forced and unexpired)
    if (!forceRecalculate) {
      const latestValid = await this.prisma.retentionAnalysis.findFirst({
        where: {
          organisationId,
          memberId,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (latestValid) {
        return {
          analysis: {
            summary: latestValid.summary,
            risk: {
              level: latestValid.riskLevel as RetentionRiskLevel,
              trend: latestValid.riskTrend as RetentionRiskTrend,
            },
            primaryFactors: latestValid.primaryFactors as unknown as RetentionRiskFactor[],
            positiveSignals: (latestValid.positiveSignals as unknown as RetentionPositiveSignal[]) || [],
            recommendedInterventions: latestValid.recommendedInterventions as unknown as RetentionInterventionRecommendation[],
            suggestedStaffNote: latestValid.suggestedStaffNote || undefined,
            confidence: latestValid.confidence as any,
          },
          analysisId: latestValid.id,
          cached: true,
          generatedBy: latestValid.generatedBy as any,
        };
      }
    }

    // 3. Safety Check on Prompt Query
    if (promptQuery) {
      this.safetyService.validateInputText(promptQuery);
    }

    // 4. Collect Deterministic Signals & Baseline
    const signals = await this.signalService.collectAllSignals(memberId, organisationId, now);
    const baseline = await this.baselineService.computeBaseline(memberId, organisationId, now);
    const riskAssessment = this.retentionRiskService.evaluateRetentionRisk(signals, baseline, 'NO_ACTION', now);

    // 5. Evaluate Structured Risk Factors & Positive Signals
    const primaryFactors = this.riskFactorService.evaluateRiskFactors(signals, baseline);
    const positiveSignals = this.riskFactorService.evaluatePositiveSignals(signals, baseline);
    const riskTrend = this.riskFactorService.computeRiskTrend(signals, baseline, positiveSignals);

    // 6. Detect Risk Escalations / Reductions & Re-engagement (Slice 10 & 28)
    await this.detectAndRecordRiskChanges(memberId, organisationId, riskAssessment.riskLevel, positiveSignals);

    // 7. Assemble Sanitized Retention Context (Slice 11)
    const context = await this.contextService.buildContext(
      memberId,
      organisationId,
      signals,
      baseline,
      riskAssessment,
      primaryFactors,
      positiveSignals,
      now,
    );

    // 8. Deterministic Intervention Selection (Slice 15 & 16)
    const recommendedInterventions = this.interventionSelectionService.selectInterventions({
      riskLevel: riskAssessment.riskLevel,
      riskFactors: primaryFactors,
      positiveSignals,
      hasAssignedTrainer: !!context.memberSummary.trainerAssigned,
      lifecycle: context.lifecycleContext,
      hasActiveGoals: context.goalSummary.activeGoalsCount > 0,
      hasRecentNoShows: signals.attendance.noShowCountLast28d > 0,
      isExpiringSoon: signals.membership.isExpiringSoon,
    });

    // 9. Staff Note Draft Generation (Slice 20)
    const suggestedStaffNote = this.generateDraftStaffNote(
      riskAssessment.riskLevel,
      primaryFactors,
      positiveSignals,
      recommendedInterventions[0],
    );

    // 10. AI Orchestrator Invocation (with robust fallback to deterministic synthesis)
    let aiResponse: RetentionIntelligenceResponse;
    let generatedBy: 'AI' | 'DETERMINISTIC' = 'AI';
    let modelUsed = 'development-default';

    const promptMessage = promptQuery
      ? `Staff query: "${promptQuery}". Provide an explainable retention risk interpretation and recommended interventions.`
      : 'Analyze member engagement telemetry and generate grounded retention insights and recommended staff interventions.';

    try {
      const executionResult = await this.orchestrator.execute({
        feature: RETENTION_INTELLIGENCE_FEATURE as any,
        prompt: promptMessage,
        organisationId,
        user,
        memberId,
        promptKey: RETENTION_INTELLIGENCE_PROMPT_KEY,
        responseFormat: 'json',
        expectedSchema: RETENTION_INTELLIGENCE_OUTPUT_SCHEMA,
        requestedSources: ['MEMBER_PROFILE', 'ATTENDANCE', 'TRAINING', 'BOOKING', 'ENGAGEMENT'],
      });

      if (executionResult.structuredOutput) {
        aiResponse = executionResult.structuredOutput as RetentionIntelligenceResponse;
        modelUsed = executionResult.model;

        // Preserve deterministic risk level (Section 9: AI may explain, not arbitrarily override)
        aiResponse.risk = {
          level: riskAssessment.riskLevel,
          trend: riskTrend,
        };

        // Merge deterministic grounded factors with any high-quality AI observations
        if (!aiResponse.primaryFactors || aiResponse.primaryFactors.length === 0) {
          aiResponse.primaryFactors = primaryFactors;
        }
        if (!aiResponse.positiveSignals) {
          aiResponse.positiveSignals = positiveSignals;
        }
        if (!aiResponse.recommendedInterventions || aiResponse.recommendedInterventions.length === 0) {
          aiResponse.recommendedInterventions = recommendedInterventions;
        }
        if (!aiResponse.suggestedStaffNote) {
          aiResponse.suggestedStaffNote = suggestedStaffNote;
        }

        aiResponse = this.safetyService.validateAndSanitizeOutput(aiResponse);
      } else {
        throw new Error('Empty structured output from AI Orchestrator');
      }
    } catch (llmError: any) {
      this.logger.warn(`AI Orchestrator call failed (${llmError.message}), synthesizing deterministic intelligence.`);
      generatedBy = 'DETERMINISTIC';
      aiResponse = {
        summary: this.buildDeterministicSummary(riskAssessment.riskLevel, riskTrend, primaryFactors, positiveSignals),
        risk: {
          level: riskAssessment.riskLevel,
          trend: riskTrend,
        },
        primaryFactors,
        positiveSignals,
        recommendedInterventions,
        suggestedStaffNote,
        confidence: riskAssessment.riskLevel === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : 'HIGH',
      };
    }

    // 11. Persist Retention Analysis in Database (Slice 1 & 5)
    const expiresAt = new Date(now.getTime() + RETENTION_ANALYSIS_CACHE_TTL_SECONDS * 1000);
    const created = await this.prisma.retentionAnalysis.create({
      data: {
        organisationId,
        memberId,
        riskLevel: aiResponse.risk.level,
        riskTrend: aiResponse.risk.trend,
        analysisVersion: 1,
        dataVersion: 1,
        primaryFactors: aiResponse.primaryFactors as any,
        positiveSignals: aiResponse.positiveSignals as any,
        recommendedInterventions: aiResponse.recommendedInterventions as any,
        suggestedStaffNote: aiResponse.suggestedStaffNote || null,
        summary: aiResponse.summary,
        confidence: aiResponse.confidence,
        generatedBy,
        model: modelUsed,
        promptVersion: RETENTION_INTELLIGENCE_PROMPT_VERSION,
        idempotencyKey: idempotencyKey || null,
        expiresAt,
      },
    });

    // 12. Audit Event (Slice 29 - Never place raw sensitive health information in audit logs)
    await this.auditService.log({
      organisationId,
      userId: user.id,
      action: RETENTION_AUDIT_ACTIONS.RECOMMENDATION_GENERATED,
      resource: 'RETENTION_ANALYSIS',
      resourceId: created.id,
      metadata: {
        memberId,
        riskLevel: aiResponse.risk.level,
        riskTrend: aiResponse.risk.trend,
        primaryIntervention: aiResponse.recommendedInterventions[0]?.type,
        generatedBy,
      },
    });

    return {
      analysis: aiResponse,
      analysisId: created.id,
      cached: false,
      generatedBy,
    };
  }

  /**
   * Detects meaningful risk changes (LOW -> MODERATE, MODERATE -> ELEVATED, etc.) and emits domain events.
   */
  private async detectAndRecordRiskChanges(
    memberId: string,
    organisationId: string,
    currentRiskLevel: RetentionRiskLevel,
    positiveSignals: RetentionPositiveSignal[],
  ): Promise<void> {
    const previous = await this.prisma.retentionAnalysis.findFirst({
      where: { organisationId, memberId },
      orderBy: { createdAt: 'desc' },
      select: { riskLevel: true },
    });

    if (!previous) {
      this.logger.debug(`[${RETENTION_EVENTS.RISK_CREATED}] Initial retention risk established: ${currentRiskLevel} for member ${memberId}`);
      return;
    }

    const rankMap: Record<RetentionRiskLevel, number> = {
      INSUFFICIENT_DATA: 0,
      LOW: 1,
      MODERATE: 2,
      ELEVATED: 3,
      HIGH: 4,
    };

    const prevRank = rankMap[previous.riskLevel as RetentionRiskLevel] || 0;
    const currRank = rankMap[currentRiskLevel] || 0;

    if (currRank > prevRank) {
      this.logger.log(`[${RETENTION_EVENTS.RISK_ESCALATED}] Member ${memberId} risk escalated from ${previous.riskLevel} to ${currentRiskLevel}`);
    } else if (currRank < prevRank) {
      this.logger.log(`[${RETENTION_EVENTS.RISK_REDUCED}] Member ${memberId} risk reduced from ${previous.riskLevel} to ${currentRiskLevel}`);
    }

    if (positiveSignals.some((s) => s.type === 'RECENT_REENGAGEMENT' || s.type === 'ATTENDANCE_RECOVERY')) {
      this.logger.log(`[${RETENTION_EVENTS.REENGAGEMENT_DETECTED}] Member ${memberId} exhibited re-engagement signals`);
    }
  }

  /**
   * Generates a concise suggested staff note draft (Slice 20).
   */
  private generateDraftStaffNote(
    riskLevel: RetentionRiskLevel,
    factors: RetentionRiskFactor[],
    positiveSignals: RetentionPositiveSignal[],
    primaryIntervention?: RetentionInterventionRecommendation,
  ): string {
    if (riskLevel === 'INSUFFICIENT_DATA') {
      return 'New member profile: monitor onboarding check-in and workout onboarding progress.';
    }

    if (riskLevel === 'LOW') {
      if (positiveSignals.length > 0) {
        return `Positive momentum observed: ${positiveSignals[0]?.observation} Acknowledge consistency at next touchpoint.`;
      }
      return 'Member routine is stable and aligned with baseline. No active intervention necessary.';
    }

    const primaryObs = factors[0]?.observation || 'attendance patterns have shifted';
    const interventionName = primaryIntervention?.type ? primaryIntervention.type.replace(/_/g, ' ').toLowerCase() : 'support check-in';

    return `Member activity note: ${primaryObs} Recommended staff touchpoint: ${interventionName}. Inquire warmly about current schedule and routine.`;
  }

  /**
   * Builds an objective deterministic summary.
   */
  private buildDeterministicSummary(
    riskLevel: RetentionRiskLevel,
    riskTrend: RetentionRiskTrend,
    factors: RetentionRiskFactor[],
    positiveSignals: RetentionPositiveSignal[],
  ): string {
    if (riskLevel === 'INSUFFICIENT_DATA') {
      return 'Insufficient historical attendance or workout data recorded to establish a personal behavioral baseline. Risk is unclassified.';
    }

    if (riskLevel === 'LOW') {
      return 'Member engagement indicators remain stable and consistent with their historical activity pattern. No immediate retention concerns detected.';
    }

    const primaryDesc = factors[0]?.observation || 'Activity has decreased relative to personal baseline.';
    const positiveNote = positiveSignals.length > 0
      ? ` However, recent positive signals were noted: ${positiveSignals[0].observation}`
      : '';

    return `Member retention risk is currently evaluated as ${riskLevel} with a ${riskTrend.toLowerCase()} trend. ${primaryDesc}${positiveNote}`;
  }
}
