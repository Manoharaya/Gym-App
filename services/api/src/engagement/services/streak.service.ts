import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  isActiveToday: boolean;
}

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Formats a given Date into a YYYY-MM-DD string in the specified timezone.
   */
  getLocalDateString(date: Date, timezone: string = 'UTC'): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date);
    } catch {
      // Fallback if invalid timezone passed
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Returns the previous day's YYYY-MM-DD string.
   */
  getPreviousDateString(dateStr: string): string {
    const d = new Date(`${dateStr}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split('T')[0];
  }

  /**
   * Calculates streaks given a sorted set of unique YYYY-MM-DD active days in ascending order.
   */
  calculateStreakFromDays(uniqueDaysAsc: string[], timezone: string = 'UTC'): StreakResult {
    if (!uniqueDaysAsc || uniqueDaysAsc.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        isActiveToday: false,
      };
    }

    const todayStr = this.getLocalDateString(new Date(), timezone);
    const yesterdayStr = this.getPreviousDateString(todayStr);

    const activeSet = new Set(uniqueDaysAsc);
    const lastActive = uniqueDaysAsc[uniqueDaysAsc.length - 1];
    const isActiveToday = activeSet.has(todayStr);

    // Calculate longest streak historically
    let longestStreak = 0;
    let tempStreak = 0;
    let expectedNext: string | null = null;

    for (const day of uniqueDaysAsc) {
      if (!expectedNext || day === expectedNext) {
        tempStreak += 1;
      } else {
        tempStreak = 1;
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }

      // Expected next day
      const nextDate: Date = new Date(`${day}T12:00:00Z`);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      expectedNext = nextDate.toISOString().split('T')[0];
    }

    // Calculate current streak: walk backwards from today or yesterday
    let currentStreak = 0;
    let checkDate: string | null = isActiveToday
      ? todayStr
      : activeSet.has(yesterdayStr)
      ? yesterdayStr
      : null;

    while (checkDate && activeSet.has(checkDate)) {
      currentStreak += 1;
      checkDate = this.getPreviousDateString(checkDate);
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastActiveDate: lastActive,
      isActiveToday,
    };
  }

  /**
   * Calculates overall engagement streak for a member based on engagement events.
   * Considers activities like visits, workouts, nutrition, and classes as active days.
   */
  async calculateMemberEngagementStreak(memberId: string, timezone: string = 'UTC'): Promise<StreakResult> {
    const events = await this.prisma.engagementEvent.findMany({
      where: {
        memberId,
        eventType: {
          in: [
            'GYM_CHECKED_IN',
            'WORKOUT_COMPLETED',
            'CLASS_ATTENDED',
            'MEAL_LOGGED',
            'CHALLENGE_COMPLETED',
            'PROGRESS_RECORDED',
          ],
        },
      },
      select: { occurredAt: true },
      orderBy: { occurredAt: 'asc' },
    });

    const daySet = new Set<string>();
    for (const ev of events) {
      daySet.add(this.getLocalDateString(ev.occurredAt, timezone));
    }

    const sortedDays = Array.from(daySet).sort();
    return this.calculateStreakFromDays(sortedDays, timezone);
  }

  /**
   * Calculates streak for a specific MemberHabit based on HabitCompletion records.
   */
  async calculateMemberHabitStreak(memberHabitId: string, timezone: string = 'UTC'): Promise<StreakResult> {
    const completions = await this.prisma.habitCompletion.findMany({
      where: {
        memberHabitId,
        completed: true,
      },
      select: { date: true },
      orderBy: { date: 'asc' },
    });

    const daySet = new Set<string>();
    for (const comp of completions) {
      daySet.add(this.getLocalDateString(comp.date, timezone));
    }

    const sortedDays = Array.from(daySet).sort();
    return this.calculateStreakFromDays(sortedDays, timezone);
  }
}
