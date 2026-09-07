import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { BodyMeasurementService } from './body-measurement.service';

export interface DetailedAdherenceMetrics {
  period: string;
  totalScheduled: number;
  completed: number;
  skipped: number;
  overdue: number;
  cancelled: number;
  pending: number;
  effectiveScheduled: number;
  adherenceRate: number; // completed / (totalScheduled - cancelled)
  completionRate: number; // completed / totalScheduled
  dailyBreakdown: Array<{
    date: string;
    total: number;
    completed: number;
    skipped: number;
    cancelled: number;
  }>;
}

@Injectable()
export class AdherenceAnalyticsService {
  private readonly logger = new Logger(AdherenceAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly measurementService: BodyMeasurementService,
  ) {}

  /**
   * Calculates deterministic member adherence analytics over a specified time window.
   *
   * Formulations:
   * - totalScheduled: all non-DRAFT workouts scheduled in the period
   * - completed: workouts with status 'COMPLETED'
   * - skipped: workouts with status 'SKIPPED'
   * - cancelled: workouts with status 'CANCELLED' (excluded from failure scoring)
   * - overdue: workouts with scheduledDate < today and status not in (COMPLETED, SKIPPED, CANCELLED)
   * - effectiveScheduled = totalScheduled - cancelled
   * - adherenceRate = completed / effectiveScheduled (or 100% if effectiveScheduled === 0)
   */
  async calculateMemberAdherence(
    organisationId: string,
    memberProfileId: string,
    period: string = '30D',
    startDate?: Date,
    endDate?: Date,
    actor?: AuthenticatedUser,
  ): Promise<DetailedAdherenceMetrics> {
    if (actor) {
      await this.measurementService.assertProgressAccess(organisationId, memberProfileId, actor);
    }

    const { rangeStart, rangeEnd } = this.resolveDateRange(period, startDate, endDate);

    const where: any = {
      organisationId,
      memberProfileId,
      status: { not: 'DRAFT' },
    };

    if (rangeStart || rangeEnd) {
      where.scheduledDate = {};
      if (rangeStart) where.scheduledDate.gte = rangeStart;
      if (rangeEnd) where.scheduledDate.lte = rangeEnd;
    }

    const workouts = await this.prisma.workout.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let completed = 0;
    let skipped = 0;
    let cancelled = 0;
    let overdue = 0;
    let pending = 0;

    const dayMap = new Map<string, { total: number; completed: number; skipped: number; cancelled: number }>();

    for (const w of workouts) {
      const scheduled = w.scheduledDate ? new Date(w.scheduledDate) : null;
      const dateKey = scheduled ? scheduled.toISOString().split('T')[0] : 'undated';

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, { total: 0, completed: 0, skipped: 0, cancelled: 0 });
      }
      const dayStats = dayMap.get(dateKey)!;
      dayStats.total++;

      if (w.status === 'COMPLETED') {
        completed++;
        dayStats.completed++;
      } else if (w.status === 'SKIPPED') {
        skipped++;
        dayStats.skipped++;
      } else if (w.status === 'CANCELLED') {
        cancelled++;
        dayStats.cancelled++;
      } else {
        // Status is ASSIGNED, SCHEDULED, IN_PROGRESS
        if (scheduled && scheduled < startOfToday) {
          overdue++;
        } else {
          pending++;
        }
      }
    }

    const totalScheduled = workouts.length;
    const effectiveScheduled = Math.max(0, totalScheduled - cancelled);

    const adherenceRate =
      effectiveScheduled > 0 ? Math.round((completed / effectiveScheduled) * 100) : 100;
    const completionRate =
      totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 100;

    const dailyBreakdown = Array.from(dayMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return {
      period,
      totalScheduled,
      completed,
      skipped,
      overdue,
      cancelled,
      pending,
      effectiveScheduled,
      adherenceRate,
      completionRate,
      dailyBreakdown,
    };
  }

  /**
   * Helper to parse and calculate standard date intervals.
   */
  resolveDateRange(
    period: string,
    customStart?: Date,
    customEnd?: Date,
  ): { rangeStart?: Date; rangeEnd?: Date } {
    if (period === 'CUSTOM' || customStart || customEnd) {
      return { rangeStart: customStart, rangeEnd: customEnd };
    }

    if (period === 'ALL') {
      return {};
    }

    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    switch (period) {
      case '7D':
        start.setDate(start.getDate() - 7);
        break;
      case '14D':
        start.setDate(start.getDate() - 14);
        break;
      case '30D':
        start.setDate(start.getDate() - 30);
        break;
      case '90D':
        start.setDate(start.getDate() - 90);
        break;
      case '6M':
        start.setMonth(start.getMonth() - 6);
        break;
      case '1Y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 30);
        break;
    }

    return { rangeStart: start, rangeEnd: end };
  }
}
