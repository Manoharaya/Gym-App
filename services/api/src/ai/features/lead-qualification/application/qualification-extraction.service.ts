/**
 * FitCore AI Qualification Extraction Service (Day 38)
 *
 * Uses AI Model Gateway with registered prompt 'lead_qualification.v1'.
 * Provides deterministic fallback supporting English and Nepali (नेपाली) semantics.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ModelGatewayService } from '../../../gateway/model-gateway.service';
import { PromptRegistryService } from '../../../prompts/prompt-registry.service';
import {
  ExtractedQualificationDto,
  LeadGoal,
  LeadExperienceLevel,
  LeadReadiness,
  LeadScheduleFlexibility,
  LeadBudgetSensitivity,
  LeadObjectionType,
} from '@fitcore/types';
import { LEAD_QUALIFICATION_PROMPT_KEY } from '../prompts/lead_qualification.v1';

export interface ExtractionContext {
  organisationId: string;
  transcript: string;
  leadMetadata?: {
    firstName?: string | null;
    lastName?: string | null;
    outletId?: string | null;
    outletName?: string | null;
    preferredLanguage?: string | null;
  };
  forceDeterministic?: boolean;
}

@Injectable()
export class QualificationExtractionService {
  private readonly logger = new Logger(QualificationExtractionService.name);

  constructor(
    private readonly modelGateway: ModelGatewayService,
    private readonly promptRegistry: PromptRegistryService,
  ) {}

  /**
   * Extracts qualification profile from conversation transcript using AI or deterministic fallback.
   */
  async extractQualification(ctx: ExtractionContext): Promise<ExtractedQualificationDto> {
    if (!ctx.forceDeterministic) {
      try {
        const prompt = await this.promptRegistry.resolvePrompt(
          ctx.organisationId,
          'AI_LEAD_QUALIFICATION' as any,
          LEAD_QUALIFICATION_PROMPT_KEY,
        );

        if (prompt && prompt.systemPrompt) {
          const userMessage = `
Prospect Information:
Name: ${ctx.leadMetadata?.firstName || ''} ${ctx.leadMetadata?.lastName || ''}
Preferred Language: ${ctx.leadMetadata?.preferredLanguage || 'en'}
Gym Outlet: ${ctx.leadMetadata?.outletName || ctx.leadMetadata?.outletId || 'Main Facility'}

Conversation Transcript:
${ctx.transcript || 'No conversation recorded yet.'}
`.trim();

          const response = await this.modelGateway.execute('DEVELOPMENT', {
            model: 'fitcore-lead-qualification',
            messages: [
              {
                role: 'system',
                content: prompt.systemPrompt,
              },
              {
                role: 'user',
                content: userMessage,
              },
            ],
            systemInstruction: prompt.systemPrompt,
            responseFormat: 'json',
            outputSchema: (prompt.outputSchema as Record<string, any>) || undefined,
            temperature: 0.1,
          });

          if (response && response.structuredOutput) {
            return this.normalizeExtractedOutput(response.structuredOutput, ctx);
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `AI lead qualification model execution failed; falling back to deterministic extractor: ${err.message}`,
        );
      }
    }

    return this.deterministicExtraction(ctx);
  }

  /**
   * Normalizes AI model structured output into ExtractedQualificationDto.
   */
  private normalizeExtractedOutput(
    output: any,
    ctx: ExtractionContext,
  ): ExtractedQualificationDto {
    return {
      primaryGoal: output.primaryGoal || 'UNKNOWN',
      secondaryGoals: Array.isArray(output.secondaryGoals) ? output.secondaryGoals : [],
      serviceInterests: Array.isArray(output.serviceInterests) ? output.serviceInterests : [],
      experienceLevel: output.experienceLevel || 'UNKNOWN',
      schedule: {
        preferredDays: Array.isArray(output.schedule?.preferredDays) ? output.schedule.preferredDays : [],
        preferredTimes: Array.isArray(output.schedule?.preferredTimes) ? output.schedule.preferredTimes : [],
        frequencyPreference: output.schedule?.frequencyPreference || undefined,
        scheduleFlexibility: output.schedule?.scheduleFlexibility || 'UNKNOWN',
      },
      location: {
        preferredOutletId: output.location?.preferredOutletId || ctx.leadMetadata?.outletId || undefined,
        preferredOutletName: output.location?.preferredOutletName || ctx.leadMetadata?.outletName || undefined,
        distanceSensitivity: output.location?.distanceSensitivity || undefined,
      },
      budgetSensitivity: output.budgetSensitivity || 'UNKNOWN',
      budgetRange: output.budgetRange || undefined,
      objections: Array.isArray(output.objections) ? output.objections : [],
      decisionFactors: Array.isArray(output.decisionFactors) ? output.decisionFactors : [],
      timeline: output.timeline || 'UNKNOWN',
      readiness: output.readiness || 'UNKNOWN',
      questions: Array.isArray(output.questions) ? output.questions : [],
      constraints: Array.isArray(output.constraints) ? output.constraints : [],
      missingInformation: Array.isArray(output.missingInformation) ? output.missingInformation : [],
      isHighIntent: !!output.isHighIntent,
      qualificationStatus: output.qualificationStatus || 'IN_PROGRESS',
      recommendedNextAction: output.recommendedNextAction || 'ASK_QUALIFICATION_QUESTION',
      nextActionReason: output.nextActionReason || 'Continuing discovery conversation.',
      confidence: typeof output.confidence === 'number' ? output.confidence : 0.85,
      evidence: Array.isArray(output.evidence)
        ? output.evidence
        : [{ observation: 'Extracted via FitCore AI Qualification Engine', inferred: false, source: 'AI_EXTRACTION' }],
      aiSummary: output.aiSummary || 'Prospect qualification profile generated.',
    };
  }

  /**
   * Deterministic extraction rule engine supporting English, Nepali, and Romanized Nepali.
   */
  deterministicExtraction(ctx: ExtractionContext): ExtractedQualificationDto {
    const text = (ctx.transcript || '').toLowerCase();
    const evidence: Array<{ observation: string; inferred: boolean; source: string }> = [];

    // 1. Goal Detection
    let primaryGoal: LeadGoal = 'UNKNOWN';
    const secondaryGoals: string[] = [];

    if (
      text.includes('weight loss') ||
      text.includes('fat loss') ||
      text.includes('lose weight') ||
      text.includes('slimming') ||
      text.includes('taul ghatauna') ||
      text.includes('ghataune')
    ) {
      primaryGoal = 'WEIGHT_LOSS';
      evidence.push({ observation: 'Prospect expressed weight reduction goal', inferred: false, source: 'DIRECT_CUSTOMER_STATEMENT' });
    } else if (
      text.includes('muscle') ||
      text.includes('bulk') ||
      text.includes('bodybuild') ||
      text.includes('mass') ||
      text.includes('muscle banauna')
    ) {
      primaryGoal = 'MUSCLE_GAIN';
      evidence.push({ observation: 'Prospect expressed muscle gain goal', inferred: false, source: 'DIRECT_CUSTOMER_STATEMENT' });
    } else if (
      text.includes('strength') ||
      text.includes('powerlift') ||
      text.includes('stronger') ||
      text.includes('shakti')
    ) {
      primaryGoal = 'STRENGTH_AND_CONDITIONING';
      evidence.push({ observation: 'Prospect expressed strength/conditioning goal', inferred: false, source: 'DIRECT_CUSTOMER_STATEMENT' });
    } else if (
      text.includes('rehab') ||
      text.includes('injury') ||
      text.includes('mobility') ||
      text.includes('ghunda dukhchha') ||
      text.includes('dhad')
    ) {
      primaryGoal = 'REHABILITATION_AND_MOBILITY';
      evidence.push({ observation: 'Prospect noted physical recovery/mobility priority', inferred: false, source: 'DIRECT_CUSTOMER_STATEMENT' });
    } else if (
      text.includes('fit') ||
      text.includes('health') ||
      text.includes('active') ||
      text.includes('swasthya')
    ) {
      primaryGoal = 'GENERAL_FITNESS';
      evidence.push({ observation: 'Prospect expressed general health and fitness interest', inferred: false, source: 'DIRECT_CUSTOMER_STATEMENT' });
    }

    // 2. Service Interests
    const serviceInterests: string[] = [];
    if (text.includes('pt') || text.includes('personal train') || text.includes('trainer') || text.includes('coach')) {
      serviceInterests.push('PERSONAL_TRAINING');
    }
    if (text.includes('class') || text.includes('group') || text.includes('yoga') || text.includes('zumba') || text.includes('pilates')) {
      serviceInterests.push('GROUP_CLASSES');
    }
    if (text.includes('trial') || text.includes('try out') || text.includes('free session') || text.includes('try')) {
      serviceInterests.push('TRIAL');
    }
    if (text.includes('tour') || text.includes('visit') || text.includes('look around') || text.includes('bhetna')) {
      serviceInterests.push('TOUR');
    }
    if (text.includes('membership') || text.includes('join') || text.includes('package') || text.includes('monthly') || text.includes('subscri')) {
      serviceInterests.push('MEMBERSHIP');
    }

    // 3. Experience Level
    let experienceLevel: LeadExperienceLevel = 'UNKNOWN';
    if (
      text.includes('beginner') ||
      text.includes('never worked out') ||
      text.includes('new to gym') ||
      text.includes('pahilo patak') ||
      text.includes('suru')
    ) {
      experienceLevel = 'BEGINNER';
      evidence.push({ observation: 'Prospect identified as beginner', inferred: false, source: 'DIRECT_CUSTOMER_STATEMENT' });
    } else if (
      text.includes('intermediate') ||
      text.includes('used to work out') ||
      text.includes('regular') ||
      text.includes('pahile gareko')
    ) {
      experienceLevel = 'INTERMEDIATE';
    } else if (text.includes('advanced') || text.includes('athlete') || text.includes('years of training')) {
      experienceLevel = 'ADVANCED';
    }

    // 4. Schedule
    const preferredDays: string[] = [];
    const preferredTimes: string[] = [];
    let scheduleFlexibility: LeadScheduleFlexibility = 'UNKNOWN';

    if (text.includes('morning') || text.includes('bihana') || text.includes('early')) {
      preferredTimes.push('MORNING');
    }
    if (text.includes('evening') || text.includes('sanjha') || text.includes('beluka') || text.includes('after work')) {
      preferredTimes.push('EVENING');
    }
    if (text.includes('afternoon') || text.includes('diuso')) {
      preferredTimes.push('AFTERNOON');
    }
    if (text.includes('weekend') || text.includes('saturday') || text.includes('sunday')) {
      preferredTimes.push('WEEKEND');
    }
    if (text.includes('flexible') || text.includes('anytime')) {
      scheduleFlexibility = 'VERY_FLEXIBLE';
    } else if (text.includes('only') || text.includes('strict') || text.includes('matra')) {
      scheduleFlexibility = 'RIGID';
    }

    // 5. Budget Sensitivity
    let budgetSensitivity: LeadBudgetSensitivity = 'UNKNOWN';
    let budgetRange: string | undefined = undefined;
    if (
      text.includes('expensive') ||
      text.includes('too much') ||
      text.includes('cheap') ||
      text.includes('discount') ||
      text.includes('kati parchha') ||
      text.includes('budget') ||
      text.includes('sasto')
    ) {
      budgetSensitivity = 'HIGH';
      evidence.push({ observation: 'Prospect asked about pricing sensitivity or discounts', inferred: true, source: 'AI_INFERENCE' });
    } else if (text.includes('reasonable') || text.includes('fair price')) {
      budgetSensitivity = 'MODERATE';
    }

    // 6. Objections
    const objections: Array<{
      objectionType: LeadObjectionType;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER';
      rawCustomerStatement: string;
      normalizedSummary: string;
    }> = [];

    if (text.includes('expensive') || text.includes('too costly') || text.includes('can’t afford') || text.includes('cant afford')) {
      objections.push({
        objectionType: 'PRICE_OR_MEMBERSHIP_COST',
        severity: 'HIGH',
        rawCustomerStatement: 'Mentioned price/cost concern in transcript',
        normalizedSummary: 'Prospect expressed concern regarding membership or program pricing.',
      });
    }
    if (text.includes('no time') || text.includes('too busy') || text.includes('fursad chaina') || text.includes('time chaina')) {
      objections.push({
        objectionType: 'SCHEDULE_OR_TIME_COMMITMENT',
        severity: 'MEDIUM',
        rawCustomerStatement: 'Mentioned lack of time in transcript',
        normalizedSummary: 'Prospect has tight schedule constraints and limited availability.',
      });
    }
    if (text.includes('far') || text.includes('tadha') || text.includes('too far') || text.includes('distance')) {
      objections.push({
        objectionType: 'LOCATION_OR_DISTANCE',
        severity: 'MEDIUM',
        rawCustomerStatement: 'Mentioned travel distance in transcript',
        normalizedSummary: 'Prospect concerned about distance or travel time to the gym.',
      });
    }

    // 7. Readiness & Timeline
    let readiness: LeadReadiness = 'UNKNOWN';
    let timeline: any = 'UNKNOWN';

    if (text.includes('ready to join') || text.includes('sign up') || text.includes('start today') || text.includes('aaja bata suru')) {
      readiness = 'READY_TO_JOIN';
      timeline = text.includes('this week') ? 'THIS_WEEK' : 'IMMEDIATE';
    } else if (text.includes('ready to visit') || text.includes('visit') || text.includes('tour') || text.includes('see the gym') || text.includes('bhetna')) {
      readiness = 'READY_TO_VISIT';
      timeline = text.includes('this week') ? 'THIS_WEEK' : 'IMMEDIATE';
    } else if (text.includes('ready to try') || text.includes('trial') || text.includes('try') || text.includes('free session') || text.includes('this week')) {
      readiness = 'READY_TO_TRY';
      timeline = 'THIS_WEEK';
    } else if (text.includes('just looking') || text.includes('checking') || text.includes('information') || text.includes('bujhna')) {
      readiness = 'EXPLORING';
      timeline = 'EXPLORING';
    }

    const isHighIntent =
      readiness === 'READY_TO_JOIN' ||
      readiness === 'READY_TO_TRY' ||
      readiness === 'READY_TO_VISIT' ||
      timeline === 'IMMEDIATE';

    // 8. Recommended Next Action
    let recommendedNextAction: any = 'ASK_QUALIFICATION_QUESTION';
    let nextActionReason = 'Gather more details to complete prospect discovery profile.';

    if (readiness === 'READY_TO_JOIN') {
      recommendedNextAction = 'SHOW_MEMBERSHIP_OPTIONS';
      nextActionReason = 'Prospect is ready to commit; present membership options.';
    } else if (readiness === 'READY_TO_TRY' || serviceInterests.includes('TRIAL')) {
      recommendedNextAction = 'OFFER_TRIAL';
      nextActionReason = 'Prospect has high trial interest; book trial session.';
    } else if (readiness === 'READY_TO_VISIT' || serviceInterests.includes('TOUR')) {
      recommendedNextAction = 'OFFER_TOUR';
      nextActionReason = 'Prospect wants to see the facility; book a tour.';
    } else if (serviceInterests.includes('PERSONAL_TRAINING')) {
      recommendedNextAction = 'OFFER_TRAINER_INFORMATION';
      nextActionReason = 'Prospect requested personal training info.';
    } else if (serviceInterests.includes('GROUP_CLASSES')) {
      recommendedNextAction = 'SHOW_CLASS_OPTIONS';
      nextActionReason = 'Prospect requested group fitness class schedule.';
    }

    // 9. Missing information
    const missingInformation: string[] = [];
    if (primaryGoal === 'UNKNOWN') missingInformation.push('primaryGoal');
    if (serviceInterests.length === 0) missingInformation.push('serviceInterests');
    if (preferredTimes.length === 0 && preferredDays.length === 0) missingInformation.push('preferredSchedule');
    if (experienceLevel === 'UNKNOWN') missingInformation.push('experienceLevel');

    const aiSummary = `Prospect interested in ${primaryGoal !== 'UNKNOWN' ? String(primaryGoal).toLowerCase().replace(/_/g, ' ') : 'fitness'}. Readiness: ${readiness}. Recommended next step: ${recommendedNextAction}.`;

    return {
      primaryGoal,
      secondaryGoals,
      serviceInterests,
      experienceLevel,
      schedule: {
        preferredDays,
        preferredTimes,
        scheduleFlexibility,
      },
      location: {
        preferredOutletId: ctx.leadMetadata?.outletId || undefined,
        preferredOutletName: ctx.leadMetadata?.outletName || undefined,
      },
      budgetSensitivity,
      budgetRange,
      objections,
      decisionFactors: [],
      timeline,
      readiness,
      questions: [],
      constraints: [],
      missingInformation,
      isHighIntent,
      qualificationStatus: isHighIntent ? 'QUALIFIED' : primaryGoal !== 'UNKNOWN' ? 'PARTIALLY_QUALIFIED' : 'IN_PROGRESS',
      recommendedNextAction,
      nextActionReason,
      confidence: 0.85,
      evidence,
      aiSummary,
    };
  }
}
