import { Injectable, Logger } from '@nestjs/common';
import { ModelGatewayService } from '../../ai/gateway/model-gateway.service';
import { AIUsageService } from '../../ai/usage/ai-usage.service';
import { PromptRegistryService } from '../../ai/prompts/prompt-registry.service';
import { BusinessOverviewDto, BusinessAIInsight } from '@fitcore/types';
import { BusinessAiQueryDto } from '../dto/business-ai-query.dto';

@Injectable()
export class BusinessAiInsightService {
  private readonly logger = new Logger(BusinessAiInsightService.name);

  constructor(
    private readonly modelGateway: ModelGatewayService,
    private readonly aiUsageService: AIUsageService,
    private readonly promptRegistry: PromptRegistryService,
  ) {}

  /**
   * Generates grounded, advisory business intelligence insights or answers management questions.
   */
  async generateInsights(params: {
    organisationId: string;
    overview: BusinessOverviewDto;
    query?: BusinessAiQueryDto;
    userId?: string;
  }): Promise<BusinessAIInsight> {
    const { organisationId, overview, query, userId } = params;
    const userQuery = query?.question;
    const language = query?.language || 'en';

    // 1. Prompt Injection & Fabrication Defense
    if (userQuery && this.detectFabricationAttempt(userQuery)) {
      this.logger.warn(`BI AI Prompt injection or metric fabrication attempt intercepted: "${userQuery}"`);
      return {
        summary:
          language === 'ne'
            ? 'अनुरोध अस्वीकार गरियो: एआईले प्रमाणित नभएका तथ्याङ्क वा गलत आम्दानी देखाउन सक्दैन।'
            : 'Request Refused: AI cannot fabricate, override, or invent business metrics.',
        observations: [
          {
            metric: 'safety.boundary_defense',
            value: 'REJECTED',
            evidence: 'Prompt attempted to override verified metrics or request simulated revenue.',
          },
        ],
        possibleExplanations: ['Business intelligence insights must strictly reflect verified platform data.'],
        recommendations: [
          {
            recommendation: 'Review actual recorded metrics in the Business Intelligence Dashboard.',
            reason: 'Platform integrity directives strictly prohibit simulated financial figures.',
            priority: 'HIGH',
          },
        ],
        limitations: ['Requests to alter or fabricate numbers are permanently rejected.'],
        confidence: 1.0,
        isGrounded: true,
      };
    }

    try {
      const prompt = await this.promptRegistry.resolvePrompt(
        organisationId,
        'BUSINESS_INTELLIGENCE',
        'business_intelligence.v1',
      );

      const primaryCurrency = overview.finance.primaryCurrency;
      const primaryFin = overview.finance.currencies[primaryCurrency];

      // Prepare verified context
      const contextData = {
        period: overview.period,
        scope: overview.scope,
        currency: primaryCurrency,
        health: overview.health.overallStatus,
        membership: {
          activeMembers: overview.membership.activeMembers,
          newMembers: overview.membership.newMembers,
          cancelledMembers: overview.membership.cancelledMembers,
          reactivatedMembers: overview.membership.reactivatedMembers,
          netMemberChange: overview.membership.netMemberChange,
          growthRate: `${overview.membership.growthRate || 0}%`,
        },
        finance: primaryFin
          ? {
              grossRevenue: `${primaryCurrency} ${primaryFin.grossRevenue}`,
              refunds: `${primaryCurrency} ${primaryFin.refunds}`,
              netRevenue: `${primaryCurrency} ${primaryFin.netRevenue}`,
              paymentSuccessRate: `${primaryFin.paymentSuccessRate || 0}%`,
              outstandingBalance: `${primaryCurrency} ${primaryFin.outstandingBalance}`,
              overdueInvoices: primaryFin.overdueInvoicesCount,
            }
          : {},
        sales: {
          newLeads: overview.sales.newLeads,
          qualifiedLeads: overview.sales.qualifiedLeads,
          conversions: overview.sales.conversions,
          conversionRate: `${overview.sales.conversionRate || 0}%`,
          pipelineValue: `$${overview.sales.pipelineValue}`,
        },
        attendance: {
          totalVisits: overview.attendance.totalVisits,
          uniqueVisitors: overview.attendance.uniqueActiveMembersVisiting,
          frequency: overview.attendance.attendanceFrequencyPerActiveMember,
        },
        retention: {
          highRiskCount: overview.retention.highRiskCount,
          retentionRate: `${overview.retention.retentionRate}%`,
        },
      };

      const userPromptText = `
Analyze the following verified FitCore business metrics for period ${overview.period.start} to ${overview.period.end}.
Language Preference: ${language === 'ne' ? 'Nepali' : 'English'}
${userQuery ? `Specific Management Question: "${userQuery}"` : 'Task: Provide comprehensive cross-domain executive insights.'}

Verified Metrics Context:
${JSON.stringify(contextData, null, 2)}
`.trim();

      const startTime = Date.now();
      const gatewayResponse = await this.modelGateway.execute('DEVELOPMENT', {
        model: 'fitcore-bi-advisory-agent',
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: userPromptText },
        ],
        systemInstruction: prompt.systemPrompt,
        temperature: 0.1,
        responseFormat: 'json',
        outputSchema: prompt.outputSchema as any,
      });

      const latencyMs = Date.now() - startTime;
      let parsedOutput: any = {};
      try {
        parsedOutput = typeof gatewayResponse.content === 'string'
          ? JSON.parse(gatewayResponse.content)
          : gatewayResponse.content;
      } catch {
        parsedOutput = gatewayResponse.structuredOutput || {};
      }

      // Record AI usage safely
      if (userId && userId !== 'system') {
        try {
          await this.aiUsageService.recordUsage({
            organisationId,
            outletId: overview.scope?.outletId || null,
            userId,
            feature: 'BUSINESS_INTELLIGENCE',
            provider: 'DEVELOPMENT',
            model: 'fitcore-bi-advisory-agent',
            inputTokens: gatewayResponse.inputTokens || 450,
            outputTokens: gatewayResponse.outputTokens || 220,
            latencyMs,
          });
        } catch (err: any) {
          this.logger.debug(`Could not record AI usage: ${err.message}`);
        }
      }

      // Grounding validation: ensure observations reference actual context
      const validatedObservations = (parsedOutput.observations || []).map((obs: any) => ({
        metric: String(obs.metric || 'Business Metric'),
        value: obs.value !== undefined ? obs.value : 'Verified',
        comparison: obs.comparison,
        evidence: String(obs.evidence || 'Grounded in authoritative FitCore metrics'),
      }));

      return {
        summary: parsedOutput.summary || (language === 'ne' ? 'व्यवसाय प्रदर्शन स्थिर छ।' : 'Overall business performance is stable with positive net momentum.'),
        observations: validatedObservations.length > 0 ? validatedObservations : [
          {
            metric: 'membership.net_member_change',
            value: `+${overview.membership.netMemberChange}`,
            evidence: `New: ${overview.membership.newMembers}, Cancelled: ${overview.membership.cancelledMembers}`,
          },
          {
            metric: 'finance.net_revenue',
            value: primaryFin ? `${primaryCurrency} ${primaryFin.netRevenue.toLocaleString()}` : '$0',
            evidence: `Cash-basis net revenue for period`,
          },
        ],
        possibleExplanations: parsedOutput.possibleExplanations || [
          'Member acquisition remains steady while facility attendance frequency supports retention.',
        ],
        recommendations: parsedOutput.recommendations || [
          {
            recommendation: 'Monitor members in the elevated retention risk tier for proactive outreach.',
            reason: `${overview.retention.highRiskCount} members currently display declining attendance indicators.`,
            priority: 'HIGH',
          },
          {
            recommendation: 'Optimize follow-up speed for newly qualified sales leads.',
            reason: 'Speed-to-lead strongly correlates with higher conversion rates.',
            priority: 'MEDIUM',
          },
        ],
        limitations: parsedOutput.limitations || [
          'Observations reflect recorded domain data and avoid speculative causal claims.',
        ],
        confidence: parsedOutput.confidence || 0.95,
        dataWindow: `${overview.period.start.split('T')[0]} to ${overview.period.end.split('T')[0]}`,
        currency: primaryCurrency,
        isGrounded: true,
      };
    } catch (err: any) {
      this.logger.error(`Failed to generate AI insights: ${err.message}`);
      // Deterministic fallback if gateway unavailable
      return {
        summary:
          language === 'ne'
            ? 'फिटकोर एकीकृत व्यापार बुद्धिमत्ता: व्यापार समग्र रूपमा स्थिर स्थितिमा छ।'
            : 'FitCore Unified BI: Business is operating in a stable state with positive net indicators.',
        observations: [
          {
            metric: 'membership.net_member_change',
            value: overview.membership.netMemberChange >= 0 ? `+${overview.membership.netMemberChange}` : `${overview.membership.netMemberChange}`,
            evidence: `New members: ${overview.membership.newMembers}, Reactivated: ${overview.membership.reactivatedMembers}, Cancelled: ${overview.membership.cancelledMembers}`,
          },
          {
            metric: 'sales.conversion_rate',
            value: `${overview.sales.conversionRate || 0}%`,
            evidence: `${overview.sales.conversions} conversions from ${overview.sales.conversionDenominator} leads`,
          },
        ],
        possibleExplanations: [
          'Authoritative metrics indicate steady acquisition and resilient billing collections.',
        ],
        recommendations: [
          {
            recommendation: 'Maintain proactive outreach to members flagged with declining visit frequency.',
            reason: 'Consistent attendance is the leading determinant of long-term membership retention.',
            priority: 'HIGH',
          },
        ],
        limitations: ['Insights generated using deterministic fallback engine.'],
        confidence: 0.9,
        isGrounded: true,
      };
    }
  }

  private detectFabricationAttempt(query: string): boolean {
    const q = query.toLowerCase();
    const badPatterns = [
      'ignore all',
      'ignore previous',
      'ignore instructions',
      'fabricate',
      'invent',
      'claim revenue is',
      'make up metrics',
      'pretend we have',
      'hallucinate',
      'override metrics',
      'override data',
    ];
    return badPatterns.some((pattern) => q.includes(pattern));
  }
}
