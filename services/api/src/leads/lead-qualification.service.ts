/**
 * Day 33 — AI Lead Qualification Service
 * Evaluates prospect conversation signals using the Day 19 AI Platform and deterministic fallbacks.
 * Extracts goals, service interests, readiness, objections, and generates an explainable sales summary.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ModelGatewayService } from '../ai/gateway/model-gateway.service';
import { PromptRegistryService } from '../ai/prompts/prompt-registry.service';
import { LeadScoringService } from './lead-scoring.service';
import { LeadNextActionService } from './lead-next-action.service';
import {
  LeadQualificationProfileDto,
  QualificationStatus,
  LeadNextBestAction,
  ReadinessLevel,
  PreferredSchedule,
  PriceSensitivity,
} from '@fitcore/types';

export interface QualifyLeadOptions {
  conversationId?: string;
  userMessage?: string;
  forceDeterministic?: boolean;
}

@Injectable()
export class LeadQualificationService {
  private readonly logger = new Logger(LeadQualificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelGateway: ModelGatewayService,
    private readonly promptRegistry: PromptRegistryService,
    private readonly scoringService: LeadScoringService,
    private readonly nextActionService: LeadNextActionService,
  ) {}

  /**
   * Evaluates qualification for a lead and updates the database record.
   */
  async qualifyLead(
    organisationId: string,
    leadId: string,
    options?: QualifyLeadOptions,
  ): Promise<LeadQualificationProfileDto> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        qualificationProfile: true,
        outlet: true,
      },
    });

    if (!lead || lead.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'LEAD_NOT_FOUND',
        message: `Lead ${leadId} not found in organisation ${organisationId}`,
      });
    }

    // 1. Gather conversational context
    let conversationTranscript = '';
    const conversationId = options?.conversationId || lead.originatingConversationId;

    if (conversationId) {
      const messages = await this.prisma.receptionistMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 30,
      });

      conversationTranscript = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');
    }

    if (options?.userMessage) {
      conversationTranscript += `\nCUSTOMER: ${options.userMessage}`;
    }

    // 2. Perform AI Analysis or Heuristic Fallback
    const analysis = await this.runAnalysis(
      organisationId,
      lead,
      conversationTranscript,
      options?.forceDeterministic,
    );

    // 3. Persist or Update LeadQualificationProfile
    const updatedProfile = await this.prisma.leadQualificationProfile.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
        goals: analysis.detectedGoals,
        serviceInterests: analysis.serviceInterests,
        preferredOutletId: analysis.preferredOutletId || lead.outletId,
        preferredSchedule: analysis.preferredSchedule,
        experienceLevel: analysis.experienceLevel,
        readiness: analysis.readiness,
        priceSensitivity: analysis.priceSensitivity,
        objections: analysis.objections as any,
        missingInformation: analysis.missingInformation,
        qualificationStatus: analysis.qualificationStatus,
        recommendedNextAction: analysis.recommendedNextAction,
        nextActionReason: analysis.nextActionReason,
        aiConfidence: analysis.confidence,
        aiEvidence: analysis.evidence as any,
        aiSummary: analysis.aiSummary,
        lastEvaluatedAt: new Date(),
      },
      update: {
        goals: analysis.detectedGoals,
        serviceInterests: analysis.serviceInterests,
        preferredOutletId: analysis.preferredOutletId || lead.outletId,
        preferredSchedule: analysis.preferredSchedule,
        experienceLevel: analysis.experienceLevel,
        readiness: analysis.readiness,
        priceSensitivity: analysis.priceSensitivity,
        objections: analysis.objections as any,
        missingInformation: analysis.missingInformation,
        qualificationStatus: analysis.qualificationStatus,
        recommendedNextAction: analysis.recommendedNextAction,
        nextActionReason: analysis.nextActionReason,
        aiConfidence: analysis.confidence,
        aiEvidence: analysis.evidence as any,
        aiSummary: analysis.aiSummary,
        qualificationVersion: { increment: 1 },
        lastEvaluatedAt: new Date(),
      },
    });

    // 4. Calculate Deterministic Score
    const scoringResult = this.scoringService.calculateScore({
      status: lead.status,
      source: lead.source,
      email: lead.email,
      phone: lead.phone,
      consentStatus: lead.consentStatus,
      goals: analysis.detectedGoals,
      serviceInterests: analysis.serviceInterests,
      preferredOutletId: updatedProfile.preferredOutletId,
      preferredSchedule: analysis.preferredSchedule,
      experienceLevel: analysis.experienceLevel,
      readiness: analysis.readiness,
      priceSensitivity: analysis.priceSensitivity,
    });

    // 5. Update Lead with Score and Status
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        score: scoringResult.score,
        scoreVersion: scoringResult.scoreVersion,
        scoreFactors: scoringResult.scoreFactors as any,
        scoreCalculatedAt: scoringResult.calculatedAt,
        status:
          lead.status === 'NEW' && analysis.qualificationStatus === 'QUALIFIED'
            ? 'QUALIFIED'
            : lead.status === 'NEW' && analysis.qualificationStatus === 'UNQUALIFIED'
            ? 'UNQUALIFIED'
            : lead.status === 'NEW'
            ? 'QUALIFYING'
            : lead.status,
      },
    });

    // 6. Record Activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        organisationId,
        activityType: 'QUALIFICATION_UPDATED',
        actorType: 'AI_RECEPTIONIST',
        title: `Lead Qualified: ${analysis.qualificationStatus}`,
        description: `Score updated to ${scoringResult.score}/100. Next action: ${analysis.recommendedNextAction}.`,
        metadata: {
          score: scoringResult.score,
          qualificationStatus: analysis.qualificationStatus,
          recommendedNextAction: analysis.recommendedNextAction,
          goals: analysis.detectedGoals,
        },
      },
    });

    return {
      id: updatedProfile.id,
      leadId: updatedProfile.leadId,
      goals: (updatedProfile.goals as string[]) || [],
      serviceInterests: (updatedProfile.serviceInterests as string[]) || [],
      preferredOutletId: updatedProfile.preferredOutletId,
      preferredSchedule: updatedProfile.preferredSchedule as PreferredSchedule,
      experienceLevel: updatedProfile.experienceLevel as any,
      readiness: updatedProfile.readiness as ReadinessLevel,
      priceSensitivity: updatedProfile.priceSensitivity as PriceSensitivity,
      objections: (updatedProfile.objections as any[]) || [],
      preferredContactChannel: updatedProfile.preferredContactChannel as any,
      preferredLanguage: updatedProfile.preferredLanguage,
      qualificationStatus: updatedProfile.qualificationStatus as QualificationStatus,
      qualificationVersion: updatedProfile.qualificationVersion,
      missingInformation: (updatedProfile.missingInformation as string[]) || [],
      recommendedNextAction: updatedProfile.recommendedNextAction as LeadNextBestAction,
      nextActionReason: updatedProfile.nextActionReason,
      aiConfidence: updatedProfile.aiConfidence,
      aiEvidence: (updatedProfile.aiEvidence as any[]) || [],
      aiSummary: updatedProfile.aiSummary,
      lastEvaluatedAt: updatedProfile.lastEvaluatedAt?.toISOString(),
      createdAt: updatedProfile.createdAt.toISOString(),
      updatedAt: updatedProfile.updatedAt.toISOString(),
    };
  }

  /**
   * Internal analyzer invoking the prompt registry and model gateway with deterministic fallback.
   */
  private async runAnalysis(
    organisationId: string,
    lead: any,
    transcript: string,
    forceDeterministic?: boolean,
  ) {
    if (!forceDeterministic) {
      try {
        const resolvedPrompt = await this.promptRegistry.resolvePrompt(
          organisationId,
          'AI_LEAD_QUALIFICATION' as any,
          'lead_qualification.v1',
        );

        const promptInput = `
ORGANISATION_ID: ${organisationId}
LEAD_ID: ${lead.id}
SOURCE: ${lead.source}
EMAIL_PROVIDED: ${lead.email ? 'YES' : 'NO'}
PHONE_PROVIDED: ${lead.phone ? 'YES' : 'NO'}

TRANSCRIPT:
${transcript || 'No conversation recorded yet.'}
`;

        const modelResult = await this.modelGateway.execute('DEVELOPMENT', {
          model: 'fitcore-lead-qualification',
          messages: [
            {
              role: 'system',
              content: `${resolvedPrompt.systemPrompt}\n${resolvedPrompt.developerPrompt}`,
            },
            {
              role: 'user',
              content: promptInput,
            },
          ],
          systemInstruction: resolvedPrompt.systemPrompt,
          temperature: 0.1,
          responseFormat: 'json',
          outputSchema: resolvedPrompt.outputSchema as any,
        });

        if (modelResult?.content) {
          const parsed =
            typeof modelResult.content === 'string'
              ? JSON.parse(modelResult.content)
              : modelResult.content;

          return {
            qualificationStatus: parsed.qualificationStatus || 'IN_PROGRESS',
            detectedGoals: Array.isArray(parsed.detectedGoals) ? parsed.detectedGoals : [],
            serviceInterests: Array.isArray(parsed.serviceInterests) ? parsed.serviceInterests : [],
            preferredOutletId: lead.outletId,
            preferredSchedule: parsed.preferredSchedule || 'UNKNOWN',
            experienceLevel: parsed.experienceLevel || 'UNKNOWN',
            readiness: parsed.readiness || 'INTERESTED',
            priceSensitivity: parsed.priceSensitivity || 'VALUE_FOCUSED',
            objections: Array.isArray(parsed.objections) ? parsed.objections : [],
            missingInformation: Array.isArray(parsed.missingInformation)
              ? parsed.missingInformation
              : [],
            recommendedNextAction: parsed.recommendedNextAction || 'COLLECT_CONTACT_DETAILS',
            nextActionReason: parsed.aiSummary || 'AI model qualification assessment',
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
            evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
            aiSummary: parsed.aiSummary || 'Prospect actively engaging with receptionist.',
          };
        }
      } catch (err: any) {
        this.logger.warn(`AI model gateway execution bypassed, using deterministic rules: ${err.message}`);
      }
    }

    // Deterministic Heuristic Fallback
    return this.heuristicQualification(lead, transcript);
  }

  /**
   * Deterministic rule-based qualification fallback for offline / test environments.
   */
  private heuristicQualification(lead: any, transcript: string) {
    const text = (transcript + ' ' + (lead.notes || '')).toLowerCase();

    // 1. Goals Detection
    const detectedGoals: string[] = [];
    if (text.includes('strength') || text.includes('muscle') || text.includes('weights')) {
      detectedGoals.push('strength');
    }
    if (text.includes('weight loss') || text.includes('lose weight') || text.includes('fat loss')) {
      detectedGoals.push('weight_management');
    }
    if (text.includes('cardio') || text.includes('endurance') || text.includes('fitness')) {
      detectedGoals.push('fitness');
    }
    if (text.includes('flexibility') || text.includes('yoga') || text.includes('mobility')) {
      detectedGoals.push('flexibility');
    }

    // 2. Service Interest
    const serviceInterests: string[] = [];
    if (text.includes('personal train') || text.includes('trainer') || text.includes('coach')) {
      serviceInterests.push('PERSONAL_TRAINING');
    }
    if (text.includes('class') || text.includes('hiit') || text.includes('yoga') || text.includes('pilates')) {
      serviceInterests.push('GROUP_CLASSES');
    }
    if (text.includes('membership') || text.includes('join') || text.includes('sign up')) {
      serviceInterests.push('MEMBERSHIP');
    }
    if (text.includes('trial') || text.includes('pass') || text.includes('try')) {
      serviceInterests.push('TRIAL');
    }
    if (text.includes('tour') || text.includes('visit') || text.includes('look around')) {
      serviceInterests.push('TOUR');
    }
    if (serviceInterests.length === 0) {
      serviceInterests.push('MEMBERSHIP');
    }

    // 3. Readiness
    let readiness = 'INTERESTED';
    if (text.includes('ready to join') || text.includes('sign me up') || text.includes('start today')) {
      readiness = 'READY_TO_JOIN';
    } else if (text.includes('trial') || text.includes('free session') || text.includes('try out')) {
      readiness = 'READY_TO_TRY';
    } else if (text.includes('tour') || text.includes('come in') || text.includes('visit tomorrow')) {
      readiness = 'READY_TO_VISIT';
    } else if (text.includes('just looking') || text.includes('curious') || text.includes('wondering')) {
      readiness = 'EXPLORING';
    }

    // 4. Schedule
    let preferredSchedule = 'UNKNOWN';
    if (text.includes('morning') || text.includes('am')) {
      preferredSchedule = 'MORNING';
    } else if (text.includes('evening') || text.includes('after work') || text.includes('pm')) {
      preferredSchedule = 'EVENING';
    } else if (text.includes('weekend') || text.includes('saturday') || text.includes('sunday')) {
      preferredSchedule = 'WEEKEND';
    }

    // 5. Objections
    const objections: any[] = [];
    if (text.includes('expensive') || text.includes('costly') || text.includes('budget') || text.includes('price')) {
      objections.push({
        type: 'PRICE',
        customerStatementSummary: 'Customer inquiring closely or expressing sensitivity regarding pricing.',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }
    if (text.includes('busy') || text.includes('time') || text.includes('schedule')) {
      objections.push({
        type: 'TIME',
        customerStatementSummary: 'Customer expressed concerns regarding available time commitment.',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    // 6. Missing Information
    const missing: string[] = [];
    if (!lead.email) missing.push('email');
    if (!lead.phone) missing.push('phone');
    if (!lead.outletId) missing.push('preferred_outlet');
    if (detectedGoals.length === 0) missing.push('goals');

    // 7. Status
    let qualificationStatus = 'IN_PROGRESS';
    if (detectedGoals.length > 0 && serviceInterests.length > 0 && (lead.email || lead.phone)) {
      qualificationStatus = 'QUALIFIED';
    } else if (detectedGoals.length > 0 || serviceInterests.length > 0) {
      qualificationStatus = 'PARTIALLY_QUALIFIED';
    }

    // 8. Next Action
    const nextActionResult = this.nextActionService.determineNextAction(lead.id, {
      status: lead.status,
      email: lead.email,
      phone: lead.phone,
      goals: detectedGoals,
      serviceInterests,
      preferredOutletId: lead.outletId,
      preferredSchedule,
      readiness,
      objections,
      hasCustomerRequestedHandoff: text.includes('speak to human') || text.includes('talk to someone'),
    });

    const aiSummary = `Prospect interested in ${serviceInterests.join(', ')} with primary focus on ${
      detectedGoals.length > 0 ? detectedGoals.join(', ') : 'general fitness'
    }. Stated readiness: ${readiness}. Recommended next step: ${nextActionResult.recommendedAction}.`;

    return {
      qualificationStatus,
      detectedGoals,
      serviceInterests,
      preferredOutletId: lead.outletId,
      preferredSchedule,
      experienceLevel: 'UNKNOWN',
      readiness,
      priceSensitivity: objections.some((o) => o.type === 'PRICE') ? 'PRICE_SENSITIVE' : 'VALUE_FOCUSED',
      objections,
      missingInformation: missing,
      recommendedNextAction: nextActionResult.recommendedAction,
      nextActionReason: nextActionResult.reason,
      confidence: 0.88,
      evidence: [
        {
          observation: `Service interests detected: ${serviceInterests.join(', ')}`,
          inferred: false,
          source: 'conversation_transcript',
        },
      ],
      aiSummary,
    };
  }
}
