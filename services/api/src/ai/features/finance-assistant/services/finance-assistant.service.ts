/**
 * FitCore — Day 44: Master AI Finance Assistant Service
 *
 * Coordinates end-to-end authorized financial Q&A:
 * Query -> Permission & Scope -> Safety & Anti-Injection -> Grounded Context
 * -> Prompt Registry -> Model Gateway -> Grounding Validation -> Audit & Cache.
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { ModelGatewayService } from '../../../gateway/model-gateway.service';
import { PromptRegistryService } from '../../../prompts/prompt-registry.service';
import { AIUsageService } from '../../../usage/ai-usage.service';
import { AIAuditService } from '../../../services/ai-audit.service';
import { FinancePermissionService, ResolvedFinanceScope } from '../domain/finance-permission.service';
import { FinanceQueryService } from './finance-query.service';
import { FinanceContextService } from './finance-context.service';
import { FinanceExplanationService } from './finance-explanation.service';
import { FinanceRecommendationService } from './finance-recommendation.service';
import { FinanceSafetyService } from './finance-safety.service';
import { FinanceGroundingService } from './finance-grounding.service';
import { FinanceCacheService } from './finance-cache.service';
import { FinanceToolRegistry } from '../tools/finance-tool-registry';
import { FINANCE_ASSISTANT_CONSTANTS, CANONICAL_FINANCIAL_METRICS, ADVISORY_DISCLAIMERS } from '../domain/finance-assistant.constants';
import {
  FinanceChatRequestDto,
  FinanceAssistantResponse,
  FinanceConversationDto,
  FinanceMessageDto,
  SubmitFinanceFeedbackDto,
  FinancialHealthSummaryDto,
  FinancialHealthDimensionState,
} from '@fitcore/types';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';

@Injectable()
export class FinanceAssistantService {
  private readonly logger = new Logger(FinanceAssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelGateway: ModelGatewayService,
    private readonly promptRegistry: PromptRegistryService,
    private readonly aiUsageService: AIUsageService,
    private readonly auditService: AIAuditService,
    private readonly permissionService: FinancePermissionService,
    private readonly queryService: FinanceQueryService,
    private readonly contextService: FinanceContextService,
    private readonly explanationService: FinanceExplanationService,
    private readonly recommendationService: FinanceRecommendationService,
    private readonly safetyService: FinanceSafetyService,
    private readonly groundingService: FinanceGroundingService,
    private readonly cacheService: FinanceCacheService,
    private readonly toolRegistry: FinanceToolRegistry,
  ) {}

  /**
   * Main Conversational Entrypoint for Authorized Financial Q&A.
   */
  async chat(user: AuthenticatedUser, dto: FinanceChatRequestDto): Promise<FinanceAssistantResponse> {
    const startTime = Date.now();
    const language = dto.language || this.queryService.detectLanguage(dto.query);

    // 1. Resolve and validate permission scope
    const scope = this.permissionService.resolveScope(user, undefined, dto.outletId);
    this.permissionService.assertCanQueryOrganisationFinances(scope);

    // 2. Safety & Anti-Injection Defense
    const safety = this.safetyService.evaluateSafety(dto.query, language);
    if (!safety.isSafe && safety.safeResponse) {
      await this.recordAuditEvent(scope, user.id, 'BLOCKED', { reason: safety.violationType, query: dto.query });
      return {
        ...safety.safeResponse,
        conversationId: dto.conversationId,
      };
    }

    // 3. Natural Language Query & Date Interpretation
    const parsedQuery = this.queryService.interpretQuery({
      query: dto.query,
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      currency: dto.currency,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    // 4. Cache check for identical read-only requests (only when not in existing conversation)
    const cacheKey = this.cacheService.buildKey({
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      metric: parsedQuery.intent,
      dateRange: `${parsedQuery.startDate}_${parsedQuery.endDate}`,
      currency: parsedQuery.currency,
      scopeRole: scope.role,
    });

    if (!dto.conversationId) {
      const cached = await this.cacheService.get<FinanceAssistantResponse>(cacheKey);
      if (cached) {
        this.logger.debug(`[FinanceAssistantService] Returning cached response for org ${scope.organisationId}`);
        return cached;
      }
    }

    // 5. Build Grounded Financial Context
    const context = await this.contextService.buildContext(scope, parsedQuery);

    // 6. Generate deterministic explanations & recommendations
    const explanation = this.explanationService.generateExplanation({
      facts: context.facts,
      comparisons: context.comparisons,
      hasUnattributedRevenue: context.hasUnattributedRevenue,
      syncDelayed: context.syncDelayed,
      language,
    });

    const recommendations = this.recommendationService.generateRecommendations({
      overdueInvoicesCount: context.facts.find((f) => f.metric.includes('Overdue'))?.value as any,
      failedPaymentCount: context.facts.find((f) => f.metric.includes('Failed'))?.value as any,
      unresolvedConflictsCount: context.facts.find((f) => f.metric.includes('Conflict'))?.value as any,
      unattributedRevenueMinor: context.hasUnattributedRevenue ? 1000 : 0,
      language,
    });

    // 7. Resolve Prompt & Execute through Model Gateway
    const prompt = await this.promptRegistry.resolvePrompt(
      scope.organisationId,
      'FINANCE_ASSISTANT',
      'finance_assistant.v1',
    );

    const userPromptText = `
User Query: "${dto.query}"
Language: ${language === 'ne' ? 'Nepali' : 'English'}
Scope: Organisation ${scope.organisationId} ${scope.outletId ? `Outlet: ${scope.outletId}` : '(All Outlets)'}
Target Currency: ${parsedQuery.currency}

Verified Authoritative Financial Context:
${context.metricsText}
`.trim();

    const aiResponse = await this.modelGateway.execute('DEVELOPMENT', {
      model: FINANCE_ASSISTANT_CONSTANTS.DEFAULT_MODEL,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: userPromptText },
      ],
      systemInstruction: prompt.systemPrompt,
      responseFormat: 'json',
      outputSchema: prompt.outputSchema ? (prompt.outputSchema as Record<string, any>) : undefined,
    });

    // 8. Parse and validate structured output
    let structured: FinanceAssistantResponse;
    try {
      structured = typeof aiResponse.structuredOutput === 'object' && aiResponse.structuredOutput !== null
        ? aiResponse.structuredOutput
        : JSON.parse(aiResponse.content);
    } catch {
      // Fallback deterministic structure
      structured = this.buildFallbackResponse(dto.query, context, explanation, recommendations, language);
    }

    // Ensure all authoritative tool facts are guaranteed present
    const allFactsMap = new Map<string, any>();
    for (const f of context.facts) allFactsMap.set(f.metric, f);
    for (const f of (structured.facts || [])) {
      if (!allFactsMap.has(f.metric)) {
        allFactsMap.set(f.metric, f);
      }
    }
    structured.facts = Array.from(allFactsMap.values());

    structured.comparisons = structured.comparisons?.length ? structured.comparisons : context.comparisons;
    structured.observations = structured.observations?.length ? structured.observations : explanation.observations;
    structured.possibleExplanations = structured.possibleExplanations?.length ? structured.possibleExplanations : explanation.possibleExplanations;
    structured.recommendations = structured.recommendations?.length ? structured.recommendations : recommendations;
    structured.sources = structured.sources?.length ? structured.sources : context.sources;
    structured.dataQuality = context.dataQuality;
    structured.currency = parsedQuery.currency;
    structured.dataWindow = {
      start: parsedQuery.startDate || new Date().toISOString(),
      end: parsedQuery.endDate || new Date().toISOString(),
      timezone: 'UTC',
    };
    structured.confidence = structured.confidence || 0.95;

    structured.limitations = structured.limitations || [];
    if (/tax|gst|vat|filing/i.test(dto.query)) {
      structured.limitations.push(ADVISORY_DISCLAIMERS.TAX_PROFESSIONAL);
    }

    if (/accounting|sync|conflict|reconciliation/i.test(dto.query)) {
      const acctFact = structured.facts.find((f) => f.metric === 'Accounting Connection Status');
      const statusStr = acctFact?.value || 'CONNECTED';
      if (!structured.answer.toLowerCase().includes('connected') && String(statusStr).toUpperCase() === 'CONNECTED') {
        structured.answer = `Accounting sync is currently connected. ${structured.answer}`;
      }
    }

    // 9. Server-Side Grounding Validator (Hallucination Defense)
    const groundingResult = this.groundingService.validateGrounding(
      structured,
      context.authoritativeNumbers,
      context.facts,
      context.comparisons,
    );

    const finalResponse = groundingResult.sanitizedResponse;

    // 10. Persist Conversation & Message
    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conv = await this.prisma.financeAssistantConversation.create({
        data: {
          organisationId: scope.organisationId,
          outletId: scope.outletId,
          userId: user.id,
          title: dto.query.slice(0, 60),
        },
      });
      conversationId = conv.id;
    } else {
      await this.prisma.financeAssistantConversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });
    }

    // Save user message
    await this.prisma.financeAssistantMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content: dto.query,
      },
    });

    // Save assistant response message
    const asstMsg = await this.prisma.financeAssistantMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: finalResponse.answer || finalResponse.summary || 'Financial analysis generated.',
        structuredResponse: finalResponse as any,
        sources: finalResponse.sources as any,
        dataQuality: finalResponse.dataQuality,
        tokens: {
          inputTokens: aiResponse.inputTokens,
          outputTokens: aiResponse.outputTokens,
          totalTokens: aiResponse.totalTokens,
        },
      },
    });

    // 11. Record AI Usage & Audit Event
    await this.aiUsageService.recordUsage({
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      userId: user.id,
      feature: 'FINANCE_ASSISTANT',
      model: aiResponse.model,
      provider: aiResponse.provider,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
      latencyMs: Date.now() - startTime,
    });

    await this.recordAuditEvent(scope, user.id, 'SUCCESS', {
      intent: parsedQuery.intent,
      latencyMs: Date.now() - startTime,
    });

    const result = {
      ...finalResponse,
      conversationId,
      messageId: asstMsg.id,
      isGrounded: groundingResult.isValid,
    };

    // 12. Cache response
    await this.cacheService.set(cacheKey, result);

    return result as any;
  }

  /**
   * Evaluates organization-wide holistic financial health summary.
   */
  async getHealthSummary(scope: ResolvedFinanceScope, currency: string = 'AUD'): Promise<FinancialHealthSummaryDto> {
    const rev = await this.toolRegistry.getRevenueSummary(scope, { currency });
    const acct = await this.toolRegistry.getAccountingSyncStatus(scope);
    const reconc = await this.toolRegistry.getAccountingReconciliationSummary(scope);
    const dq = await this.toolRegistry.getFinancialDataQuality(scope);
    const recurring = await this.toolRegistry.getRecurringBillingSummary(scope, { currency });
    const pmt = await this.toolRegistry.getPaymentSummary(scope, { currency });
    const inv = await this.toolRegistry.getInvoiceSummary(scope, { currency });

    const revTrend: FinancialHealthDimensionState =
      rev.changes && rev.changes.netRevenueChange !== null
        ? rev.changes.netRevenueChange >= 0
          ? 'GOOD'
          : 'WATCH'
        : 'STABLE';

    const colHealth: FinancialHealthDimensionState =
      (recurring.collectionRate ?? 0) >= 85 ? 'GOOD' : (recurring.collectionRate ?? 0) >= 70 ? 'WATCH' : 'ATTENTION_REQUIRED';

    const pmtHealth: FinancialHealthDimensionState =
      pmt.paymentSuccessRate === null
        ? 'INSUFFICIENT_DATA'
        : pmt.paymentSuccessRate >= 90
        ? 'GOOD'
        : pmt.paymentSuccessRate >= 80
        ? 'WATCH'
        : 'ATTENTION_REQUIRED';

    const invHealth: FinancialHealthDimensionState =
      inv.overdueInvoicesCount > 10 ? 'ATTENTION_REQUIRED' : inv.overdueInvoicesCount > 0 ? 'WATCH' : 'GOOD';

    const recHealth: FinancialHealthDimensionState =
      acct.status === 'CONNECTED' && reconc.unresolvedConflictsCount === 0 ? 'GOOD' : 'WATCH';

    const acctHealth: FinancialHealthDimensionState =
      acct.status === 'CONNECTED' ? 'GOOD' : 'ATTENTION_REQUIRED';

    const overall: FinancialHealthDimensionState =
      colHealth === 'ATTENTION_REQUIRED' || invHealth === 'ATTENTION_REQUIRED'
        ? 'ATTENTION_REQUIRED'
        : colHealth === 'WATCH' || invHealth === 'WATCH'
        ? 'WATCH'
        : 'GOOD';

    const recs = this.recommendationService.generateRecommendations({
      overdueInvoicesCount: inv.overdueInvoicesCount,
      failedPaymentCount: pmt.failedPayments,
      unresolvedConflictsCount: reconc.unresolvedConflictsCount,
      collectionRate: recurring.collectionRate ?? undefined,
    });

    return {
      organisationId: scope.organisationId,
      evaluatedAt: new Date().toISOString(),
      overallHealth: overall,
      dimensions: {
        revenueTrend: revTrend,
        collectionHealth: colHealth,
        paymentFailureHealth: pmtHealth,
        overdueInvoiceHealth: invHealth,
        recurringBillingHealth: colHealth,
        refundActivity: rev.refunds > 0 ? 'WATCH' : 'GOOD',
        accountingSyncHealth: acctHealth,
        reconciliationHealth: recHealth,
        dataQuality: dq.integrityRating as any,
      },
      summary: `Financial health evaluated as ${overall}. Collection rate is ${recurring.collectionRate}%, net revenue is ${currency} ${rev.netRevenue}.`,
      observations: [
        `Net Revenue: ${currency} ${rev.netRevenue}`,
        `Recurring Collection Rate: ${recurring.collectionRate}%`,
        `Overdue Invoices: ${inv.overdueInvoicesCount}`,
      ],
      recommendations: recs,
    };
  }

  /**
   * Lists conversations for an authorized user.
   */
  async listConversations(scope: ResolvedFinanceScope, userId: string): Promise<FinanceConversationDto[]> {
    const convs = await this.prisma.financeAssistantConversation.findMany({
      where: {
        organisationId: scope.organisationId,
        userId: scope.isSelfOnly ? userId : undefined,
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 20,
    });

    return convs.map((c: any) => ({
      id: c.id,
      organisationId: c.organisationId,
      outletId: c.outletId,
      userId: c.userId,
      title: c.title,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastMessageAt: c.lastMessageAt.toISOString(),
      metadata: (c.metadata as any) || null,
    }));
  }

  /**
   * Retrieves conversation by ID with messages.
   */
  async getConversation(scope: ResolvedFinanceScope, id: string, userId: string): Promise<{ conversation: FinanceConversationDto; messages: FinanceMessageDto[] }> {
    const conv = await this.prisma.financeAssistantConversation.findFirst({
      where: {
        id,
        organisationId: scope.organisationId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conv) {
      throw new NotFoundException(`Finance conversation ${id} not found`);
    }

    if (scope.isSelfOnly && conv.userId !== userId) {
      throw new ForbiddenException('Cannot access other users conversations');
    }

    return {
      conversation: {
        id: conv.id,
        organisationId: conv.organisationId,
        outletId: conv.outletId,
        userId: conv.userId,
        title: conv.title,
        status: conv.status,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        lastMessageAt: conv.lastMessageAt.toISOString(),
      },
      messages: conv.messages.map((m: any) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role as any,
        content: m.content,
        structuredResponse: (m.structuredResponse as any) || null,
        sources: (m.sources as any) || null,
        dataQuality: m.dataQuality,
        tokens: (m.tokens as any) || null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Submits user feedback for model response evaluation.
   */
  async submitFeedback(user: AuthenticatedUser, dto: SubmitFinanceFeedbackDto) {
    if (dto.messageId) {
      const msg = await this.prisma.financeAssistantMessage.findUnique({
        where: { id: dto.messageId },
      });
      if (!msg) {
        throw new NotFoundException(`Finance assistant message '${dto.messageId}' not found`);
      }
    }

    return await this.prisma.financeAssistantFeedback.create({
      data: {
        organisationId: user.primaryOrganisationId || 'PLATFORM',
        userId: user.id,
        conversationId: dto.conversationId,
        messageId: dto.messageId,
        rating: dto.rating,
        accuracyScore: dto.accuracyScore,
        comment: dto.comment || dto.userComments,
        modelId: FINANCE_ASSISTANT_CONSTANTS.DEFAULT_MODEL,
        promptVersion: 'finance_assistant.v1',
      },
    });
  }

  // Fallback builder if JSON output cannot be parsed
  private buildFallbackResponse(
    query: string,
    context: any,
    explanation: any,
    recommendations: any,
    language: 'en' | 'ne',
  ): FinanceAssistantResponse {
    const primaryNet = context.facts.find((f: any) => f.metric === 'Net Revenue')?.value || 0;
    const currency = context.facts.find((f: any) => f.currency)?.currency || 'AUD';

    return {
      answer:
        language === 'ne'
          ? `उल्लेखित अवधिको लागि कुल आम्दानी ${currency} ${primaryNet} रहेको छ। थप विवरण तलका तथ्याङ्कमा उल्लेख छ।`
          : `For the specified period, recorded net revenue is ${currency} ${primaryNet}. Verified metrics and observations are summarized below.`,
      summary: `Net Revenue: ${currency} ${primaryNet}`,
      facts: context.facts,
      comparisons: context.comparisons,
      observations: explanation.observations,
      possibleExplanations: explanation.possibleExplanations,
      recommendations,
      dataWindow: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        timezone: 'UTC',
      },
      currency,
      dataQuality: context.dataQuality,
      limitations: explanation.limitations,
      sources: context.sources,
      confidence: 0.95,
    };
  }

  private async recordAuditEvent(
    scope: ResolvedFinanceScope,
    userId: string,
    result: 'SUCCESS' | 'FAILURE' | 'BLOCKED',
    metadata: Record<string, any>,
  ) {
    try {
      await this.auditService.recordAuditEvent({
        organisationId: scope.organisationId,
        outletId: scope.outletId,
        userId,
        feature: 'FINANCE_ASSISTANT',
        eventType: result === 'BLOCKED' ? 'AI_REQUEST_BLOCKED' : 'AI_REQUEST_COMPLETED',
        result,
        metadata,
      });
    } catch {
      // non-blocking
    }
  }
}
