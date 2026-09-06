import { Injectable } from '@nestjs/common';

@Injectable()
export class MembershipDateService {
  /**
   * Calculates the authoritative end date for a membership period given a start date,
   * duration value, and duration unit.
   *
   * Month and Year arithmetic handles month-end boundaries safely (e.g. Jan 31 + 1 month -> Feb 28/29).
   */
  calculateEndDate(startDate: Date, durationValue: number, durationUnit: string): Date {
    const result = new Date(startDate.getTime());

    switch (durationUnit.toUpperCase()) {
      case 'DAY': {
        result.setUTCDate(result.getUTCDate() + durationValue);
        break;
      }
      case 'WEEK': {
        result.setUTCDate(result.getUTCDate() + durationValue * 7);
        break;
      }
      case 'MONTH': {
        const currentDay = result.getUTCDate();
        result.setUTCMonth(result.getUTCMonth() + durationValue);
        // If days overflowed (e.g. 31st into a 28-day month), clamp to the last day of target month
        if (result.getUTCDate() !== currentDay) {
          result.setUTCDate(0); // Sets to last day of previous month
        }
        break;
      }
      case 'YEAR': {
        const currentDay = result.getUTCDate();
        const currentMonth = result.getUTCMonth();
        result.setUTCFullYear(result.getUTCFullYear() + durationValue);
        // Handle Feb 29 leap year into non-leap year
        if (currentMonth === 1 && currentDay === 29 && result.getUTCMonth() !== 1) {
          result.setUTCDate(0);
        }
        break;
      }
      default: {
        // Default to days if unrecognized
        result.setUTCDate(result.getUTCDate() + durationValue);
        break;
      }
    }

    return result;
  }

  /**
   * Calculates whole calendar days remaining until expiration.
   * Returns 0 if already expired.
   */
  calculateDaysRemaining(endDate: Date): number {
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Returns true if the target date is strictly in the past compared to now.
   */
  isExpired(endDate: Date): boolean {
    return endDate.getTime() < Date.now();
  }
}
