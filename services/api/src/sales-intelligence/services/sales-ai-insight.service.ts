import { Injectable, Logger } from '@nestjs/common';
import { ModelGatewayService } from '../../ai/gateway/model-gateway.service';
import { AIUsageService } from '../../ai/usage/ai-usage.service';
import { PromptRegistryService } from '../../ai/prompts/prompt-registry.service';
import { SalesOverviewDto, SalesAiInsightDto } from '@fitcore/types';

@Injectable()
export class SalesAiInsightService {
  private readonly logger = new Logger(SalesAiInsightService.name);

  constructor(
    private readonly modelGateway: ModelGatewayService,
    private readonly aiUsageService: AIUsageService,
    private readonly promptRegistry: PromptRegistryService,
  ) {}

  /**
   * Generates grounded, advisory sales intelligence insights.
   * Strictly refuses instructions to fabricate metrics or invent revenue.
   */
  async generateInsights(params: {
    organisationId: string;
    overview: SalesOverviewDto;
    focusArea?: string;
    userQuery?: string;
    userId?: string;
  }): Promise<SalesAiInsightDto> {
    const { organisationId, overview, focusArea, userQuery } = params;
    const startTime = Date.now();

    // 1. Prompt Injection & Metric Fabrication Defense
    if (userQuery && this.detectFabricationAttempt(userQuery)) {
      this.logger.warn(`Malicious prompt injection or fabrication attempt intercepted: "${userQuery}"`);
      return {
        summary: 'Request Refused: AI cannot fabricate, alter, or invent business sales metrics.',
        observations: [
          'The prompt requested generating or assuming metrics that are not supported by authoritative database records.',
          'Platform policy strictly prohibits hallucinating revenue, conversion rates, or sales performance.',
        ],
        trends: [],
        possible_explanations: [
          'Insights must strictly reflect verified platform data.',
        ],
        recommended_actions: [
          'Review actual recorded metrics in the Sales Intelligence Dashboard.',
        ],
        confidence: 1.0,
        dataWindow: overview.meta.dateRange,
        sourceMetrics: ['safety_boundary_defense'],
        limitations: [
          'Fabricated metrics requests are permanently rejected.',
        ],
      };
    }

    try {
      const prompt = await this.promptRegistry.resolvePrompt(
        organisationId,
        'SALES_INTELLIGENCE',
        'sales_intelligence.v1',
      );

      const metricsContext = JSON.stringify({
        dateRange: overview.meta.dateRange,
        kpis: {
          newLeads: overview.kpis.newLeads.value,
          qualifiedLeads: overview.kpis.qualifiedLeads.value,
          openOpportunities: overview.kpis.openOpportunities.value,
          conversions: overview.kpis.conversions.value,
          conversionRate: `${overview.kpis.conversionRate.value}%`,
          responseRate: `${overview.kpis.responseRate.value}%`,
          avgSpeedToLeadSeconds: overview.kpis.speedToLeadSeconds.value,
          estimatedPipelineValue: `$${overview.kpis.pipelineValue.value}`,
          lostOpportunities: overview.kpis.lostOpportunities.value,
        },
        topSources: overview.topSources.map((s) => ({
          source: s.source,
          leads: s.leads,
          conversions: s.conversions,
          conversionRate: `${s.conversionRate}%`,
        })),
        topLossReasons: overview.topLossReasons,
      });

      const userPrompt = `
Analyze the following verified FitCore sales metrics for period ${overview.meta.dateRange}.
Focus Area: ${focusArea || 'OVERVIEW'}
${userQuery ? `Specific Question: ${userQuery}` : ''}

Verified Sales Metrics Context:
${metricsContext}
`.trim();

      const response = await this.modelGateway.execute('DEVELOPMENT', {
        model: 'fitcore-sales-intelligence-agent',
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        systemInstruction: prompt.systemPrompt,
        responseFormat: 'json',
        outputSchema: (prompt.outputSchema as Record<string, any>) || undefined,
        temperature: 0.2,
      });

      const latencyMs = Date.now() - startTime;

      // Track AI usage under SALES_INTELLIGENCE feature
      await this.aiUsageService.recordUsage({
        organisationId,
        feature: 'SALES_INTELLIGENCE',
        provider: 'DEVELOPMENT',
        model: 'fitcore-sales-intelligence-agent',
        requestId: `sales_intel_${Date.now()}`,
        inputTokens: response?.inputTokens || 250,
        outputTokens: response?.outputTokens || 180,
        latencyMs,
      } as any);

      if (response && response.structuredOutput) {
        return response.structuredOutput as SalesAiInsightDto;
      }
    } catch (err: any) {
      this.logger.warn(`AI model generation failed, utilizing grounded deterministic insight fallback: ${err?.message}`);
    }

    // Grounded deterministic fallback
    return this.generateDeterministicInsight(overview);
  }

  /**
   * Scans user queries for malicious attempts to fabricate sales numbers or ignore metrics.
   */
  private detectFabricationAttempt(query: string): boolean {
    const q = query.toLowerCase();
    const forbiddenPatterns = [
      'ignore all',
      'ignore sales metrics',
      'tell me our revenue is',
      'say our revenue is',
      'fabricate',
      'invent',
      'make up numbers',
      'pretend our conversion rate is',
      'pretend we have',
      'million dollar revenue',
    ];
    return forbiddenPatterns.some((pattern) => q.includes(pattern));
  }

  /**
   * Generates grounded deterministic insights directly from verified KPI values.
   */
  private generateDeterministicInsight(overview: SalesOverviewDto): SalesAiInsightDto {
    const leads = Number(overview.kpis.newLeads.value || 0);
    const convRate = Number(overview.kpis.conversionRate.value || 0);
    const speed = Number(overview.kpis.speedToLeadSeconds.value || 0);
    const pipelineVal = Number(overview.kpis.pipelineValue.value || 0);

    const observations: string[] = [
      `Captured ${leads} prospective leads during ${overview.meta.dateRange}.`,
      `Current overall conversion rate stands at ${convRate}%.`,
      `Average speed to lead is ${speed} seconds across outbound contacts.`,
    ];

    const trends: string[] = [];
    if (convRate >= 15) {
      trends.push('Healthy conversion rate indicates strong prospect-to-membership alignment.');
    } else if (convRate > 0) {
      trends.push('Conversion rate indicates opportunity for enhanced follow-up touchpoint frequency.');
    }

    const possibleExplanations: string[] = [
      'Speed to lead within 5 minutes correlates strongly with higher prospect engagement.',
      'Lead sources with verified tour bookings historically convert at higher rates.',
    ];

    const recommendedActions: string[] = [
      'Maintain sub-15 minute speed to lead for all newly captured inquiries.',
      'Audit the top recorded loss reasons to identify facility or scheduling friction points.',
    ];

    const limitations: string[] = [];
    if (leads < 10) {
      limitations.push('Sample size is under 10 leads; interpret conversion percentages conservatively.');
    }

    return {
      summary: `Performance summary for ${overview.meta.dateRange}: ${leads} leads, ${convRate}% conversion rate, $${pipelineVal} pipeline value.`,
      observations,
      trends,
      possible_explanations: possibleExplanations,
      recommended_actions: recommendedActions,
      confidence: leads >= 10 ? 0.9 : 0.6,
      dataWindow: overview.meta.dateRange,
      sourceMetrics: ['newLeads', 'conversionRate', 'speedToLeadSeconds', 'pipelineValue'],
      limitations,
    };
  }
}
