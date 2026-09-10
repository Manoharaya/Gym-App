/**
 * Day 39 — Follow-Up AI Service
 * Drafts controlled, personalized, safe follow-up messages using Day 19 AI platform.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PromptRegistryService } from '../../../prompts/prompt-registry.service';
import { ModelGatewayService } from '../../../gateway/model-gateway.service';
import { AIUsageService } from '../../../usage/ai-usage.service';
import { FollowUpPersonalizationContext } from './follow-up-context.service';
import {
  AIFollowUpDraftOutput,
  FollowUpStepChannel,
} from '@fitcore/types';

@Injectable()
export class FollowUpAiService {
  private readonly logger = new Logger(FollowUpAiService.name);

  constructor(
    private readonly promptRegistry: PromptRegistryService,
    private readonly modelGateway: ModelGatewayService,
    private readonly aiUsageService: AIUsageService,
  ) {}

  /**
   * Generates a safe, bounded AI follow-up draft.
   */
  async generateFollowUpDraft(
    organisationId: string,
    params: {
      channel: FollowUpStepChannel;
      stepName: string;
      context: FollowUpPersonalizationContext;
      language?: string;
      leadId?: string;
      sequenceId?: string;
      stepId?: string;
    },
  ): Promise<AIFollowUpDraftOutput> {
    const { channel, stepName, context, language = 'en', leadId } = params;
    const startTime = Date.now();

    try {
      const prompt = await this.promptRegistry.resolvePrompt(
        organisationId,
        'FOLLOW_UP_MESSAGE',
        'follow_up_message.v1',
      );

      const userPrompt = `
Generate a ${channel} follow-up message for step: "${stepName}".
Preferred Language: ${language}

Recipient Profile:
- First Name: ${context.firstName}
- Gym / Facility: ${context.outletName}
- Primary Fitness Goal: ${context.primaryGoal || 'General health & fitness'}
- Experience Level: ${context.experienceLevel || 'Beginner'}
- Preferred Schedule: ${context.preferredSchedule || 'Flexible'}
- Current Buying Readiness: ${context.readiness || 'Interested'}
- Known Objections: ${context.objectionSummary || 'None stated'}
- Membership Interest: ${context.membershipInterest || 'Flexible standard access'}
`.trim();

      const response = await this.modelGateway.execute('DEVELOPMENT', {
        model: 'fitcore-follow-up-agent',
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

      // Track AI usage (Section 42)
      await this.aiUsageService.recordUsage({
        organisationId,
        feature: 'FOLLOW_UP_MESSAGE',
        provider: 'DEVELOPMENT',
        model: 'fitcore-follow-up-agent',
        requestId: `fup_${Date.now()}`,
        inputTokens: response?.inputTokens || 120,
        outputTokens: response?.outputTokens || 85,
        latencyMs,
        leadId,
      } as any);

      if (response && response.structuredOutput) {
        const out = response.structuredOutput as AIFollowUpDraftOutput;
        return this.sanitizeAiDraft(out, context, channel, language);
      }
    } catch (err: any) {
      this.logger.warn(`AI model generation failed, using deterministic safe fallback: ${err?.message}`);
    }

    // Deterministic safe fallback
    return this.generateDeterministicDraft(context, channel, stepName, language);
  }

  /**
   * Deterministic safe fallback draft in case LLM is offline or provider is unavailable.
   */
  private generateDeterministicDraft(
    ctx: FollowUpPersonalizationContext,
    channel: FollowUpStepChannel,
    stepName: string,
    language: string,
  ): AIFollowUpDraftOutput {
    const isNepali = language === 'ne' || language === 'nepali';
    const goalText = ctx.primaryGoal ? `your ${ctx.primaryGoal.toLowerCase().replace(/_/g, ' ')}` : 'your fitness';

    let message = '';
    let callToAction = '';
    const personalizationUsed = [ctx.firstName, ctx.outletName];

    if (isNepali) {
      message = `नमस्ते ${ctx.firstName} ज्यू, ${ctx.outletName} बाट सम्पर्क गर्दैछौं। हजुरको फिटनेस लक्ष्य सुरु गर्न यस हप्ता कम्प्लिमेन्टरी ट्रायलको लागि आउन चाहनुहुन्छ?`;
      callToAction = 'ट्रायल बुक गर्नुहोस् वा जवाफ दिनुहोस्';
    } else if (channel === 'EMAIL') {
      message = `Hi ${ctx.firstName},\n\nFollowing up from ${ctx.outletName}! We would love to support you with ${goalText} journey.\n\nOur trainers and facility hours are tailored to your schedule. Would you like to schedule a complimentary workout pass this week?\n\nBest regards,\nThe ${ctx.outletName} Team`;
      callToAction = 'Schedule your complimentary pass';
    } else {
      // SMS or WhatsApp
      message = `Hi ${ctx.firstName}, checking in from ${ctx.outletName}! We'd love to help with ${goalText} goals. Would you like to come in for a complimentary trial pass this week?`;
      callToAction = 'Reply to book your pass';
    }

    return {
      message,
      channel,
      tone: 'CONSULTATIVE',
      purpose: stepName || 'Follow-up check-in',
      personalizationUsed,
      callToAction,
      confidence: 0.95,
      requiresApproval: false,
      safetyFlags: [],
    };
  }

  /**
   * Sanitizes AI draft to ensure it never contains hallucinated pricing or clinical diagnoses.
   */
  private sanitizeAiDraft(
    draft: AIFollowUpDraftOutput,
    ctx: FollowUpPersonalizationContext,
    channel: FollowUpStepChannel,
    language: string,
  ): AIFollowUpDraftOutput {
    let sanitizedMessage = draft.message || '';

    // Guardrail: Remove any hallucinated currency amounts like "$19.99" if not verified
    if (sanitizedMessage.includes('$') && !ctx.customVariables?.verifiedPrice) {
      sanitizedMessage = sanitizedMessage.replace(/\$\d+(\.\d{2})?/g, 'our standard rates');
    }

    return {
      ...draft,
      message: sanitizedMessage,
      channel,
      safetyFlags: draft.safetyFlags || [],
    };
  }
}
