import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AIContextPermissionService } from '../../../context/ai-context-permission.service';
import { DailyCheckInSummaryService } from './daily-checkin-summary.service';
import {
  DailyCheckInAIContext,
  DailyFitnessScoreResult,
} from '../domain/daily-checkin.types';
import { SubmitDailyCheckInDto } from '../dto/submit-daily-checkin.dto';

@Injectable()
export class DailyCheckInContextService {
  private readonly logger = new Logger(DailyCheckInContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: AIContextPermissionService,
    private readonly summaryService: DailyCheckInSummaryService,
  ) {}

  /**
   * Builds the controlled internal DailyCheckInAIContext object.
   * Only gathers authorized context; strictly excludes payment and medical data.
   */
  async buildContext(params: {
    organisationId: string;
    memberId: string;
    dateStr: string;
    timezone: string;
    dto: SubmitDailyCheckInDto;
    readiness: DailyFitnessScoreResult;
    safetyFlagged: boolean;
    safetyCategory?: string;
  }): Promise<DailyCheckInAIContext> {
    const { organisationId, memberId, dateStr, timezone, dto, readiness, safetyFlagged, safetyCategory } = params;

    // 1. Member Profile & Preferences
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberId, organisationId },
      include: {
        user: { select: { email: true, firstName: true } },
      },
    });

    const coachProfile = await this.prisma.aIFitnessCoachProfile.findUnique({
      where: { memberId },
    });

    const unitPreference = coachProfile?.unitPreference || 'METRIC';
    const language = coachProfile?.language || 'en';

    // 2. Goals Context (Active Goals)
    const activeGoals = await this.prisma.trainingGoal.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        status: 'ACTIVE',
      },
      take: 4,
      select: {
        title: true,
        category: true,
        targetValue: true,
        currentValue: true,
        unit: true,
      },
    });

    // 3. Training Context
    const activePlan = await this.prisma.trainingPlan.findFirst({
      where: {
        memberProfileId: memberId,
        organisationId,
        status: 'ACTIVE',
      },
      include: {
        trainingProgram: { select: { name: true, trainerProfileId: true } },
      },
    });

    // Today's scheduled workout
    const today = new Date(dateStr);
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const todayWorkout = await this.prisma.workout.findFirst({
      where: {
        memberProfileId: memberId,
        organisationId,
        scheduledDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        exercises: { select: { id: true } },
      },
    });

    // Yesterday's workout
    const yesterdayStart = new Date(startOfDay);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const yesterdayEnd = new Date(endOfDay);
    yesterdayEnd.setUTCDate(yesterdayEnd.getUTCDate() - 1);

    const yesterdayWorkout = await this.prisma.workout.findFirst({
      where: {
        memberProfileId: memberId,
        organisationId,
        scheduledDate: { gte: yesterdayStart, lte: yesterdayEnd },
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    // Recent workouts (past 7 days)
    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const recentWorkouts = await this.prisma.workout.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        scheduledDate: { gte: sevenDaysAgo, lte: endOfDay },
      },
      select: { id: true, status: true },
    });

    const completedRecentCount = recentWorkouts.filter((w) => w.status === 'COMPLETED').length;
    const adherenceRate = recentWorkouts.length > 0 ? completedRecentCount / recentWorkouts.length : 1.0;

    // 4. Nutrition Context (Check permission first)
    const consentRecord = await this.prisma.consentRecord.findFirst({
      where: {
        memberProfileId: memberId,
        consentType: { key: 'AI_PROCESSING' },
        status: 'CONSENTED',
      },
    });
    const hasNutritionConsent = !!consentRecord;

    let nutritionSummaryContext = {
      isAuthorized: hasNutritionConsent,
      hasLoggedToday: false,
      calorieTarget: undefined as number | undefined,
      proteinTarget: undefined as number | undefined,
      consumedCalories: undefined as number | undefined,
      consumedProtein: undefined as number | undefined,
      hydrationLoggedMl: undefined as number | undefined,
      recentConsistencyPct: undefined as number | undefined,
    };

    if (hasNutritionConsent) {
      const nutritionTarget = await this.prisma.nutritionTarget.findFirst({
        where: { memberProfileId: memberId, organisationId, status: 'ACTIVE' },
        orderBy: { effectiveFrom: 'desc' },
      });

      const todaySummary = await this.prisma.nutritionSummary.findFirst({
        where: {
          memberProfileId: memberId,
          organisationId,
          date: { gte: startOfDay, lte: endOfDay },
        },
      });

      nutritionSummaryContext = {
        isAuthorized: true,
        hasLoggedToday: !!todaySummary && todaySummary.totalCalories > 0,
        calorieTarget: nutritionTarget?.dailyCalories,
        proteinTarget: nutritionTarget?.proteinGrams,
        consumedCalories: todaySummary?.totalCalories,
        consumedProtein: todaySummary?.totalProtein,
        hydrationLoggedMl: todaySummary?.totalWaterMl,
        recentConsistencyPct: todaySummary ? Math.round(todaySummary.calorieAdherencePct) : undefined,
      };
    }

    // 5. Attendance Context & Upcoming PT
    const engagementProfile = await this.prisma.memberEngagementProfile.findUnique({
      where: { memberId },
    });
    const latestInsight = await this.prisma.engagementInsight.findFirst({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      select: { trend: true, overallEngagement: true },
    });

    const upcomingPtSession = await this.prisma.personalTrainingSession.findFirst({
      where: {
        memberProfileId: memberId,
        organisationId,
        scheduledStart: { gte: new Date() },
        status: 'SCHEDULED',
      },
      orderBy: { scheduledStart: 'asc' },
      include: {
        trainerProfile: { select: { professionalName: true } },
      },
    });

    // 6. Previous Check-Ins & Trends
    const detectedTrends = await this.summaryService.detectTrends(memberId, 7);
    const prevCheckInsCount = await this.prisma.dailyCheckIn.count({
      where: { memberId, status: 'COMPLETED' },
    });

    return {
      date: dateStr,
      timezone,
      memberPreferences: {
        unitPreference,
        language,
      },
      goalsSummary: {
        count: activeGoals.length,
        activeGoals: activeGoals.map((g) => ({
          title: g.title,
          category: g.category,
          targetValue: g.targetValue ?? 0,
          currentValue: g.currentValue ?? 0,
          unit: g.unit ?? '',
        })),
      },
      trainingSummary: {
        hasActivePlan: !!activePlan,
        planName: activePlan?.name,
        isTrainerAssigned: !!activePlan?.trainerProfileId || !!activePlan?.trainingProgram?.trainerProfileId,
        todayWorkout: todayWorkout
          ? {
              id: todayWorkout.id,
              title: todayWorkout.title,
              exerciseCount: todayWorkout.exercises.length,
              estimatedMinutes: todayWorkout.estimatedDurationMinutes ?? undefined,
            }
          : null,
        yesterdayWorkout: yesterdayWorkout
          ? {
              id: yesterdayWorkout.id,
              title: yesterdayWorkout.title,
              completed: yesterdayWorkout.status === 'COMPLETED',
            }
          : null,
        recentWorkoutsCount: completedRecentCount,
        recentAdherenceRate: Math.round(adherenceRate * 100) / 100,
      },
      nutritionSummary: nutritionSummaryContext,
      attendanceSummary: {
        currentStreak: engagementProfile?.currentStreak ?? 0,
        recentVisitsCount: engagementProfile?.totalVisits ?? 0,
        engagementLevel: latestInsight?.overallEngagement || engagementProfile?.engagementLevel || 'MODERATE',
        momentumTrend: latestInsight?.trend || 'STABLE',
        upcomingPtSession: upcomingPtSession
          ? {
              scheduledAt: upcomingPtSession.scheduledStart.toISOString(),
              trainerName: upcomingPtSession.trainerProfile?.professionalName,
            }
          : null,
      },
      previousCheckInSummary: {
        previousCount: prevCheckInsCount,
        detectedTrends,
      },
      currentCheckInResponses: {
        energyLevel: dto.energyLevel,
        wellbeingMood: dto.wellbeingMood,
        sleepQuality: dto.sleepQuality,
        sleepDurationMinutes: dto.sleepDurationMinutes,
        sorenessLevel: dto.sorenessLevel,
        stressLevel: dto.stressLevel,
        motivationLevel: dto.motivationLevel,
        yesterdayWorkoutCompleted: dto.yesterdayWorkoutCompleted,
        notes: dto.notes,
      },
      deterministicReadiness: {
        score: readiness.score,
        category: readiness.category,
        formulaVersion: readiness.formulaVersion,
      },
      safetyFlags: {
        flagged: safetyFlagged,
        category: safetyCategory,
      },
    };
  }
}
