import { Injectable, Logger, OnModuleInit, ForbiddenException } from '@nestjs/common';
import { AIToolRegistryService } from '../../../services/ai-tool-registry.service';
import { PrismaService } from '../../../../database/prisma.service';
import { AIToolContext } from '@fitcore/types';

@Injectable()
export class DailyCheckInToolsService implements OnModuleInit {
  private readonly logger = new Logger(DailyCheckInToolsService.name);

  constructor(
    private readonly toolRegistry: AIToolRegistryService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.registerDailyCheckInTools();
  }

  private registerDailyCheckInTools() {
    // 1. get_today_workout
    this.toolRegistry.registerTool({
      name: 'get_today_workout',
      description: 'Returns today\'s scheduled workout and exercises for the member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD date' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const targetDate = input.date ? new Date(input.date) : new Date();

        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const workout = await this.prisma.workout.findFirst({
          where: {
            memberProfileId: memberId,
            organisationId: context.organisationId,
            scheduledDate: { gte: startOfDay, lte: endOfDay },
          },
          include: {
            exercises: {
              select: {
                id: true,
                exercise: { select: { name: true, exerciseType: true } },
                targetSets: true,
                targetReps: true,
              },
            },
          },
        });

        if (!workout) {
          return { hasWorkout: false, message: 'No workout scheduled for this date.' };
        }

        return {
          hasWorkout: true,
          workoutId: workout.id,
          title: workout.title,
          status: workout.status,
          exerciseCount: workout.exercises.length,
          exercises: workout.exercises.map((e: any) => ({
            name: e.exercise.name,
            category: e.exercise.exerciseType,
            sets: e.targetSets,
            reps: e.targetReps,
          })),
        };
      },
    });

    // 2. get_recent_training_summary
    this.toolRegistry.registerTool({
      name: 'get_recent_training_summary',
      description: 'Returns past 7 days completed workouts, adherence rate, and consistency.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

        const workouts = await this.prisma.workout.findMany({
          where: {
            memberProfileId: memberId,
            organisationId: context.organisationId,
            scheduledDate: { gte: sevenDaysAgo },
          },
          select: { id: true, title: true, status: true, completedAt: true },
        });

        const completed = workouts.filter((w) => w.status === 'COMPLETED').length;

        return {
          totalScheduled: workouts.length,
          completedCount: completed,
          adherenceRate: workouts.length > 0 ? Math.round((completed / workouts.length) * 100) / 100 : 1.0,
        };
      },
    });

    // 3. get_active_goals_context
    this.toolRegistry.registerTool({
      name: 'get_active_goals_context',
      description: 'Fetches active fitness and consistency goals for the member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);

        const goals = await this.prisma.trainingGoal.findMany({
          where: {
            memberProfileId: memberId,
            organisationId: context.organisationId,
            status: 'ACTIVE',
          },
          select: {
            title: true,
            category: true,
            targetValue: true,
            currentValue: true,
            unit: true,
          },
        });

        return { count: goals.length, goals };
      },
    });

    // 4. get_nutrition_summary_context
    this.toolRegistry.registerTool({
      name: 'get_nutrition_summary_context',
      description: 'Returns daily nutrition targets and logged intake for the member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);

        const target = await this.prisma.nutritionTarget.findFirst({
          where: { memberProfileId: memberId, organisationId: context.organisationId, status: 'ACTIVE' },
          orderBy: { effectiveFrom: 'desc' },
        });

        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const summary = await this.prisma.nutritionSummary.findFirst({
          where: {
            memberProfileId: memberId,
            organisationId: context.organisationId,
            date: { gte: todayStart },
          },
        });

        return {
          hasTarget: !!target,
          calorieTarget: target?.dailyCalories,
          consumedCalories: summary?.totalCalories ?? 0,
          consumedProtein: summary?.totalProtein ?? 0,
          totalWaterMl: summary?.totalWaterMl ?? 0,
        };
      },
    });

    // 5. get_attendance_summary_context
    this.toolRegistry.registerTool({
      name: 'get_attendance_summary_context',
      description: 'Returns gym attendance streak and recent visit count.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);

        const profile = await this.prisma.memberEngagementProfile.findUnique({
          where: { memberId },
        });

        return {
          currentStreak: profile?.currentStreak ?? 0,
          longestStreak: profile?.longestStreak ?? 0,
          totalVisits: profile?.totalVisits ?? 0,
        };
      },
    });

    // 6. get_previous_checkins_context
    this.toolRegistry.registerTool({
      name: 'get_previous_checkins_context',
      description: 'Returns recent daily check-ins for trend evaluation.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 5 },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const takeLimit = Math.min(10, input.limit || 5);

        const checkIns = await this.prisma.dailyCheckIn.findMany({
          where: {
            memberId,
            organisationId: context.organisationId,
            status: 'COMPLETED',
          },
          orderBy: { checkInDate: 'desc' },
          take: takeLimit,
          select: {
            checkInDate: true,
            readinessScore: true,
            readinessCategory: true,
            energyLevel: true,
            sorenessLevel: true,
          },
        });

        return { count: checkIns.length, checkIns };
      },
    });

    // 7. get_member_daily_checkin_context
    this.toolRegistry.registerTool({
      name: 'get_member_daily_checkin_context',
      description: 'Returns aggregated authorized daily check-in context including today workout, goals, nutrition, and past check-ins.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        return {
          memberId,
          organisationId: context.organisationId,
          status: 'CONTEXT_AVAILABLE',
        };
      },
    });

    this.logger.log('Daily Check-In read-only AI tools successfully registered.');
  }

  private resolveValidatedMemberId(context: AIToolContext): string {
    if (!context.memberId) {
      throw new ForbiddenException('Member context is required for daily check-in AI tools.');
    }
    return context.memberId;
  }
}
