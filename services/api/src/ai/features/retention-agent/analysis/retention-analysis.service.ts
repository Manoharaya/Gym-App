import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditService } from '../../../../audit/audit.service';
import { AIOrchestratorService } from '../../../orchestrator/ai-orchestrator.service';
import { RetentionAgentContextService } from '../context/retention-agent-context.service';
import { RetentionPriorityService } from './retention-priority.service';
import { InterventionRecommendationService } from '../recommendations/intervention-recommendation.service';
import { TimingRecommendationService } from '../recommendations/timing-recommendation.service';
import { RetentionMessageService } from '../messaging/retention-message.service';
import {
  RetentionAgentAnalysisDto,
  RetentionAgentStructuredOutput,
} from '@fitcore/types';
import {
  RETENTION_AGENT_FEATURE,
  RETENTION_AGENT_PROMPT_KEY,
  RETENTION_AGENT_PROMPT_VERSION,
  RETENTION_AGENT_AUDIT_ACTIONS,
} from '../retention-agent.constants';
import { RETENTION_AGENT_OUTPUT_SCHEMA } from '../retention-agent.schemas';

@Injectable()
export class RetentionAnalysisService {
  private readonly logger = new Logger(RetentionAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly orchestrator: AIOrchestratorService,
    private readonly contextService: RetentionAgentContextService,
    private readonly priorityService: RetentionPriorityService,
    private readonly interventionService: InterventionRecommendationService,
    private readonly timingService: TimingRecommendationService,
    private readonly messageService: RetentionMessageService,
  ) {}

  /**
   * Generates a full retention analysis and outreach recommendation for a member.
   */
  async analyzeMember(
    memberId: string,
    organisationId: string,
    staffUserId?: string,
    promptQuery?: string,
  ): Promise<{
    analysis: RetentionAgentAnalysisDto;
    draftMessage: string;
  }> {
    // 1. Build sanitized context
    const context = await this.contextService.buildContext(memberId, organisationId);

    // 2. Deterministic baseline checks
    const priority = this.priorityService.evaluatePriority(context);
    const deterministicStrategy = this.interventionService.recommendStrategy(context);
    const timing = this.timingService.recommendTiming(context);

    // 3. AI Orchestrator Execution
    let aiOutput: Partial<RetentionAgentStructuredOutput> = {};
    let modelUsed = 'development';
    let generatedBy = 'AI';

    try {
      const userPrompt = promptQuery
        ? `Staff query: "${promptQuery}". Analyze member telemetry and prepare a retention strategy.`
        : 'Analyze member telemetry, identify primary factors, positive signals, and recommend least intrusive intervention.';

      const result = await this.orchestrator.execute({
        feature: RETENTION_AGENT_FEATURE as any,
        prompt: userPrompt,
        organisationId,
        user: {
          id: staffUserId || 'system',
          organisationId,
          roles: [{ role: 'ORGANISATION_OWNER', organisationId }],
        } as any,
        memberId,
        promptKey: RETENTION_AGENT_PROMPT_KEY,
        responseFormat: 'json',
        expectedSchema: RETENTION_AGENT_OUTPUT_SCHEMA,
        requestedSources: ['MEMBER_PROFILE', 'ATTENDANCE', 'BOOKING', 'ENGAGEMENT'],
      });

      if (result.structuredOutput) {
        aiOutput = result.structuredOutput as RetentionAgentStructuredOutput;
        modelUsed = result.model;
      }
    } catch (err: any) {
      this.logger.warn(`AI generation fallback to deterministic synthesis: ${err.message}`);
      generatedBy = 'DETERMINISTIC';
    }

    // 4. Merge AI recommendations with deterministic platform safeguards
    // Core rule: AI may explain, but deterministic risk level & priority cannot be overridden
    const riskLevel = context.retentionSignals.riskLevel;
    const riskTrend = context.retentionSignals.riskTrend;
    const primaryFactors = aiOutput.primaryFactors && aiOutput.primaryFactors.length > 0
      ? aiOutput.primaryFactors
      : context.retentionSignals.primaryFactors;
    const positiveSignals = aiOutput.positiveSignals && aiOutput.positiveSignals.length > 0
      ? aiOutput.positiveSignals
      : context.retentionSignals.positiveSignals;

    const recommendedIntervention =
      aiOutput.recommendedIntervention || deterministicStrategy.intervention;
    const recommendedChannel =
      aiOutput.recommendedChannel || deterministicStrategy.suggestedChannel;

    const summary =
      aiOutput.summary ||
      `Member attendance has shifted from baseline of ${context.engagement.baselineWeeklyVisits} visits/week to ${context.engagement.recentWeeklyVisits} visits/week.`;

    const staffNote =
      aiOutput.staffNote ||
      deterministicStrategy.reason;

    const nextBestAction =
      aiOutput.nextBestAction ||
      deterministicStrategy.expectedNextStep;

    // 5. Generate and validate draft message
    const draftMessage = this.messageService.generateDraft(
      deterministicStrategy,
      context,
      aiOutput.messageDraft,
    );

    // 6. Persist RetentionAgentAnalysis
    const createdAnalysis = await this.prisma.retentionAgentAnalysis.create({
      data: {
        organisationId,
        memberId,
        outletId: context.outletId,
        priority,
        riskLevel,
        riskTrend,
        primaryFactors: primaryFactors as any,
        positiveSignals: positiveSignals as any,
        recommendedInterventions: [recommendedIntervention] as any,
        recommendedChannel,
        recommendedTiming: (aiOutput.recommendedTiming || timing) as any,
        summary,
        staffNote,
        nextBestAction,
        confidence: aiOutput.confidence || 'HIGH',
        caution: aiOutput.caution || 'Verify member communication preferences before outreach.',
        sources: (aiOutput.sources || ['MEMBER_PROFILE', 'ATTENDANCE', 'BOOKING']) as any,
        generatedBy,
        model: modelUsed,
        promptVersion: RETENTION_AGENT_PROMPT_VERSION,
      },
    });

    if (staffUserId) {
      await this.auditService.log({
        action: RETENTION_AGENT_AUDIT_ACTIONS.ANALYSIS_VIEWED,
        resource: 'retention_agent_analysis',
        resourceId: createdAnalysis.id,
        userId: staffUserId,
        organisationId,
      });
    }

    const analysisDto: RetentionAgentAnalysisDto = {
      id: createdAnalysis.id,
      organisationId: createdAnalysis.organisationId,
      memberId: createdAnalysis.memberId,
      outletId: createdAnalysis.outletId || undefined,
      analysisVersion: createdAnalysis.analysisVersion,
      contextVersion: createdAnalysis.contextVersion,
      status: createdAnalysis.status as any,
      priority: createdAnalysis.priority as any,
      riskLevel: createdAnalysis.riskLevel as any,
      riskTrend: createdAnalysis.riskTrend as any,
      primaryFactors: createdAnalysis.primaryFactors as any,
      positiveSignals: createdAnalysis.positiveSignals as any,
      recommendedInterventions: createdAnalysis.recommendedInterventions as any,
      recommendedChannel: createdAnalysis.recommendedChannel as any,
      recommendedTiming: createdAnalysis.recommendedTiming as any,
      summary: createdAnalysis.summary,
      staffNote: createdAnalysis.staffNote || undefined,
      nextBestAction: createdAnalysis.nextBestAction || undefined,
      confidence: createdAnalysis.confidence,
      caution: createdAnalysis.caution || undefined,
      sources: createdAnalysis.sources as any,
      generatedBy: createdAnalysis.generatedBy,
      model: createdAnalysis.model || undefined,
      promptVersion: createdAnalysis.promptVersion,
      createdAt: createdAnalysis.createdAt.toISOString(),
      updatedAt: createdAnalysis.updatedAt.toISOString(),
    };

    return {
      analysis: analysisDto,
      draftMessage,
    };
  }
}
