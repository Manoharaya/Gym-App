import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { WorkoutSignals } from '../engagement-intelligence.types';

@Injectable()
export class WorkoutSignalsService {
  private readonly logger = new Logger(WorkoutSignalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async collect(memberId: string, organisationId: string, now: Date = new Date()): Promise<WorkoutSignals> {
    const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d28Ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const workouts = await this.prisma.workout.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        createdAt: { gte: d28Ago, lte: now },
      },
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const completedWorkouts = workouts.filter((w) => w.status === 'COMPLETED');
    const skippedWorkouts = workouts.filter((w) => w.status === 'SKIPPED');
    const scheduledWorkouts = workouts.filter((w) => w.status === 'SCHEDULED' || w.status === 'ASSIGNED');

    const workoutsCompletedLast7d = completedWorkouts.filter((w) => w.updatedAt >= d7Ago).length;
    const workoutsCompletedLast28d = completedWorkouts.length;
    const workoutsSkippedLast28d = skippedWorkouts.length;
    const workoutsScheduledLast28d = workouts.length;

    // Calculate adherence: completed / (completed + skipped + scheduled)
    let workoutAdherencePct = 100;
    if (workoutsScheduledLast28d > 0) {
      workoutAdherencePct = Math.round((workoutsCompletedLast28d / workoutsScheduledLast28d) * 100);
    } else {
      workoutAdherencePct = 0;
    }

    const lastWorkoutAt = completedWorkouts[0]?.updatedAt || null;

    // Delta between recent 7-day rate (scaled to weekly) vs 28-day weekly average
    const recentWeeklyRate = workoutsCompletedLast7d;
    const baselineWeeklyRate = workoutsCompletedLast28d / 4;
    let workoutDeltaPct = 0;
    if (baselineWeeklyRate > 0) {
      workoutDeltaPct = Math.round(((recentWeeklyRate - baselineWeeklyRate) / baselineWeeklyRate) * 100);
    } else if (recentWeeklyRate > 0) {
      workoutDeltaPct = 100;
    }

    return {
      workoutsScheduledLast28d,
      workoutsCompletedLast7d,
      workoutsCompletedLast28d,
      workoutsSkippedLast28d,
      workoutAdherencePct,
      activePlanAdherencePct: workoutAdherencePct,
      lastWorkoutAt,
      workoutDeltaPct,
    };
  }
}
