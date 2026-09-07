import { Injectable, Logger, OnModuleInit, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AIToolRegistryService } from '../../../services/ai-tool-registry.service';
import { PrismaService } from '../../../../database/prisma.service';
import { AIToolContext } from '@fitcore/types';

@Injectable()
export class FitnessCoachToolsService implements OnModuleInit {
  private readonly logger = new Logger(FitnessCoachToolsService.name);

  constructor(
    private readonly toolRegistry: AIToolRegistryService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.registerFitnessCoachTools();
  }

  private registerFitnessCoachTools() {
    // 1. get_member_goals
    this.toolRegistry.registerTool({
      name: 'get_member_goals',
      description: 'Fetches active fitness goals and progress metrics for the authenticated member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'ALL'] },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const statusFilter = input.status === 'ALL' ? undefined : (input.status || 'ACTIVE');

        const goals = await this.prisma.trainingGoal.findMany({
          where: {
            memberProfileId: memberId,
            status: statusFilter,
          },
          select: {
            id: true,
            title: true,
            category: true,
            targetValue: true,
            currentValue: true,
            unit: true,
            status: true,
            targetDate: true,
          },
        });

        return { memberId, count: goals.length, goals };
      },
    });

    // 2. get_active_training_plan
    this.toolRegistry.registerTool({
      name: 'get_active_training_plan',
      description: 'Returns the current active training plan and prescribed weekly schedule.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object', properties: {} },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);

        const plan = await this.prisma.trainingPlan.findFirst({
          where: { memberProfileId: memberId, status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            description: true,
            objective: true,
            startDate: true,
            endDate: true,
            durationWeeks: true,
          },
        });

        return { plan: plan || null, hasActivePlan: !!plan };
      },
    });

    // 3. get_recent_workouts
    this.toolRegistry.registerTool({
      name: 'get_recent_workouts',
      description: 'Retrieves completed workouts for the authenticated member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 10 },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const limit = Math.min(input.limit || 5, 10);

        const workouts = await this.prisma.workout.findMany({
          where: { memberProfileId: memberId, status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: limit,
          select: {
            id: true,
            title: true,
            completedAt: true,
            estimatedDurationMinutes: true,
          },
        });

        return { memberId, count: workouts.length, workouts };
      },
    });

    // 4. get_workout_details
    this.toolRegistry.registerTool({
      name: 'get_workout_details',
      description: 'Returns detailed exercises and structure of a specific workout owned by the member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          workoutId: { type: 'string' },
        },
        required: ['workoutId'],
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const workout = await this.prisma.workout.findUnique({
          where: { id: input.workoutId },
          include: {
            exercises: {
              include: { exercise: true, sets: true },
            },
          },
        });

        if (!workout || workout.memberProfileId !== memberId) {
          throw new NotFoundException(`Workout '${input.workoutId}' not found for member`);
        }

        return {
          id: workout.id,
          title: workout.title,
          status: workout.status,
          durationMinutes: workout.estimatedDurationMinutes,
          exerciseCount: workout.exercises.length,
          exercises: workout.exercises.map((we: any) => ({
            exerciseName: we.exercise.name,
            setsCount: we.sets.length,
            targetReps: we.targetReps,
            targetRpe: we.targetRpe,
            restSeconds: we.restSeconds,
          })),
        };
      },
    });

    // 5. get_progress_summary
    this.toolRegistry.registerTool({
      name: 'get_progress_summary',
      description: 'Returns progress statistics and active goals summary.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object', properties: {} },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const totalCompletedWorkouts = await this.prisma.workout.count({
          where: { memberProfileId: memberId, status: 'COMPLETED' },
        });

        const activeGoalsCount = await this.prisma.trainingGoal.count({
          where: { memberProfileId: memberId, status: 'ACTIVE' },
        });

        return {
          memberId,
          totalCompletedWorkouts,
          activeGoalsCount,
        };
      },
    });

    // 6. get_attendance_summary
    this.toolRegistry.registerTool({
      name: 'get_attendance_summary',
      description: 'Returns gym visit count and recency for the member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object', properties: {} },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const totalVisits = await this.prisma.checkIn.count({
          where: { memberProfileId: memberId },
        });

        const lastCheckIn = await this.prisma.checkIn.findFirst({
          where: { memberProfileId: memberId },
          orderBy: { checkedInAt: 'desc' },
        });

        return {
          memberId,
          totalVisits,
          lastVisitAt: lastCheckIn?.checkedInAt?.toISOString() || null,
        };
      },
    });

    // 7. get_engagement_summary
    this.toolRegistry.registerTool({
      name: 'get_engagement_summary',
      description: 'Returns consistency streaks and engagement level.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object', properties: {} },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const profile = await this.prisma.memberEngagementProfile.findUnique({
          where: { memberId },
        });

        return {
          memberId,
          streak: profile?.currentStreak || 0,
          longestStreak: profile?.longestStreak || 0,
          engagementLevel: profile?.engagementLevel || 'NEW',
          totalCompletedClasses: profile?.totalCompletedClasses || 0,
        };
      },
    });

    // 8. get_current_challenge
    this.toolRegistry.registerTool({
      name: 'get_current_challenge',
      description: 'Returns active challenge participation for the member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object', properties: {} },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const participation = await this.prisma.challengeParticipant.findFirst({
          where: { memberId, status: 'JOINED' },
          include: { challenge: true },
        });

        return {
          hasActiveChallenge: !!participation,
          challenge: participation
            ? {
                title: participation.challenge.name,
                progress: participation.currentProgress,
                target: participation.challenge.target,
                unit: participation.challenge.metric,
              }
            : null,
        };
      },
    });

    this.logger.log('AI Fitness Coach read-only tools registered successfully.');
  }

  /**
   * Slice 34: Strict tool validation. Never trust model-generated IDs.
   * Always binds execution to the authenticated member context.
   */
  private resolveValidatedMemberId(context: AIToolContext): string {
    if (!context.memberId) {
      throw new ForbiddenException('Tool execution requires authenticated member context');
    }
    return context.memberId;
  }
}
