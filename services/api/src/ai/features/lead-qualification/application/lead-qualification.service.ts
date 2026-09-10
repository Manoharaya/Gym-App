/**
 * FitCore AI Lead Qualification Master Service (Day 38)
 *
 * Coordinates:
 * - Multilingual AI extraction & deterministic fallback
 * - Safety validation & medical disclaimers
 * - 7-dimension completeness scoring & high-intent evaluation
 * - Precedence rules & immutable audit history diffs
 * - Relational objection tracking
 * - Sales pipeline synchronization
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { QualificationExtractionService } from './qualification-extraction.service';
import { QualificationValidationService } from './qualification-validation.service';
import { QualificationScoringService } from './qualification-scoring.service';
import { QualificationHistoryService } from './qualification-history.service';
import { ObjectionService } from './objection.service';
import { QualificationQuestionService } from './qualification-question.service';
import {
  ExtractLeadQualificationDto,
  StaffOverrideQualificationDto,
  GenerateDiscoveryQuestionsDto,
} from '../dto/lead-qualification.dto';
import {
  StaffLeadQualificationViewDto,
  SmartDiscoveryQuestionDto,
  QualificationActorType,
} from '@fitcore/types';

@Injectable()
export class LeadQualificationService {
  private readonly logger = new Logger(LeadQualificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractionService: QualificationExtractionService,
    private readonly validationService: QualificationValidationService,
    private readonly scoringService: QualificationScoringService,
    private readonly historyService: QualificationHistoryService,
    private readonly objectionService: ObjectionService,
    private readonly questionService: QualificationQuestionService,
  ) {}

  /**
   * Qualifies a lead from conversation transcripts or explicit customer messages.
   */
  async qualifyLead(
    organisationId: string,
    leadId: string,
    options?: ExtractLeadQualificationDto,
  ): Promise<StaffLeadQualificationViewDto> {
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

    // 1. Gather conversation context
    let transcript = '';
    const conversationId = options?.conversationId || lead.originatingConversationId;

    if (conversationId) {
      // Check sales conversation messages first, then receptionist messages
      const salesMessages = await this.prisma.salesConversationMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 30,
      });

      if (salesMessages.length > 0) {
        transcript = salesMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      } else {
        const receptionistMessages = await this.prisma.receptionistMessage.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
          take: 30,
        });
        transcript = receptionistMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      }
    }

    if (options?.userMessage) {
      transcript += (transcript ? '\n' : '') + `PROSPECT: ${options.userMessage}`;
    }

    // 2. Run AI or deterministic extraction
    const rawExtracted = await this.extractionService.extractQualification({
      organisationId,
      transcript,
      leadMetadata: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        outletId: lead.outletId,
        outletName: lead.outlet?.name,
        preferredLanguage: lead.preferredLanguage,
      },
      forceDeterministic: options?.forceDeterministic,
    });

    // 3. Validate & sanitize for medical safety and ethical boundaries
    const validationResult = this.validationService.validateAndSanitize(rawExtracted, transcript);
    const sanitized = validationResult.sanitizedData;

    // 4. Check for open blocker objections
    const hasBlocker = await this.objectionService.hasBlockerObjection(leadId);

    // 5. Enforce Precedence Rules & Progressive Signal Accumulation
    const existingProfile = lead.qualificationProfile;
    const canOverride = this.historyService.canOverrideField(
      options?.source || 'AI_EXTRACTION',
      existingProfile?.lastStaffOverrideAt,
    );

    const hasNewGoal = sanitized.primaryGoal && sanitized.primaryGoal !== 'UNKNOWN';
    const updatedGoals = canOverride
      ? (hasNewGoal ? [sanitized.primaryGoal, ...(sanitized.secondaryGoals || [])] : existingProfile?.goals)
      : existingProfile?.goals;

    const existingServices = Array.isArray(existingProfile?.serviceInterests) ? (existingProfile?.serviceInterests as string[]) : [];
    const updatedServiceInterests = canOverride
      ? (sanitized.serviceInterests && sanitized.serviceInterests.length > 0 ? Array.from(new Set([...existingServices, ...sanitized.serviceInterests])) : existingServices)
      : existingServices;

    const existingDays = Array.isArray(existingProfile?.preferredDays) ? (existingProfile?.preferredDays as string[]) : [];
    const updatedScheduleDays = canOverride
      ? (sanitized.schedule?.preferredDays && sanitized.schedule.preferredDays.length > 0 ? Array.from(new Set([...existingDays, ...sanitized.schedule.preferredDays])) : existingDays)
      : existingDays;

    const existingTimes = Array.isArray(existingProfile?.preferredTimes) ? (existingProfile?.preferredTimes as string[]) : [];
    const updatedScheduleTimes = canOverride
      ? (sanitized.schedule?.preferredTimes && sanitized.schedule.preferredTimes.length > 0 ? Array.from(new Set([...existingTimes, ...sanitized.schedule.preferredTimes])) : existingTimes)
      : existingTimes;

    const updatedFlexibility = canOverride
      ? (sanitized.schedule?.scheduleFlexibility && sanitized.schedule.scheduleFlexibility !== 'UNKNOWN' ? sanitized.schedule.scheduleFlexibility : existingProfile?.scheduleFlexibility)
      : existingProfile?.scheduleFlexibility;

    const updatedExperience = canOverride
      ? (sanitized.experienceLevel && sanitized.experienceLevel !== 'UNKNOWN' ? sanitized.experienceLevel : existingProfile?.experienceLevel)
      : existingProfile?.experienceLevel;

    const updatedReadiness = canOverride
      ? (sanitized.readiness && sanitized.readiness !== 'UNKNOWN' ? sanitized.readiness : existingProfile?.readiness)
      : existingProfile?.readiness;

    const updatedBudgetSensitivity = canOverride
      ? (sanitized.budgetSensitivity && sanitized.budgetSensitivity !== 'UNKNOWN' ? sanitized.budgetSensitivity : existingProfile?.budgetSensitivity)
      : existingProfile?.budgetSensitivity;

    const updatedTimeline = canOverride
      ? (sanitized.timeline && sanitized.timeline !== 'UNKNOWN' ? sanitized.timeline : existingProfile?.timeline)
      : existingProfile?.timeline;

    const effectiveGoal = Array.isArray(updatedGoals) && updatedGoals.length > 0 ? (updatedGoals[0] as string) : sanitized.primaryGoal;

    // 6. Evaluate completeness & high-intent status on cumulative signals
    const budgetRangeString = typeof sanitized.budgetRange === 'string'
      ? sanitized.budgetRange
      : sanitized.budgetRange
      ? JSON.stringify(sanitized.budgetRange)
      : existingProfile?.budgetRange;

    const scoring = this.scoringService.evaluateQualification({
      primaryGoal: effectiveGoal,
      serviceInterests: updatedServiceInterests,
      preferredOutletId: sanitized.location?.preferredOutletId || existingProfile?.preferredOutletId || lead.outletId,
      preferredOutletName: sanitized.location?.preferredOutletName || lead.outlet?.name,
      preferredDays: updatedScheduleDays,
      preferredTimes: updatedScheduleTimes,
      scheduleFlexibility: updatedFlexibility,
      experienceLevel: updatedExperience,
      readiness: updatedReadiness,
      budgetSensitivity: updatedBudgetSensitivity,
      budgetRange: budgetRangeString,
      timeline: updatedTimeline,
      requiresHumanReview: validationResult.requiresHumanReview,
      hasBlockerObjection: hasBlocker,
    });

    // 7. Detect changes and record audit history
    if (existingProfile) {
      const diffs = this.historyService.detectFieldChanges(existingProfile, {
        primaryGoal: sanitized.primaryGoal,
        experienceLevel: updatedExperience,
        readiness: updatedReadiness,
        qualificationStatus: scoring.status,
        qualificationCompleteness: scoring.completeness,
        isHighIntent: scoring.isHighIntent,
      });

      if (diffs.length > 0) {
        await this.historyService.recordChanges({
          leadId: lead.id,
          profileId: existingProfile.id,
          organisationId,
          actorType: 'AI_SALES_AGENT',
          source: options?.source || 'AI_EXTRACTION',
          evidence: options?.userMessage || 'Automated qualification evaluation',
          changes: diffs,
        });
      }
    }

    const budgetRangeVal = typeof sanitized.budgetRange === 'string' ? sanitized.budgetRange : sanitized.budgetRange ? JSON.stringify(sanitized.budgetRange) : undefined;
    const freqPrefVal = sanitized.schedule?.frequencyPreference ? String(sanitized.schedule.frequencyPreference) : undefined;

    // 8. Persist Profile
    const profile = await this.prisma.leadQualificationProfile.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
        goals: updatedGoals as any,
        serviceInterests: updatedServiceInterests as any,
        preferredOutletId: sanitized.location?.preferredOutletId || lead.outletId,
        preferredSchedule: sanitized.schedule?.preferredTimes?.[0] || 'FLEXIBLE',
        preferredDays: updatedScheduleDays as any,
        preferredTimes: updatedScheduleTimes as any,
        frequencyPreference: freqPrefVal,
        scheduleFlexibility: updatedFlexibility,
        experienceLevel: updatedExperience,
        readiness: updatedReadiness,
        budgetSensitivity: updatedBudgetSensitivity,
        budgetRange: budgetRangeVal,
        decisionFactors: sanitized.decisionFactors as any,
        timeline: updatedTimeline,
        questions: sanitized.questions as any,
        constraints: sanitized.constraints as any,
        missingInformation: sanitized.missingInformation as any,
        isHighIntent: scoring.isHighIntent,
        qualificationCompleteness: scoring.completeness,
        qualificationStatus: scoring.status,
        recommendedNextAction: sanitized.recommendedNextAction,
        nextActionReason: sanitized.nextActionReason,
        aiConfidence: sanitized.confidence,
        aiEvidence: sanitized.evidence as any,
        aiSummary: sanitized.aiSummary,
        lastEvaluatedAt: new Date(),
      },
      update: {
        goals: updatedGoals as any,
        serviceInterests: updatedServiceInterests as any,
        preferredOutletId: sanitized.location?.preferredOutletId || lead.outletId,
        preferredSchedule: sanitized.schedule?.preferredTimes?.[0] || existingProfile?.preferredSchedule,
        preferredDays: updatedScheduleDays as any,
        preferredTimes: updatedScheduleTimes as any,
        frequencyPreference: freqPrefVal || existingProfile?.frequencyPreference,
        scheduleFlexibility: updatedFlexibility,
        experienceLevel: updatedExperience,
        readiness: updatedReadiness,
        budgetSensitivity: updatedBudgetSensitivity,
        budgetRange: budgetRangeVal || existingProfile?.budgetRange,
        decisionFactors: sanitized.decisionFactors as any,
        timeline: updatedTimeline,
        questions: sanitized.questions as any,
        constraints: sanitized.constraints as any,
        missingInformation: sanitized.missingInformation as any,
        isHighIntent: scoring.isHighIntent,
        qualificationCompleteness: scoring.completeness,
        qualificationStatus: scoring.status,
        recommendedNextAction: sanitized.recommendedNextAction,
        nextActionReason: sanitized.nextActionReason,
        aiConfidence: sanitized.confidence,
        aiEvidence: sanitized.evidence as any,
        aiSummary: sanitized.aiSummary,
        qualificationVersion: { increment: 1 },
        lastEvaluatedAt: new Date(),
      },
    });

    // 9. Persist newly extracted objections
    if (sanitized.objections && sanitized.objections.length > 0) {
      for (const obj of sanitized.objections) {
        if (obj.objectionType && obj.rawCustomerStatement && obj.normalizedSummary) {
          await this.objectionService.createObjection(
            organisationId,
            lead.id,
            {
              objectionType: obj.objectionType,
              severity: obj.severity,
              rawCustomerStatement: obj.rawCustomerStatement,
              normalizedSummary: obj.normalizedSummary,
            },
            'AI_SALES_AGENT',
          );
        }
      }
    }

    // 10. Update Lead score and status
    const newLeadStatus =
      scoring.status === 'QUALIFIED'
        ? 'QUALIFIED'
        : scoring.status === 'NEEDS_HUMAN_REVIEW'
        ? lead.status
        : lead.status === 'NEW'
        ? 'QUALIFYING'
        : lead.status;

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        score: Math.min(100, scoring.completeness),
        status: newLeadStatus,
        lastInteractionAt: new Date(),
      },
    });

    // 11. Record LeadActivity
    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        organisationId,
        activityType: 'QUALIFICATION_UPDATED',
        actorType: 'AI_SALES_AGENT',
        title: `Lead Qualification: ${scoring.status}`,
        description: `Completeness ${scoring.completeness}%. High Intent: ${scoring.isHighIntent}. Next action: ${sanitized.recommendedNextAction}`,
        metadata: {
          completeness: scoring.completeness,
          isHighIntent: scoring.isHighIntent,
          status: scoring.status,
          primaryGoal: sanitized.primaryGoal,
        },
      },
    });

    // 12. Day 37 Sales Pipeline Synchronization
    if (scoring.status === 'QUALIFIED') {
      await this.syncWithSalesPipeline(organisationId, lead.id, scoring.isHighIntent);
    }

    return this.getQualificationProfile(organisationId, lead.id);
  }

  /**
   * Staff manual override with strict audit history tracking.
   */
  async staffOverride(
    organisationId: string,
    leadId: string,
    dto: StaffOverrideQualificationDto,
    staffId: string,
  ): Promise<StaffLeadQualificationViewDto> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { qualificationProfile: true },
    });

    if (!lead || lead.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'LEAD_NOT_FOUND',
        message: `Lead ${leadId} not found in organisation ${organisationId}`,
      });
    }

    const existingProfile = lead.qualificationProfile;
    const goals = dto.primaryGoal
      ? [dto.primaryGoal, ...(dto.secondaryGoals || [])]
      : existingProfile?.goals;

    // Evaluate scoring
    const scoring = this.scoringService.evaluateQualification({
      primaryGoal: dto.primaryGoal || (Array.isArray(goals) ? (goals[0] as string) : undefined),
      serviceInterests: dto.serviceInterests || (existingProfile?.serviceInterests as string[]),
      preferredOutletId: dto.preferredOutletId || existingProfile?.preferredOutletId,
      preferredDays: dto.schedule?.preferredDays || (existingProfile?.preferredDays as string[]),
      preferredTimes: dto.schedule?.preferredTimes || (existingProfile?.preferredTimes as string[]),
      scheduleFlexibility: dto.schedule?.scheduleFlexibility || (existingProfile?.scheduleFlexibility as any),
      experienceLevel: dto.experienceLevel || existingProfile?.experienceLevel,
      readiness: dto.readiness || existingProfile?.readiness,
      budgetSensitivity: dto.budgetSensitivity || existingProfile?.budgetSensitivity,
      budgetRange: dto.budgetRange || existingProfile?.budgetRange,
      timeline: dto.timeline || existingProfile?.timeline,
      hasBlockerObjection: false,
    });

    // Record diffs
    const diffs = this.historyService.detectFieldChanges(existingProfile, {
      primaryGoal: dto.primaryGoal,
      experienceLevel: dto.experienceLevel,
      readiness: dto.readiness,
      budgetSensitivity: dto.budgetSensitivity,
      timeline: dto.timeline,
      qualificationStatus: dto.qualificationStatus || scoring.status,
    });

    if (diffs.length > 0) {
      await this.historyService.recordChanges({
        leadId: lead.id,
        profileId: existingProfile?.id,
        organisationId,
        actorType: 'STAFF',
        actorId: staffId,
        source: 'STAFF_ENTERED',
        reason: dto.overrideReason || 'Staff manual qualification adjustment',
        changes: diffs,
      });
    }

    // Persist with staff override markers
    await this.prisma.leadQualificationProfile.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
        goals: goals as any,
        serviceInterests: dto.serviceInterests as any,
        preferredOutletId: dto.preferredOutletId || lead.outletId,
        preferredDays: dto.schedule?.preferredDays as any,
        preferredTimes: dto.schedule?.preferredTimes as any,
        frequencyPreference: dto.schedule?.frequencyPreference,
        scheduleFlexibility: dto.schedule?.scheduleFlexibility,
        experienceLevel: dto.experienceLevel,
        readiness: dto.readiness,
        budgetSensitivity: dto.budgetSensitivity,
        budgetRange: dto.budgetRange,
        decisionFactors: dto.decisionFactors as any,
        timeline: dto.timeline,
        constraints: dto.constraints as any,
        qualificationStatus: dto.qualificationStatus || scoring.status,
        qualificationCompleteness: scoring.completeness,
        isHighIntent: scoring.isHighIntent,
        lastStaffOverrideAt: new Date(),
        lastStaffOverrideById: staffId,
      },
      update: {
        ...(dto.primaryGoal ? { goals: goals as any } : {}),
        ...(dto.serviceInterests ? { serviceInterests: dto.serviceInterests as any } : {}),
        ...(dto.preferredOutletId ? { preferredOutletId: dto.preferredOutletId } : {}),
        ...(dto.schedule?.preferredDays ? { preferredDays: dto.schedule.preferredDays as any } : {}),
        ...(dto.schedule?.preferredTimes ? { preferredTimes: dto.schedule.preferredTimes as any } : {}),
        ...(dto.schedule?.frequencyPreference ? { frequencyPreference: dto.schedule.frequencyPreference } : {}),
        ...(dto.schedule?.scheduleFlexibility ? { scheduleFlexibility: dto.schedule.scheduleFlexibility } : {}),
        ...(dto.experienceLevel ? { experienceLevel: dto.experienceLevel } : {}),
        ...(dto.readiness ? { readiness: dto.readiness } : {}),
        ...(dto.budgetSensitivity ? { budgetSensitivity: dto.budgetSensitivity } : {}),
        ...(dto.budgetRange ? { budgetRange: dto.budgetRange } : {}),
        ...(dto.decisionFactors ? { decisionFactors: dto.decisionFactors as any } : {}),
        ...(dto.timeline ? { timeline: dto.timeline } : {}),
        ...(dto.constraints ? { constraints: dto.constraints as any } : {}),
        qualificationStatus: dto.qualificationStatus || scoring.status,
        qualificationCompleteness: scoring.completeness,
        isHighIntent: scoring.isHighIntent,
        lastStaffOverrideAt: new Date(),
        lastStaffOverrideById: staffId,
        qualificationVersion: { increment: 1 },
      },
    });

    // Record lead activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        organisationId,
        activityType: 'QUALIFICATION_UPDATED',
        actorType: 'STAFF',
        actorId: staffId,
        title: 'Qualification Overridden by Staff',
        description: dto.overrideReason || 'Staff updated prospect qualification profile.',
      },
    });

    return this.getQualificationProfile(organisationId, lead.id);
  }

  /**
   * Retrieves complete qualification profile including objections and history.
   */
  async getQualificationProfile(
    organisationId: string,
    leadId: string,
  ): Promise<StaffLeadQualificationViewDto> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        qualificationProfile: true,
        outlet: true,
        assignedStaff: { select: { id: true, displayName: true } },
      },
    });

    if (!lead || lead.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'LEAD_NOT_FOUND',
        message: `Lead ${leadId} not found in organisation ${organisationId}`,
      });
    }

    const objections = await this.objectionService.findObjections(leadId);
    const history = await this.historyService.getLeadHistory(leadId);
    const profile = lead.qualificationProfile;

    const goalsArray = (Array.isArray(profile?.goals) ? profile?.goals : []) as string[];
    const primaryGoal = goalsArray[0] || 'UNKNOWN';
    const secondaryGoals = goalsArray.slice(1);

    return {
      leadId: lead.id,
      leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Prospect',
      leadEmail: lead.email,
      leadPhone: lead.phone,
      leadStatus: lead.status as any,
      leadScore: lead.score,
      outletName: lead.outlet?.name,
      assignedStaffName: lead.assignedStaff?.displayName || undefined,
      profile: {
        id: profile?.id || '',
        leadId: lead.id,
        primaryGoal: primaryGoal as any,
        secondaryGoals,
        serviceInterests: (profile?.serviceInterests as string[]) || [],
        preferredOutletId: profile?.preferredOutletId || lead.outletId || undefined,
        preferredOutletName: lead.outlet?.name,
        preferredSchedule: profile?.preferredSchedule || undefined,
        preferredDays: (profile?.preferredDays as string[]) || [],
        preferredTimes: (profile?.preferredTimes as string[]) || [],
        frequencyPreference: profile?.frequencyPreference || undefined,
        scheduleFlexibility: (profile?.scheduleFlexibility as any) || 'UNKNOWN',
        experienceLevel: (profile?.experienceLevel as any) || 'UNKNOWN',
        readiness: (profile?.readiness as any) || 'UNKNOWN',
        budgetSensitivity: (profile?.budgetSensitivity as any) || 'UNKNOWN',
        budgetRange: profile?.budgetRange || undefined,
        objections: objections.map((o) => ({
          id: o.id,
          objectionType: o.objectionType as any,
          status: o.status as any,
          severity: o.severity as any,
          rawCustomerStatement: o.rawCustomerStatement,
          normalizedSummary: o.normalizedSummary,
          resolutionNotes: o.resolutionNotes || undefined,
          addressedAt: o.addressedAt?.toISOString(),
          resolvedAt: o.resolvedAt?.toISOString(),
        })),
        decisionFactors: (profile?.decisionFactors as any[]) || [],
        timeline: (profile?.timeline as any) || 'UNKNOWN',
        questions: (profile?.questions as any[]) || [],
        constraints: (profile?.constraints as string[]) || [],
        missingInformation: (profile?.missingInformation as string[]) || [],
        isHighIntent: profile?.isHighIntent ?? false,
        qualificationCompleteness: profile?.qualificationCompleteness ?? 0,
        qualificationStatus: (profile?.qualificationStatus as any) || 'NOT_STARTED',
        recommendedNextAction: (profile?.recommendedNextAction as any) || 'ASK_QUALIFICATION_QUESTION',
        nextActionReason: profile?.nextActionReason || undefined,
        aiConfidence: profile?.aiConfidence || 0.8,
        aiEvidence: (profile?.aiEvidence as any[]) || [],
        aiSummary: profile?.aiSummary || undefined,
        lastEvaluatedAt: profile?.lastEvaluatedAt?.toISOString(),
        lastStaffOverrideAt: profile?.lastStaffOverrideAt?.toISOString(),
        lastStaffOverrideById: profile?.lastStaffOverrideById || undefined,
        createdAt: profile?.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: profile?.updatedAt?.toISOString() || new Date().toISOString(),
      },
      objections: objections.map((o) => ({
        id: o.id,
        leadId: o.leadId,
        objectionType: o.objectionType as any,
        status: o.status as any,
        severity: o.severity as any,
        rawCustomerStatement: o.rawCustomerStatement,
        normalizedSummary: o.normalizedSummary,
        resolutionNotes: o.resolutionNotes || undefined,
        addressedAt: o.addressedAt?.toISOString(),
        resolvedAt: o.resolvedAt?.toISOString(),
        createdAt: o.createdAt.toISOString(),
      })),
      history: history.map((h) => ({
        id: h.id,
        leadId: h.leadId,
        fieldChanged: h.fieldChanged,
        previousValue: h.previousValue,
        newValue: h.newValue,
        actorType: h.actorType as QualificationActorType,
        actorId: h.actorId || undefined,
        source: h.source as any,
        evidence: h.evidence || undefined,
        reason: h.reason || undefined,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Generates prioritized discovery questions for the lead.
   */
  async getDiscoveryQuestions(
    organisationId: string,
    leadId: string,
    dto?: GenerateDiscoveryQuestionsDto,
  ): Promise<SmartDiscoveryQuestionDto[]> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { qualificationProfile: true },
    });

    if (!lead || lead.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'LEAD_NOT_FOUND',
        message: `Lead ${leadId} not found in organisation ${organisationId}`,
      });
    }

    const profile = lead.qualificationProfile;
    const goalsArray = (Array.isArray(profile?.goals) ? profile?.goals : []) as string[];

    return this.questionService.generateQuestions({
      primaryGoal: goalsArray[0] || undefined,
      serviceInterests: (profile?.serviceInterests as string[]) || undefined,
      preferredSchedule: profile?.preferredSchedule || undefined,
      preferredDays: (profile?.preferredDays as string[]) || undefined,
      preferredTimes: (profile?.preferredTimes as string[]) || undefined,
      preferredOutletId: profile?.preferredOutletId || lead.outletId || undefined,
      experienceLevel: profile?.experienceLevel || undefined,
      budgetSensitivity: profile?.budgetSensitivity || undefined,
      readiness: profile?.readiness || undefined,
      timeline: profile?.timeline || undefined,
      language: dto?.language || lead.preferredLanguage || 'en',
      limit: dto?.limit || 2,
    });
  }

  /**
   * Synchronizes with Day 37 Sales Pipeline when lead is qualified.
   */
  private async syncWithSalesPipeline(
    organisationId: string,
    leadId: string,
    isHighIntent: boolean,
  ): Promise<void> {
    try {
      const opportunity = await this.prisma.salesOpportunity.findFirst({
        where: { organisationId, leadId, currentStage: { notIn: ['CONVERTED', 'LOST'] } },
        orderBy: { createdAt: 'desc' },
      });

      if (opportunity) {
        const currentStage = await this.prisma.salesPipelineStage.findUnique({
          where: { id: opportunity.stageId },
        });

        if (currentStage && (currentStage.type === 'NEW' || currentStage.type === 'CONTACTED')) {
          const qualifiedStage = await this.prisma.salesPipelineStage.findFirst({
            where: { pipelineId: opportunity.pipelineId, type: 'QUALIFIED' },
          });

          if (qualifiedStage) {
            await this.prisma.salesOpportunity.update({
              where: { id: opportunity.id },
              data: {
                stageId: qualifiedStage.id,
                currentStage: 'QUALIFIED',
                stageEnteredAt: new Date(),
                probability: isHighIntent ? 0.7 : 0.4,
              },
            });

            await this.prisma.salesActivity.create({
              data: {
                organisationId,
                opportunityId: opportunity.id,
                leadId,
                type: 'STAGE_CHANGE',
                title: 'Opportunity Stage Advanced to Qualified',
                summary: `AI Lead Qualification completed. High intent: ${isHighIntent}.`,
                actorType: 'AI',
              },
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to sync sales pipeline for lead ${leadId}: ${err.message}`);
    }
  }
}
