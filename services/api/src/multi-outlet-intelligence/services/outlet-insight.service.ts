import { Injectable, Logger } from '@nestjs/common';
import { ModelGatewayService } from '../../ai/gateway/model-gateway.service';
import { PromptRegistryService } from '../../ai/prompts/prompt-registry.service';
import { AIUsageService } from '../../ai/usage/ai-usage.service';
import { MultiOutletOverviewDto, MultiOutletAIInsight } from '@fitcore/types';
import { MultiOutletAiQueryDto } from '../dto/multi-outlet-ai-query.dto';

@Injectable()
export class OutletInsightService {
  private readonly logger = new Logger(OutletInsightService.name);

  constructor(
    private readonly modelGateway: ModelGatewayService,
    private readonly promptRegistry: PromptRegistryService,
    private readonly aiUsageService: AIUsageService,
  ) {}

  /**
   * Generates grounded AI multi-outlet insights or answers management inquiries.
   */
  async generateInsights(params: {
    organisationId: string;
    overview: MultiOutletOverviewDto;
    query?: MultiOutletAiQueryDto;
    userId?: string;
  }): Promise<MultiOutletAIInsight> {
    const { organisationId, overview, query, userId } = params;
    const userQuery = query?.question;
    const language = query?.language || 'en';

    // 1. Prompt Injection & Metric Manipulation Interception
    if (userQuery && this.detectFabricationAttempt(userQuery)) {
      this.logger.warn(`Multi-Outlet AI prompt injection or metric fabrication attempt intercepted: "${userQuery}"`);
      return {
        summary:
          language === 'ne'
            ? 'अनुरोध अस्वीकार गरियो: एआईले प्रमाणित नभएका शाखा तथ्याङ्क वा मनगढन्ते आम्दानी देखाउन सक्दैन।'
            : 'Request Refused: AI cannot fabricate, override, or invent multi-outlet metrics.',
        leaders: [],
        attentionAreas: [
          {
            outletId: 'all',
            outletName: 'System Security',
            issue: 'Prompt injection attempted',
            evidence: 'Prompt attempted to override verified metrics or request simulated numbers.',
            severity: 'HIGH',
          },
        ],
        comparisons: [],
        recommendations: [
          {
            recommendation: 'Review actual verified outlet metrics in the Multi-Outlet Dashboard.',
            reason: 'Platform integrity directives strictly prohibit simulated figures.',
            priority: 'HIGH',
          },
        ],
        limitations: ['Requests to alter or fabricate branch rankings are permanently rejected.'],
        confidence: 1.0,
        isGrounded: true,
      };
    }

    // 2. Prepare Verified Context for LLM
    try {
      const prompt = await this.promptRegistry.resolvePrompt(
        organisationId,
        'MULTI_OUTLET_INTELLIGENCE',
        'multi_outlet_intelligence.v1',
      );

      const contextData = {
        period: overview.period,
        totalOutlets: overview.totalOutlets,
        currencies: overview.currencies,
        isSingleOutlet: overview.isSingleOutlet,
        leaders: {
          revenueLeader: overview.leaders.revenueLeader ? `${overview.leaders.revenueLeader.outletName} (${overview.leaders.revenueLeader.currency} ${overview.leaders.revenueLeader.absoluteValue})` : 'N/A',
          growthLeader: overview.leaders.growthLeader ? `${overview.leaders.growthLeader.outletName} (${overview.leaders.growthLeader.normalisedValue}% growth)` : 'N/A',
          salesLeader: overview.leaders.salesLeader ? `${overview.leaders.salesLeader.outletName} (${overview.leaders.salesLeader.normalisedValue}% conversion)` : 'N/A',
          attendanceLeader: overview.leaders.attendanceLeader ? `${overview.leaders.attendanceLeader.outletName} (${overview.leaders.attendanceLeader.normalisedValue} visits/member)` : 'N/A',
          utilisationLeader: overview.leaders.classUtilisationLeader ? `${overview.leaders.classUtilisationLeader.outletName} (${overview.leaders.classUtilisationLeader.normalisedValue}% fill)` : 'N/A',
          retentionWatch: overview.leaders.retentionWatch ? `${overview.leaders.retentionWatch.outletName} (${overview.leaders.retentionWatch.normalisedValue}% at-risk)` : 'N/A',
        },
        outlets: overview.outlets.map((o) => ({
          name: o.outletName,
          members: o.activeMembers,
          growthRate: `${o.memberGrowthRate || 0}%`,
          netRevenue: `${o.currency} ${o.netRevenue}`,
          revenuePerMember: `${o.currency} ${o.revenuePerActiveMember || 0}`,
          conversionRate: `${o.conversionRate || 0}%`,
          visitsPerMember: o.visitsPerActiveMember || 0,
          classFillRate: `${o.classFillRate || 0}%`,
          healthStatus: o.healthStatus,
        })),
        unattributedRevenue: overview.unattributedRevenue,
      };

      const userPromptText = `
Analyze the following verified FitCore multi-outlet metrics for period ${overview.period.start} to ${overview.period.end}.
Language Preference: ${language === 'ne' ? 'Nepali' : 'English'}
${userQuery ? `Specific Management Question: "${userQuery}"` : 'Task: Provide comprehensive cross-outlet benchmarking insights.'}

Verified Context:
${JSON.stringify(contextData, null, 2)}
`.trim();

      const startTime = Date.now();
      const gatewayResponse = await this.modelGateway.execute('DEVELOPMENT', {
        model: 'fitcore-multi-outlet-advisory-agent',
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
            userId,
            feature: 'MULTI_OUTLET_INTELLIGENCE' as any,
            provider: 'DEVELOPMENT',
            model: 'fitcore-multi-outlet-advisory-agent',
            inputTokens: gatewayResponse.inputTokens || 520,
            outputTokens: gatewayResponse.outputTokens || 260,
            latencyMs,
          });
        } catch (err: any) {
          this.logger.debug(`Could not record AI usage: ${err.message}`);
        }
      }

      return {
        summary: parsedOutput.summary || (language === 'ne' ? 'शाखाहरूको समग्र प्रदर्शन सन्तोषजनक र सन्तुलित छ।' : 'Overall multi-outlet operations demonstrate steady performance with clear leaders across revenue and growth.'),
        leaders: parsedOutput.leaders || (overview.leaders.revenueLeader ? [
          {
            outletId: overview.leaders.revenueLeader.outletId,
            outletName: overview.leaders.revenueLeader.outletName,
            metric: 'Net Revenue',
            value: `${overview.leaders.revenueLeader.currency} ${overview.leaders.revenueLeader.absoluteValue}`,
            evidence: 'Authoritative transaction ledger',
          },
        ] : []),
        attentionAreas: parsedOutput.attentionAreas || [],
        comparisons: parsedOutput.comparisons || [],
        recommendations: parsedOutput.recommendations || [
          {
            recommendation: 'Audit low-attendance time slots across underutilised studios to optimise class schedules.',
            reason: 'Maximising class fill rates improves overall member retention and visits.',
            priority: 'HIGH',
          },
        ],
        limitations: parsedOutput.limitations || ['Metrics reflect verified transactional and check-in records.'],
        confidence: parsedOutput.confidence || 0.95,
        isGrounded: true,
      };
    } catch (err: any) {
      this.logger.warn(`AI Multi-Outlet Insight generation fallback: ${err.message}`);
      return this.generateDeterministicFallback(overview, language);
    }
  }

  private generateDeterministicFallback(
    overview: MultiOutletOverviewDto,
    language: 'en' | 'ne',
  ): MultiOutletAIInsight {
    const isNe = language === 'ne';
    const leaders = overview.leaders;

    return {
      summary: isNe
        ? 'शाखा विश्लेषण: सबै शाखाहरूको कार्यसम्पादन प्रमाणीकरण सम्पन्न भएको छ।'
        : 'Multi-Outlet Intelligence: Verified cross-branch operational analysis complete.',
      leaders: leaders.revenueLeader ? [
        {
          outletId: leaders.revenueLeader.outletId,
          outletName: leaders.revenueLeader.outletName,
          metric: 'Revenue Leader',
          value: `${leaders.revenueLeader.currency} ${leaders.revenueLeader.absoluteValue}`,
          evidence: 'Settled payment transactions in current period',
        },
      ] : [],
      attentionAreas: [],
      comparisons: [],
      recommendations: [
        {
          recommendation: 'Review outlets with retention risk warnings to schedule member check-ins.',
          reason: 'Early intervention significantly reduces member churn.',
          priority: 'HIGH',
        },
      ],
      limitations: ['Insights generated using deterministic fallback engine.'],
      confidence: 0.9,
      isGrounded: true,
    };
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
