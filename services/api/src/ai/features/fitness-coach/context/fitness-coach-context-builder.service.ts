import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import type { AIFitnessCoachProfileDto } from '@fitcore/types';

export interface FitnessCoachGroundedContext {
  member: {
    memberId: string;
    firstName?: string;
    gender?: string;
    ageBracket?: string;
  };
  coachingPreferences: {
    coachingStyle: string;
    responseLength: string;
    unitPreference: string;
    trainingFocus?: string;
  };
  training: {
    activePlan?: {
      id: string;
      name: string;
      description?: string | null;
      goalCategory?: string;
      isTrainerAssigned: boolean;
      trainerName?: string;
    } | null;
    recentWorkouts: Array<{
      id: string;
      title: string;
      completedAt: string;
      durationMinutes?: number | null;
      isTrainerAssigned: boolean;
    }>;
    todayWorkout?: {
      id: string;
      title: string;
      status: string;
      estimatedDurationMinutes?: number | null;
    } | null;
  };
  progress: {
    activeGoals: Array<{
      id: string;
      title: string;
      category: string;
      targetValue?: number | null;
      currentValue?: number | null;
      unit?: string | null;
      targetDate?: string | null;
    }>;
    recentMeasurements?: Array<{
      metric: string;
      value: number;
      unit: string;
      date: string;
    }>;
  };
  engagement: {
    streak: number;
    engagementLevel: string;
    totalWorkoutsCompleted: number;
    totalVisits: number;
  };
  attendance: {
    recentCheckInsCount30d: number;
    lastVisitAt?: string | null;
  };
  nutrition?: {
    dailyCalories?: number;
    proteinGrams?: number;
    carbsGrams?: number;
    fatsGrams?: number;
  } | null;
  trainerGuidanceNotes?: string[];
}

@Injectable()
export class FitnessCoachContextBuilderService {
  private readonly logger = new Logger(FitnessCoachContextBuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assembles prioritized, sanitized, and grounded fitness context.
   */
  async buildContext(
    memberId: string,
    organisationId: string,
    profilePreferences?: Partial<AIFitnessCoachProfileDto>,
    includeNutrition: boolean = false,
  ): Promise<FitnessCoachGroundedContext> {
    // 1. Fetch Member Profile & User details
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member) {
      throw new Error(`Member '${memberId}' not found`);
    }

    const age = member.dateOfBirth
      ? Math.floor((Date.now() - new Date(member.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : undefined;

    const ageBracket = age ? (age < 25 ? '18-24' : age < 35 ? '25-34' : age < 50 ? '35-49' : '50+') : undefined;

    // 2. High Relevance: Active Training Goals
    const activeGoals = await this.prisma.trainingGoal.findMany({
      where: { memberProfileId: memberId, status: 'ACTIVE' },
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        targetValue: true,
        currentValue: true,
        unit: true,
        targetDate: true,
      },
    });

    // 3. High Relevance: Active Training Plan
    const activePlan = await this.prisma.trainingPlan.findFirst({
      where: {
        memberProfileId: memberId,
        status: 'ACTIVE',
      },
      include: {
        trainerProfile: {
          include: { staffProfile: { include: { user: true } } },
        },
      },
    });

    // 4. High Relevance: Recent Completed Workouts (take 5)
    const recentWorkouts = await this.prisma.workout.findMany({
      where: { memberProfileId: memberId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        completedAt: true,
        estimatedDurationMinutes: true,
        trainerProfileId: true,
      },
    });

    // 5. In-progress or scheduled workout for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayWorkout = await this.prisma.workout.findFirst({
      where: {
        memberProfileId: memberId,
        scheduledDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        estimatedDurationMinutes: true,
      },
    });

    // 6. Medium Relevance: Engagement Profile (Day 18)
    const engagementProfile = await this.prisma.memberEngagementProfile.findUnique({
      where: { memberId },
    });

    // 7. Medium Relevance: Attendance Check-ins (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const checkInsCount = await this.prisma.checkIn.count({
      where: {
        memberProfileId: memberId,
        checkedInAt: { gte: thirtyDaysAgo },
      },
    });

    const lastCheckIn = await this.prisma.checkIn.findFirst({
      where: { memberProfileId: memberId },
      orderBy: { checkedInAt: 'desc' },
      select: { checkedInAt: true },
    });

    // 8. Optional: Nutrition summary (Only if authorized and requested)
    let nutritionData: FitnessCoachGroundedContext['nutrition'] = null;
    if (includeNutrition) {
      const target = await this.prisma.nutritionTarget.findFirst({
        where: { memberProfileId: memberId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        select: {
          dailyCalories: true,
          proteinGrams: true,
          carbohydrateGrams: true,
          fatGrams: true,
        },
      });

      if (target) {
        nutritionData = {
          dailyCalories: target.dailyCalories,
          proteinGrams: target.proteinGrams,
          carbsGrams: target.carbohydrateGrams,
          fatsGrams: target.fatGrams,
        };
      }
    }

    // 9. Sensitive Boundary: Member-visible trainer notes ONLY (Slice 8)
    // Never include PRIVATE notes.
    const memberNotes = await this.prisma.trainerNote.findMany({
      where: {
        memberProfileId: memberId,
        visibility: 'MEMBER_VISIBLE',
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { content: true },
    });

    return {
      member: {
        memberId: member.id,
        firstName: member.user.firstName,
        gender: member.gender || undefined,
        ageBracket,
      },
      coachingPreferences: {
        coachingStyle: profilePreferences?.coachingStyle || 'BALANCED',
        responseLength: profilePreferences?.responseLength || 'BALANCED',
        unitPreference: profilePreferences?.unitPreference || 'METRIC',
        trainingFocus: profilePreferences?.trainingFocus || undefined,
      },
      training: {
        activePlan: activePlan
          ? {
              id: activePlan.id,
              name: activePlan.name,
              description: activePlan.description,
              goalCategory: activePlan.objective || undefined,
              isTrainerAssigned: !!activePlan.trainerProfileId,
              trainerName: activePlan.trainerProfile?.staffProfile?.user
                ? `${activePlan.trainerProfile.staffProfile.user.firstName} ${activePlan.trainerProfile.staffProfile.user.lastName}`
                : undefined,
            }
          : null,
        recentWorkouts: recentWorkouts.map((w: any) => ({
          id: w.id,
          title: w.title,
          completedAt: w.completedAt ? w.completedAt.toISOString() : '',
          durationMinutes: w.estimatedDurationMinutes,
          isTrainerAssigned: !!w.trainerProfileId,
        })),
        todayWorkout: todayWorkout
          ? {
              id: todayWorkout.id,
              title: todayWorkout.title,
              status: todayWorkout.status,
              estimatedDurationMinutes: todayWorkout.estimatedDurationMinutes,
            }
          : null,
      },
      progress: {
        activeGoals: activeGoals.map((g: any) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          targetValue: g.targetValue,
          currentValue: g.currentValue,
          unit: g.unit,
          targetDate: g.targetDate ? g.targetDate.toISOString() : null,
        })),
      },
      engagement: {
        streak: engagementProfile?.currentStreak || 0,
        engagementLevel: engagementProfile?.engagementLevel || 'NEW',
        totalWorkoutsCompleted: engagementProfile?.totalWorkouts || 0,
        totalVisits: engagementProfile?.totalVisits || 0,
      },
      attendance: {
        recentCheckInsCount30d: checkInsCount,
        lastVisitAt: lastCheckIn?.checkedInAt ? lastCheckIn.checkedInAt.toISOString() : null,
      },
      nutrition: nutritionData,
      trainerGuidanceNotes: memberNotes.map((n: any) => n.content),
    };
  }
}
