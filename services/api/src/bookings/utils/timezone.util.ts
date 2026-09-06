/**
 * Timezone Utility for FitCore Scheduling Engine
 *
 * Provides deterministic, timezone-aware conversions between local wall-clock
 * times and UTC timestamps using standard IANA timezones and Node's Intl API.
 */

export interface OccurrenceSlot {
  startsAt: Date;
  endsAt: Date;
  localDate: string; // YYYY-MM-DD
  localTime: string; // HH:mm
}

export class TimezoneUtil {
  /**
   * Returns the offset in minutes between UTC and the specified IANA timezone at a given timestamp.
   * Positive for timezones ahead of UTC (e.g. +480 for UTC+8 / Perth, +600 for UTC+10 / Sydney).
   */
  static getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hourCycle: 'h23',
      });
      const parts = formatter.formatToParts(date);
      const findPart = (type: string) =>
        parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

      const year = findPart('year');
      const month = findPart('month') - 1;
      const day = findPart('day');
      const hour = findPart('hour');
      const minute = findPart('minute');
      const second = findPart('second');

      const localTimeInUtc = Date.UTC(year, month, day, hour, minute, second);
      return (localTimeInUtc - date.getTime()) / (60 * 1000);
    } catch {
      return 0; // Fallback to UTC on invalid timezone
    }
  }

  /**
   * Constructs a precise UTC Date from a local calendar date and time in the given timezone.
   *
   * @param year Local year (e.g. 2026)
   * @param month Local month (1-12)
   * @param day Local day of month (1-31)
   * @param timeStr Local time string in "HH:mm" format (e.g. "06:30" or "18:00")
   * @param timeZone IANA timezone (e.g. "Australia/Perth", "Australia/Sydney", "UTC")
   */
  static createUtcFromLocal(
    year: number,
    month: number,
    day: number,
    timeStr: string,
    timeZone: string,
  ): Date {
    const [hours, minutes] = timeStr.split(':').map((v) => parseInt(v, 10));
    const initialUtcMillis = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
    const approxDate = new Date(initialUtcMillis);

    // Get offset at approximate time
    const offsetMinutes = this.getTimezoneOffsetMinutes(approxDate, timeZone);
    const correctedMillis = initialUtcMillis - offsetMinutes * 60 * 1000;

    // Second pass to guarantee exact convergence across DST shift boundaries
    const correctedDate = new Date(correctedMillis);
    const refinedOffset = this.getTimezoneOffsetMinutes(correctedDate, timeZone);

    if (refinedOffset !== offsetMinutes) {
      return new Date(initialUtcMillis - refinedOffset * 60 * 1000);
    }

    return correctedDate;
  }

  /**
   * Returns the local day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   * for a given UTC date evaluated in the specified timezone.
   */
  static getZonedDayOfWeek(date: Date, timeZone: string): number {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
      });
      const weekdayStr = formatter.format(date);
      const days: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      return days[weekdayStr] ?? date.getUTCDay();
    } catch {
      return date.getUTCDay();
    }
  }

  /**
   * Formats a UTC date into a local "YYYY-MM-DD" string in the given timezone.
   */
  static getZonedDateString(date: Date, timeZone: string): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date);
    } catch {
      return date.toISOString().split('T')[0]!;
    }
  }

  /**
   * Calculates concrete occurrence slots for a recurring schedule within [fromDate, toDate].
   *
   * Supports:
   * - DAILY: every day
   * - WEEKLY: primary dayOfWeek and/or multi-day daysOfWeek (e.g. [1, 3, 5] for Mon/Wed/Fri)
   * - BIWEEKLY: every 2 weeks on specified days
   * - MONTHLY: same day of month
   */
  static calculateRecurringOccurrences(params: {
    startDate: Date;
    endDate?: Date | null;
    fromDate: Date;
    toDate: Date;
    frequency?: string;
    dayOfWeek: number;
    daysOfWeek?: number[];
    startTime: string;
    durationMinutes: number;
    timezone?: string;
  }): OccurrenceSlot[] {
    const tz = params.timezone || 'Australia/Perth';
    const frequency = (params.frequency || 'WEEKLY').toUpperCase();
    const durationMs = (params.durationMinutes || 60) * 60 * 1000;

    // Consolidate target weekdays (0=Sun, 1=Mon, ..., 6=Sat)
    const targetDays = new Set<number>();
    if (params.daysOfWeek && params.daysOfWeek.length > 0) {
      params.daysOfWeek.forEach((d) => targetDays.add(d));
    } else {
      targetDays.add(params.dayOfWeek);
    }

    const slots: OccurrenceSlot[] = [];

    // Anchor start at max(startDate, fromDate) and end at min(endDate, toDate)
    const effectiveStart = new Date(Math.max(params.startDate.getTime(), params.fromDate.getTime()));
    const effectiveEnd = params.endDate
      ? new Date(Math.min(params.endDate.getTime(), params.toDate.getTime()))
      : new Date(params.toDate.getTime());

    // Iterate through calendar days in local timezone
    const current = new Date(effectiveStart);
    current.setUTCHours(0, 0, 0, 0);

    const startLocalDayMillis = params.startDate.getTime();

    while (current.getTime() <= effectiveEnd.getTime() + 24 * 60 * 60 * 1000) {
      const localDateStr = this.getZonedDateString(current, tz);
      const [year, month, day] = localDateStr.split('-').map(Number);
      const currentLocalDayOfWeek = this.getZonedDayOfWeek(current, tz);

      let isMatch = false;

      if (frequency === 'DAILY') {
        isMatch = true;
      } else if (frequency === 'WEEKLY') {
        isMatch = targetDays.has(currentLocalDayOfWeek);
      } else if (frequency === 'BIWEEKLY') {
        if (targetDays.has(currentLocalDayOfWeek)) {
          // Calculate week diff from startDate
          const daysDiff = Math.floor((current.getTime() - startLocalDayMillis) / (24 * 60 * 60 * 1000));
          const weeksDiff = Math.floor(daysDiff / 7);
          isMatch = weeksDiff % 2 === 0;
        }
      } else if (frequency === 'MONTHLY') {
        const startDayOfMonth = params.startDate.getUTCDate();
        isMatch = day === startDayOfMonth;
      }

      if (isMatch && year && month && day) {
        const startsAt = this.createUtcFromLocal(year, month, day, params.startTime, tz);
        const endsAt = new Date(startsAt.getTime() + durationMs);

        // Verify startsAt is within bounds
        if (startsAt >= params.fromDate && startsAt <= params.toDate) {
          if (!params.endDate || startsAt <= params.endDate) {
            slots.push({
              startsAt,
              endsAt,
              localDate: localDateStr,
              localTime: params.startTime,
            });
          }
        }
      }

      // Increment by 1 day (24 hours)
      current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
    }

    return slots;
  }
}
