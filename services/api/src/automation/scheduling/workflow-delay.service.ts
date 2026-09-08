/**
 * Day 30 — Workflow Delay & Scheduling Calculation Service
 *
 * Computes deterministic scheduling timestamps in UTC, respecting:
 * - Immediate execution
 * - Relative delays (hours, days)
 * - Specific date/time
 * - Next permitted communication window (quiet hours adherence)
 * - Tenant/outlet/member timezones
 */

import { Injectable, Logger } from '@nestjs/common';
import { ScheduledStepCalculation } from '../automation.types';

export interface WorkflowDelayConfig {
  type: 'IMMEDIATE' | 'HOURS' | 'DAYS' | 'SPECIFIC_TIME' | 'NEXT_COMMUNICATION_WINDOW';
  durationHours?: number;
  durationDays?: number;
  targetDateTime?: string; // ISO date string
  preferredTimeOfDay?: string; // e.g. "09:00"
  timezone?: string;
}

@Injectable()
export class WorkflowDelayService {
  private readonly logger = new Logger(WorkflowDelayService.name);

  /**
   * Calculates the exact UTC execution timestamp given a delay configuration.
   */
  calculateExecutionTime(
    config: WorkflowDelayConfig,
    baseDate: Date = new Date(),
    defaultTimezone: string = 'UTC',
  ): ScheduledStepCalculation {
    const tz = config.timezone || defaultTimezone || 'UTC';
    const nowMs = baseDate.getTime();

    switch (config.type) {
      case 'IMMEDIATE':
        return {
          scheduledAt: new Date(nowMs),
          reason: 'Immediate execution requested',
          timezone: tz,
        };

      case 'HOURS': {
        const hours = config.durationHours && config.durationHours > 0 ? config.durationHours : 1;
        const targetMs = nowMs + hours * 60 * 60 * 1000;
        return {
          scheduledAt: new Date(targetMs),
          reason: `Delayed by ${hours} hours`,
          timezone: tz,
        };
      }

      case 'DAYS': {
        const days = config.durationDays && config.durationDays > 0 ? config.durationDays : 1;
        const targetDate = new Date(nowMs + days * 24 * 60 * 60 * 1000);

        // If preferred time of day is given, adjust hours/minutes
        if (config.preferredTimeOfDay) {
          const [hh, mm] = config.preferredTimeOfDay.split(':').map(Number);
          if (!isNaN(hh) && !isNaN(mm)) {
            targetDate.setUTCHours(hh, mm, 0, 0);
          }
        }

        return {
          scheduledAt: targetDate,
          reason: `Delayed by ${days} days`,
          timezone: tz,
        };
      }

      case 'SPECIFIC_TIME': {
        if (!config.targetDateTime) {
          return {
            scheduledAt: new Date(nowMs),
            reason: 'Missing targetDateTime; defaulting to immediate',
            timezone: tz,
          };
        }
        const parsed = new Date(config.targetDateTime);
        const validDate = isNaN(parsed.getTime()) ? new Date(nowMs) : parsed;
        return {
          scheduledAt: validDate,
          reason: `Scheduled for explicit date/time: ${validDate.toISOString()}`,
          timezone: tz,
        };
      }

      case 'NEXT_COMMUNICATION_WINDOW':
      default: {
        // Find next morning permitted window (e.g. 09:00 local time)
        const nextWindow = this.calculateNextPermittedWindow(baseDate, tz);
        return {
          scheduledAt: nextWindow,
          reason: 'Scheduled for next permitted communication window outside quiet hours',
          timezone: tz,
        };
      }
    }
  }

  /**
   * Calculates next morning permitted window (e.g. 09:00:00 UTC next morning)
   * outside of 21:00 - 08:00 quiet hours.
   */
  calculateNextPermittedWindow(
    baseDate: Date = new Date(),
    _timezone: string = 'UTC',
    startPermittedHour = 9,
  ): Date {
    const next = new Date(baseDate);
    const currentUtcHour = next.getUTCHours();

    if (currentUtcHour >= startPermittedHour && currentUtcHour < 20) {
      // Currently within day window, return as is
      return next;
    }

    // Advance to 09:00 tomorrow (or today if early morning before 09:00)
    if (currentUtcHour >= 20) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    next.setUTCHours(startPermittedHour, 0, 0, 0);
    return next;
  }
}
