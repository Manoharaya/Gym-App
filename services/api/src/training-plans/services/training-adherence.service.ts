import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { TrainingPlansService } from './training-plans.service';

export interface AdherenceMetrics {
  totalScheduled: number;
  completed: number;
  skipped: number;
  overdue: number;
  pending: number;
  adherencePercentage: number;
  weeklyBreakdown?: Array<{
    weekNumber: number;
    weekName: string;
    totalScheduled: number;
    completed: number;
    skipped: number;
    overdue: number;
    adherencePercentage: number;
  }>;
}

@Injectable()
export class TrainingAdherenceService {
  private readonly logger = new Logger(TrainingAdherenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: TrainingPlansService,
  ) {}

  /**
   * Calculates plan adherence metrics based on assigned workouts and scheduled dates.
   */
  async calculateAdherence(
    organisationId: string,
    planId: string,
    actor?: AuthenticatedUser,
  ): Promise<AdherenceMetrics> {
    if (actor) {
      await this.plansService.findOne(organisationId, planId, actor);
    }

    const plan = await this.prisma.trainingPlan.findFirst({
      where: { id: planId, organisationId },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            days: {
              include: {
                workout: true,
              },
            },
          },
        },
        workouts: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(`Training plan '${planId}' not found`);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let totalScheduled = 0;
    let completed = 0;
    let skipped = 0;
    let overdue = 0;
    let pending = 0;

    const weeklyBreakdown: AdherenceMetrics['weeklyBreakdown'] = [];

    for (const week of plan.weeks) {
      let weekTotal = 0;
      let weekCompleted = 0;
      let weekSkipped = 0;
      let weekOverdue = 0;

      for (const day of week.days) {
        if (!day.workout || day.restDay) continue;

        const w = day.workout;
        // Skip cancelled or draft workouts
        if (w.status === 'CANCELLED' || w.status === 'DRAFT') continue;

        totalScheduled++;
        weekTotal++;

        if (w.status === 'COMPLETED') {
          completed++;
          weekCompleted++;
        } else if (w.status === 'SKIPPED') {
          skipped++;
          weekSkipped++;
        } else {
          // Status is ASSIGNED, SCHEDULED, or IN_PROGRESS
          const scheduled = w.scheduledDate ? new Date(w.scheduledDate) : null;
          if (scheduled && scheduled < startOfToday) {
            overdue++;
            weekOverdue++;
          } else {
            pending++;
          }
        }
      }

      const weekAdherence =
        weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 100;

      weeklyBreakdown.push({
        weekNumber: week.weekNumber,
        weekName: week.name || `Week ${week.weekNumber}`,
        totalScheduled: weekTotal,
        completed: weekCompleted,
        skipped: weekSkipped,
        overdue: weekOverdue,
        adherencePercentage: weekAdherence,
      });
    }

    // Overall adherence percentage: completed / totalScheduled (or 100% if nothing scheduled yet)
    const adherencePercentage =
      totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 100;

    return {
      totalScheduled,
      completed,
      skipped,
      overdue,
      pending,
      adherencePercentage,
      weeklyBreakdown,
    };
  }
}
