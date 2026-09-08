import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AIOrchestratorService } from '../../../orchestrator/ai-orchestrator.service';
import { AIAuditService } from '../../../services/ai-audit.service';
import { DailyCheckInScoringService } from './daily-checkin-scoring.service';
import { DailyCheckInSafetyService } from './daily-checkin-safety.service';
import { DailyCheckInContextService } from './daily-checkin-context.service';
import { DailyCheckInSummaryService } from './daily-checkin-summary.service';
import { DailyCheckInRecommendationService } from './daily-checkin-recommendation.service';
import { SubmitDailyCheckInDto } from '../dto/submit-daily-checkin.dto';
import { CreateDailyCheckInDto } from '../dto/create-daily-checkin.dto';
import { DailyCheckInFeedbackDto } from '../dto/daily-checkin-feedback.dto';
import { UpdateDailyCheckInSettingsDto } from '../dto/daily-checkin-settings.dto';
import {
  DailyCheckInDto,
  DailyCheckInResponse,
  DailyCheckInPrivacyViewDto,
  TrainerClientDailyCheckInSummaryDto,
  DailyCheckInSettingsDto,
} from '@fitcore/types';
import {
  DAILY_CHECKIN_FEATURE,
  DAILY_CHECKIN_PROMPT_KEY,
} from '../domain/daily-checkin.constants';

@Injectable()
export class DailyCheckInService {
  private readonly logger = new Logger(DailyCheckInService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AIOrchestratorService,
    private readonly auditService: AIAuditService,
    private readonly scoringService: DailyCheckInScoringService,
    private readonly safetyService: DailyCheckInSafetyService,
    private readonly contextService: DailyCheckInContextService,
    private readonly summaryService: DailyCheckInSummaryService,
    private readonly recommendationService: DailyCheckInRecommendationService,
  ) {}

  /**
   * Starts a daily check-in for the member for the specified (or current) local day.
   * Enforces one active/completed check-in per member per calendar day.
   */
  async startCheckIn(
    memberId: string,
    organisationId: string,
    dto?: CreateDailyCheckInDto,
  ): Promise<DailyCheckInDto> {
    await this.verifyMemberTenant(memberId, organisationId);

    const checkInDate = this.resolveDate(dto?.date);

    // Look for existing check-in for this calendar date
    const existing = await this.prisma.dailyCheckIn.findUnique({
      where: {
        memberId_checkInDate: {
          memberId,
          checkInDate,
        },
      },
    });

    if (existing) {
      return this.mapToDto(existing);
    }

    // Create new PENDING check-in
    const created = await this.prisma.dailyCheckIn.create({
      data: {
        organisationId,
        memberId,
        checkInDate,
        status: 'PENDING',
      },
    });

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });
    if (member?.userId) {
      await this.auditService.recordAuditEvent({
        organisationId,
        userId: member.userId,
        feature: DAILY_CHECKIN_FEATURE,
        eventType: 'DAILY_CHECKIN_STARTED',
        result: 'SUCCESS',
        metadata: { checkInId: created.id, date: checkInDate.toISOString() },
      });
    }

    return this.mapToDto(created);
  }

  /**
   * Submits member responses, computes deterministic readiness, evaluates safety,
   * gathers authorized context, and generates structured AI daily intelligence.
   */
  async submitCheckIn(
    memberId: string,
    organisationId: string,
    dto: SubmitDailyCheckInDto,
    idempotencyKey?: string,
  ): Promise<DailyCheckInDto> {
    await this.verifyMemberTenant(memberId, organisationId);

    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberId, organisationId },
      include: { user: true },
    });

    // 1. Idempotency handling
    if (idempotencyKey) {
      const existingByIdempotency = await this.prisma.dailyCheckIn.findFirst({
        where: {
          organisationId,
          memberId,
          idempotencyKey,
        },
      });

      if (existingByIdempotency) {
        this.logger.log(`Returning idempotent check-in result for key '${idempotencyKey}'`);
        return this.mapToDto(existingByIdempotency);
      }
    }

    const checkInDate = this.resolveDate();

    // 2. Deterministic Fitness Readiness Calculation (v1.0)
    const readiness = this.scoringService.calculateReadiness({
      energyLevel: dto.energyLevel,
      sleepQuality: dto.sleepQuality,
      sleepDurationMinutes: dto.sleepDurationMinutes,
      sorenessLevel: dto.sorenessLevel,
      stressLevel: dto.stressLevel,
      motivationLevel: dto.motivationLevel,
    });

    // 3. Health & Safety Evaluation
    const safetyResult = await this.safetyService.evaluateCheckIn({
      organisationId,
      memberId,
      sorenessLevel: dto.sorenessLevel,
      notes: dto.notes,
    });

    const isUrgent = safetyResult.severity === 'URGENT_ESCALATION';
    const isCaution = safetyResult.severity === 'CAUTION';
    const safetyFlagged = isUrgent || isCaution;

    let aiOutput: DailyCheckInResponse;

    // 4. Handle Emergency / Red-Flag Intervention (Do not call LLM if acute emergency is detected)
    if (isUrgent && safetyResult.safeResponse) {
      this.logger.warn(`Emergency safety red flag triggered for member '${memberId}'`);

      aiOutput = {
        summary: safetyResult.safeResponse.summary,
        checkInInterpretation:
          'You reported symptoms requiring immediate clinical evaluation. Normal training guidance has been suspended.',
        readinessFraming:
          'FitCore planning indicator: Paused. Physical exertion is currently not advised.',
        todayFocus: 'Seek medical evaluation and prioritize acute health and recovery.',
        recommendations: [
          {
            type: 'RECOVERY',
            title: 'Halt Exercise & Rest',
            explanation:
              'Do not perform any scheduled workout or strenuous activity while acute symptoms are present.',
            priority: 'HIGH',
            relatedDomain: 'WELLNESS',
          },
        ],
        caution: safetyResult.safeResponse.caution,
        escalation: {
          severity: 'URGENT_ESCALATION',
          category: (safetyResult.category as any) || 'MEDICAL_SYMPTOM',
          guidance: safetyResult.safeResponse.guidance,
          helplineOrReferral: safetyResult.safeResponse.helplineOrReferral,
        },
        suggestedNextAction: 'Consult a qualified healthcare professional or emergency services.',
        coachHandoff: { recommendedCoach: 'NONE' },
        sourceSummary: {
          used: ['Self-reported check-in answers'],
          excluded: ['Workouts', 'Nutrition logs', 'Payment records'],
        },
      };

      await this.auditService.recordAuditEvent({
        organisationId,
        userId: member?.userId || memberId,
        feature: DAILY_CHECKIN_FEATURE,
        eventType: 'DAILY_CHECKIN_SAFETY_TRIGGERED',
        result: 'BLOCKED',
        metadata: { category: safetyResult.category, triggerPhrase: safetyResult.triggerPhrase },
      });
    } else {
      // 5. Gather Authorized Context
      const context = await this.contextService.buildContext({
        organisationId,
        memberId,
        dateStr: checkInDate.toISOString().split('T')[0],
        timezone: dto.timezone || 'Australia/Perth',
        dto,
        readiness,
        safetyFlagged,
        safetyCategory: safetyResult.category,
      });

      // 6. Invoke AI Orchestrator with structured output
      try {
        const userMessageContent = JSON.stringify({
          checkInDate: checkInDate.toISOString().split('T')[0],
          memberResponses: {
            energyLevel: dto.energyLevel,
            wellbeingMood: dto.wellbeingMood,
            sleepQuality: dto.sleepQuality,
            sleepDurationMinutes: dto.sleepDurationMinutes,
            sorenessLevel: dto.sorenessLevel,
            stressLevel: dto.stressLevel,
            motivationLevel: dto.motivationLevel,
            yesterdayWorkoutCompleted: dto.yesterdayWorkoutCompleted,
            notes: dto.notes ? dto.notes.trim() : undefined,
          },
          deterministicReadinessScore: readiness.score,
          readinessCategory: readiness.category,
          contextSnapshot: {
            todayWorkout: context.trainingSummary.todayWorkout,
            hasActivePlan: context.trainingSummary.hasActivePlan,
            isTrainerAssigned: context.trainingSummary.isTrainerAssigned,
            recentWorkoutsCount: context.trainingSummary.recentWorkoutsCount,
            nutritionAuthorized: context.nutritionSummary.isAuthorized,
            todayNutritionLogged: context.nutritionSummary.hasLoggedToday,
            attendanceStreak: context.attendanceSummary.currentStreak,
            detectedTrends: context.previousCheckInSummary.detectedTrends,
          },
        });

        const user: any = {
          id: member?.userId || memberId,
          email: member?.user?.email || '',
          firstName: member?.user?.firstName || 'Member',
          lastName: member?.user?.lastName || '',
          isSuperAdmin: false,
          roles: [{ role: 'MEMBER', organisationId }],
        };

        const aiResponse = await this.orchestrator.execute({
          feature: DAILY_CHECKIN_FEATURE,
          prompt: userMessageContent,
          organisationId,
          user,
          memberId,
          promptKey: DAILY_CHECKIN_PROMPT_KEY,
          responseFormat: 'json',
        });

        if (aiResponse.structuredOutput) {
          aiOutput = aiResponse.structuredOutput as DailyCheckInResponse;
        } else {
          aiOutput = this.buildFallbackResponse(context, readiness, safetyResult);
        }
      } catch (err: any) {
        this.logger.error(`AI generation failed for daily check-in: ${err.message}. Using graceful fallback.`);
        aiOutput = this.buildFallbackResponse(context, readiness, safetyResult);
      }
    }

    // 7. Persist to Database (Upsert or Update existing record)
    const completedAt = new Date();

    const record = await this.prisma.dailyCheckIn.upsert({
      where: {
        memberId_checkInDate: {
          memberId,
          checkInDate,
        },
      },
      create: {
        organisationId,
        memberId,
        checkInDate,
        status: 'COMPLETED',
        completedAt,
        energyLevel: dto.energyLevel,
        wellbeingMood: dto.wellbeingMood,
        sleepQuality: dto.sleepQuality,
        sleepDurationMinutes: dto.sleepDurationMinutes,
        sorenessLevel: dto.sorenessLevel,
        stressLevel: dto.stressLevel,
        motivationLevel: dto.motivationLevel,
        yesterdayWorkoutCompleted: dto.yesterdayWorkoutCompleted,
        notes: dto.notes ? dto.notes.trim() : null,
        readinessScore: readiness.score,
        readinessCategory: readiness.category,
        aiSummary: aiOutput.summary,
        aiCheckInInterpretation: aiOutput.checkInInterpretation,
        aiReadinessFraming: aiOutput.readinessFraming,
        aiTodayFocus: aiOutput.todayFocus,
        aiRecommendations: aiOutput.recommendations as any,
        aiCaution: aiOutput.caution || (safetyResult.safeResponse?.caution ?? null),
        aiEscalation: aiOutput.escalation as any,
        safetyFlagged,
        safetyCategory: safetyResult.category ?? null,
        suggestedNextAction: aiOutput.suggestedNextAction ?? null,
        sourceSummary: (aiOutput.sourceSummary || this.getDefaultSourceSummary()) as any,
        idempotencyKey: idempotencyKey ?? null,
      },
      update: {
        status: 'COMPLETED',
        completedAt,
        energyLevel: dto.energyLevel,
        wellbeingMood: dto.wellbeingMood,
        sleepQuality: dto.sleepQuality,
        sleepDurationMinutes: dto.sleepDurationMinutes,
        sorenessLevel: dto.sorenessLevel,
        stressLevel: dto.stressLevel,
        motivationLevel: dto.motivationLevel,
        yesterdayWorkoutCompleted: dto.yesterdayWorkoutCompleted,
        notes: dto.notes ? dto.notes.trim() : null,
        readinessScore: readiness.score,
        readinessCategory: readiness.category,
        aiSummary: aiOutput.summary,
        aiCheckInInterpretation: aiOutput.checkInInterpretation,
        aiReadinessFraming: aiOutput.readinessFraming,
        aiTodayFocus: aiOutput.todayFocus,
        aiRecommendations: aiOutput.recommendations as any,
        aiCaution: aiOutput.caution || (safetyResult.safeResponse?.caution ?? null),
        aiEscalation: aiOutput.escalation as any,
        safetyFlagged,
        safetyCategory: safetyResult.category ?? null,
        suggestedNextAction: aiOutput.suggestedNextAction ?? null,
        sourceSummary: (aiOutput.sourceSummary || this.getDefaultSourceSummary()) as any,
        idempotencyKey: idempotencyKey ?? null,
      },
    });

    // 8. Audit event
    await this.auditService.recordAuditEvent({
      organisationId,
      userId: member?.userId || memberId,
      feature: DAILY_CHECKIN_FEATURE,
      eventType: 'DAILY_CHECKIN_COMPLETED',
      result: 'SUCCESS',
      metadata: {
        checkInId: record.id,
        score: readiness.score,
        category: readiness.category,
        safetyFlagged,
      },
    });

    return this.mapToDto(record, readiness);
  }

  /**
   * Retrieves today's check-in for the member if it exists.
   */
  async getTodayCheckIn(
    memberId: string,
    organisationId: string,
    dateStr?: string,
  ): Promise<DailyCheckInDto | null> {
    await this.verifyMemberTenant(memberId, organisationId);

    const checkInDate = this.resolveDate(dateStr);

    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: {
        memberId_checkInDate: {
          memberId,
          checkInDate,
        },
      },
    });

    if (!checkIn) {
      return null;
    }

    return this.mapToDto(checkIn);
  }

  /**
   * Retrieves check-in history for the member.
   */
  async getCheckInHistory(
    memberId: string,
    organisationId: string,
    limit: number = 14,
    offset: number = 0,
  ): Promise<{ items: any[]; total: number; detectedTrends: string[] }> {
    await this.verifyMemberTenant(memberId, organisationId);

    const [items, total, detectedTrends] = await Promise.all([
      this.prisma.dailyCheckIn.findMany({
        where: { memberId, organisationId },
        orderBy: { checkInDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.dailyCheckIn.count({
        where: { memberId, organisationId },
      }),
      this.summaryService.detectTrends(memberId, limit),
    ]);

    return {
      items: items.map((it) => ({
        id: it.id,
        checkInDate: it.checkInDate.toISOString().split('T')[0],
        status: it.status,
        readinessScore: it.readinessScore,
        readinessCategory: it.readinessCategory,
        energyLevel: it.energyLevel,
        sorenessLevel: it.sorenessLevel,
        completedAt: it.completedAt ? it.completedAt.toISOString() : null,
        todayFocus: it.aiTodayFocus,
        safetyFlagged: it.safetyFlagged,
      })),
      total,
      detectedTrends,
    };
  }

  /**
   * Retrieves a specific check-in record by ID with tenant & member ownership check.
   */
  async getCheckInById(id: string, memberId: string, organisationId: string): Promise<DailyCheckInDto> {
    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: { id },
    });

    if (!checkIn) {
      throw new NotFoundException(`Daily check-in with ID '${id}' not found.`);
    }

    if (checkIn.organisationId !== organisationId || checkIn.memberId !== memberId) {
      throw new ForbiddenException('Access denied to daily check-in record.');
    }

    return this.mapToDto(checkIn);
  }

  /**
   * Re-evaluates AI daily intelligence for an existing completed check-in.
   */
  async regenerateCheckIn(id: string, memberId: string, organisationId: string): Promise<DailyCheckInDto> {
    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: { id },
    });

    if (!checkIn) {
      throw new NotFoundException(`Daily check-in with ID '${id}' not found.`);
    }

    if (checkIn.organisationId !== organisationId || checkIn.memberId !== memberId) {
      throw new ForbiddenException('Access denied to daily check-in record.');
    }

    if (!checkIn.energyLevel || !checkIn.sorenessLevel) {
      throw new BadRequestException('Cannot regenerate incomplete check-in.');
    }

    const readiness = this.scoringService.calculateReadiness({
      energyLevel: checkIn.energyLevel as any,
      sleepQuality: (checkIn.sleepQuality as any) || 'FAIR',
      sleepDurationMinutes: checkIn.sleepDurationMinutes ?? undefined,
      sorenessLevel: checkIn.sorenessLevel as any,
      stressLevel: (checkIn.stressLevel as any) || 'LOW',
      motivationLevel: (checkIn.motivationLevel as any) || 'MODERATE',
    });

    const context = await this.contextService.buildContext({
      organisationId,
      memberId,
      dateStr: checkIn.checkInDate.toISOString().split('T')[0],
      timezone: 'Australia/Perth',
      dto: {
        energyLevel: checkIn.energyLevel as any,
        wellbeingMood: (checkIn.wellbeingMood as any) || 'GOOD',
        sleepQuality: (checkIn.sleepQuality as any) || 'FAIR',
        sleepDurationMinutes: checkIn.sleepDurationMinutes ?? undefined,
        sorenessLevel: checkIn.sorenessLevel as any,
        stressLevel: (checkIn.stressLevel as any) || 'LOW',
        motivationLevel: (checkIn.motivationLevel as any) || 'MODERATE',
        yesterdayWorkoutCompleted: checkIn.yesterdayWorkoutCompleted ?? undefined,
        notes: checkIn.notes ?? undefined,
      },
      readiness,
      safetyFlagged: checkIn.safetyFlagged,
      safetyCategory: checkIn.safetyCategory ?? undefined,
    });

    const aiOutput = this.buildFallbackResponse(context, readiness, {
      isSafeToProceed: !checkIn.safetyFlagged,
      actionTaken: 'REGENERATION',
    });

    const updated = await this.prisma.dailyCheckIn.update({
      where: { id },
      data: {
        aiSummary: aiOutput.summary,
        aiCheckInInterpretation: aiOutput.checkInInterpretation,
        aiReadinessFraming: aiOutput.readinessFraming,
        aiTodayFocus: aiOutput.todayFocus,
        aiRecommendations: aiOutput.recommendations as any,
        aiCaution: aiOutput.caution,
      },
    });

    return this.mapToDto(updated, readiness);
  }

  /**
   * Records member feedback on a check-in.
   */
  async submitFeedback(
    id: string,
    memberId: string,
    organisationId: string,
    dto: DailyCheckInFeedbackDto,
  ): Promise<{ success: boolean; message: string }> {
    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: { id },
    });

    if (!checkIn) {
      throw new NotFoundException(`Daily check-in with ID '${id}' not found.`);
    }

    if (checkIn.organisationId !== organisationId || checkIn.memberId !== memberId) {
      throw new ForbiddenException('Access denied to daily check-in record.');
    }

    await this.prisma.dailyCheckIn.update({
      where: { id },
      data: {
        feedbackRating: dto.rating,
        feedbackComment: dto.comment,
      },
    });

    // Log feedback via audit service
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });
    if (member?.userId) {
      await this.auditService.recordAuditEvent({
        organisationId,
        userId: member.userId,
        feature: DAILY_CHECKIN_FEATURE,
        eventType: 'DAILY_CHECKIN_FEEDBACK_SUBMITTED',
        result: 'SUCCESS',
        metadata: {
          checkInId: id,
          rating: dto.rating,
          hasComment: !!dto.comment,
        },
      });
    }

    return { success: true, message: 'Thank you for your feedback!' };
  }

  /**
   * Transparent member privacy view: details which authorized sources were utilized vs excluded.
   */
  async getPrivacyView(
    id: string,
    memberId: string,
    organisationId: string,
  ): Promise<DailyCheckInPrivacyViewDto> {
    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: { id },
    });

    if (!checkIn) {
      throw new NotFoundException(`Daily check-in with ID '${id}' not found.`);
    }

    if (checkIn.organisationId !== organisationId || checkIn.memberId !== memberId) {
      throw new ForbiddenException('Access denied to daily check-in record.');
    }

    const defaultSources = this.getDefaultSourceSummary();
    const sourceSummary = (checkIn.sourceSummary as any) || defaultSources;

    return {
      checkInId: checkIn.id,
      memberId: checkIn.memberId,
      date: checkIn.checkInDate.toISOString().split('T')[0],
      dataSourcesUsed: sourceSummary.used || defaultSources.used,
      dataSourcesExcluded: sourceSummary.excluded || defaultSources.excluded,
      explanation:
        'FitCore Daily Intelligence synthesizes authorized fitness data to guide your daily training focus. Personal financial, private messaging, and clinical records are never accessed.',
      dataRetentionPolicy:
        'Daily check-in insights are retained in accordance with FitCore platform privacy standards and member profile deletion policies.',
      trainerVisibilityScope:
        'Assigned personal trainers receive summarized readiness indicators only; raw text notes are never exposed.',
      consentStatus: 'ACTIVE (AI_PROCESSING consent accepted)',
    };
  }

  /**
   * Scoped trainer overview of a client's daily check-in.
   * Strictly enforces active TrainerClientAssignment. Exposes summarized signals only.
   */
  async getTrainerClientSummary(
    memberId: string,
    trainerUserId: string,
    organisationId: string,
  ): Promise<TrainerClientDailyCheckInSummaryDto> {
    // 1. Verify trainer assignment
    const trainerProfile = await this.prisma.trainerProfile.findFirst({
      where: {
        organisationId,
        staffProfile: { userId: trainerUserId },
      },
    });

    if (!trainerProfile) {
      throw new ForbiddenException('User is not a registered trainer in this organisation.');
    }

    const assignment = await this.prisma.trainerClientAssignment.findFirst({
      where: {
        trainerProfileId: trainerProfile.id,
        memberProfileId: memberId,
        organisationId,
        status: 'ACTIVE',
      },
      include: {
        memberProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Trainer is not assigned to coach this member.');
    }

    // 2. Fetch latest check-in
    const latestCheckIn = await this.prisma.dailyCheckIn.findFirst({
      where: { memberId, organisationId },
      orderBy: { checkInDate: 'desc' },
    });

    const clientName = `${assignment.memberProfile.user.firstName} ${assignment.memberProfile.user.lastName}`;

    if (!latestCheckIn) {
      return {
        memberId,
        clientName,
        status: 'PENDING',
        safetyFlagged: false,
        trainerNoteGuidance: 'Client has not completed any daily check-ins yet.',
      };
    }

    // Summarized coaching guidance for the trainer
    let guidance = 'Client readiness is normal. Proceed with scheduled training.';
    if (latestCheckIn.safetyFlagged) {
      guidance = 'Client reported acute symptoms or high soreness. Check in with them before training.';
    } else if (latestCheckIn.sorenessLevel === 'HIGH' || latestCheckIn.sorenessLevel === 'VERY_HIGH') {
      guidance = 'Client reported elevated muscular soreness. Consider moderating working sets or load.';
    }

    return {
      memberId,
      clientName,
      latestCheckInDate: latestCheckIn.checkInDate.toISOString().split('T')[0],
      status: latestCheckIn.status as any,
      readinessCategory: latestCheckIn.readinessCategory as any,
      reportedSoreness: latestCheckIn.sorenessLevel as any,
      reportedEnergy: latestCheckIn.energyLevel as any,
      yesterdayWorkoutCompleted: latestCheckIn.yesterdayWorkoutCompleted ?? undefined,
      trainerNoteGuidance: guidance,
      safetyFlagged: latestCheckIn.safetyFlagged,
    };
  }

  /**
   * Retrieves member or organisation check-in settings.
   */
  async getSettings(memberId: string, organisationId: string): Promise<DailyCheckInSettingsDto> {
    const memberSetting = await this.prisma.dailyCheckInSetting.findUnique({
      where: { memberId },
    });

    if (memberSetting) {
      return {
        id: memberSetting.id,
        organisationId: memberSetting.organisationId,
        memberId: memberSetting.memberId,
        checkInEnabled: memberSetting.checkInEnabled,
        reminderEnabled: memberSetting.reminderEnabled,
        reminderTime: memberSetting.reminderTime,
        trainerVisibility: memberSetting.trainerVisibility as any,
        availableQuestions: memberSetting.availableQuestions as any,
      };
    }

    // Fallback to default
    return {
      organisationId,
      memberId,
      checkInEnabled: true,
      reminderEnabled: true,
      reminderTime: '08:00',
      trainerVisibility: 'SUMMARIZED',
    };
  }

  /**
   * Updates check-in settings for member.
   */
  async updateSettings(
    memberId: string,
    organisationId: string,
    dto: UpdateDailyCheckInSettingsDto,
  ): Promise<DailyCheckInSettingsDto> {
    await this.verifyMemberTenant(memberId, organisationId);

    const setting = await this.prisma.dailyCheckInSetting.upsert({
      where: { memberId },
      create: {
        organisationId,
        memberId,
        checkInEnabled: dto.checkInEnabled ?? true,
        reminderEnabled: dto.reminderEnabled ?? true,
        reminderTime: dto.reminderTime ?? '08:00',
        trainerVisibility: dto.trainerVisibility ?? 'SUMMARIZED',
      },
      update: {
        checkInEnabled: dto.checkInEnabled,
        reminderEnabled: dto.reminderEnabled,
        reminderTime: dto.reminderTime,
        trainerVisibility: dto.trainerVisibility,
      },
    });

    return {
      id: setting.id,
      organisationId: setting.organisationId,
      memberId: setting.memberId,
      checkInEnabled: setting.checkInEnabled,
      reminderEnabled: setting.reminderEnabled,
      reminderTime: setting.reminderTime,
      trainerVisibility: setting.trainerVisibility as any,
    };
  }

  // Helper: Verify member exists and belongs to the given organisation
  private async verifyMemberTenant(memberId: string, organisationId: string): Promise<void> {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberId, organisationId },
      select: { id: true },
    });

    if (!member) {
      throw new ForbiddenException(`Member does not belong to organisation '${organisationId}'.`);
    }
  }

  // Helper: Normalizes a calendar date string (YYYY-MM-DD) or current date to midnight UTC
  private resolveDate(dateStr?: string): Date {
    if (dateStr) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  }

  // Helper: Fallback response generator when AI provider is degraded or unavailable
  private buildFallbackResponse(context: any, readiness: any, safetyResult: any): DailyCheckInResponse {
    const recommendations = this.recommendationService.generateGroundedRecommendations(context);

    let summary = 'Your daily check-in was saved successfully. Your responses support a focused and steady training day.';
    if (readiness.category === 'RECOVERY_FOCUSED') {
      summary = 'Your check-in indicates higher fatigue or soreness today. Prioritizing active recovery and mobility is recommended.';
    } else if (readiness.category === 'OPTIMAL') {
      summary = 'Your reported energy and sleep levels are high. Today is an optimal day for completing your planned workout.';
    }

    const coachHandoff =
      context.currentCheckInResponses.sorenessLevel === 'HIGH' ||
      context.currentCheckInResponses.sorenessLevel === 'VERY_HIGH'
        ? {
            recommendedCoach: 'FITNESS_COACH' as const,
            reason: 'Assistance with exercise adjustments for elevated soreness',
            suggestedPrompt: 'How should I modify today\'s exercises for sore muscles?',
          }
        : { recommendedCoach: 'NONE' as const };

    return {
      summary,
      checkInInterpretation:
        'Your daily signals have been evaluated against your training schedule and readiness formula.',
      readinessFraming: readiness.description,
      todayFocus: context.trainingSummary.todayWorkout
        ? `Execute: ${context.trainingSummary.todayWorkout.title}`
        : 'Maintain planned nutrition targets and consistency.',
      recommendations,
      caution: safetyResult.safeResponse?.caution,
      suggestedNextAction: 'Review your scheduled workout and stay hydrated throughout the day.',
      coachHandoff,
      sourceSummary: this.getDefaultSourceSummary(),
    };
  }

  private getDefaultSourceSummary() {
    return {
      used: [
        'Today\'s Check-In Responses',
        'Active Training Plan & Scheduled Workouts',
        'Recent Workout Adherence',
        'Active Goals',
        'Daily Nutrition Summary',
      ],
      excluded: [
        'Payment & Financial Information',
        'Private Trainer Staff Notes',
        'Medical Records & Diagnoses',
      ],
    };
  }

  private mapToDto(record: any, readinessDetails?: any): DailyCheckInDto {
    return {
      id: record.id,
      organisationId: record.organisationId,
      memberId: record.memberId,
      checkInDate: record.checkInDate.toISOString().split('T')[0],
      status: record.status,
      completedAt: record.completedAt ? record.completedAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      energyLevel: record.energyLevel,
      wellbeingMood: record.wellbeingMood,
      sleepQuality: record.sleepQuality,
      sleepDurationMinutes: record.sleepDurationMinutes,
      sorenessLevel: record.sorenessLevel,
      stressLevel: record.stressLevel,
      motivationLevel: record.motivationLevel,
      yesterdayWorkoutCompleted: record.yesterdayWorkoutCompleted,
      notes: record.notes,
      readinessScore: record.readinessScore,
      readinessCategory: record.readinessCategory,
      readinessDetails: readinessDetails ?? undefined,
      aiSummary: record.aiSummary,
      aiCheckInInterpretation: record.aiCheckInInterpretation,
      aiReadinessFraming: record.aiReadinessFraming,
      aiTodayFocus: record.aiTodayFocus,
      aiRecommendations: record.aiRecommendations,
      aiCaution: record.aiCaution,
      aiEscalation: record.aiEscalation,
      safetyFlagged: record.safetyFlagged,
      suggestedNextAction: record.suggestedNextAction,
      sourceSummary: record.sourceSummary,
      feedbackRating: record.feedbackRating,
      feedbackComment: record.feedbackComment,
      todayFocus: record.aiTodayFocus,
    };
  }
}
