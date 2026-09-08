/**
 * Day 30 — Workflow Safety & Policy Guardrails Service
 *
 * Ensures:
 * 1. ZERO autonomous high-risk actions (no cancellations, price edits, discounts, gate lockouts).
 * 2. Quiet hours respect (delayed until next daylight window).
 * 3. Anti-shaming content inspection.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WorkflowActionDefinition, WorkflowSafetyPolicy } from '@fitcore/types';
import { PROHIBITED_WORKFLOW_ACTIONS, WORKFLOW_DEFAULTS } from '../automation.constants';

const SHAMING_KEYWORDS = [
  'lazy',
  'fat',
  'failure',
  'disappointing',
  'shame',
  'guilt',
  'slacker',
  'worthless',
  'pathetic',
  'disgrace',
];

@Injectable()
export class WorkflowSafetyService {
  private readonly logger = new Logger(WorkflowSafetyService.name);

  /**
   * Validates workflow actions to ensure no forbidden operations are present.
   */
  validateActionsSafety(actions: WorkflowActionDefinition[]): void {
    for (const action of actions) {
      if (PROHIBITED_WORKFLOW_ACTIONS.includes(action.type as any)) {
        throw new BadRequestException(
          `Action type '${action.type}' is strictly prohibited in automated workflows. Autonomous high-risk mutations are not permitted.`,
        );
      }

      // Check action payload parameters
      if (action.params) {
        if (action.params.price || action.params.discountPercentage || action.params.cancelMembership) {
          throw new BadRequestException(
            `Action '${action.type}' contains forbidden parameter modifications (pricing, discounts, or cancellation).`,
          );
        }

        // Anti-shaming text verification for communication actions
        if (action.params.message) {
          this.validateToneAndShaming(action.params.message);
        }
        if (action.params.subject) {
          this.validateToneAndShaming(action.params.subject);
        }
        if (action.params.messageNepali) {
          this.validateToneAndShaming(action.params.messageNepali);
        }
      }
    }
  }

  /**
   * Validates message tone to prevent shaming language.
   */
  validateToneAndShaming(text: string): void {
    if (!text) return;
    const lower = text.toLowerCase();
    for (const word of SHAMING_KEYWORDS) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(lower)) {
        throw new BadRequestException(
          `Message violates gym brand safety standards. Prohibited shaming language detected: '${word}'. Communications must be encouraging, respectful, and supportive.`,
        );
      }
    }
  }

  /**
   * Checks whether the current time falls inside quiet hours.
   * If true, returns the recommended delayed execution time.
   */
  checkQuietHours(
    policy?: WorkflowSafetyPolicy | null,
    now: Date = new Date(),
  ): { isQuietHour: boolean; resumeAt?: Date } {
    if (!policy?.respectQuietHours) {
      return { isQuietHour: false };
    }

    const timezone = policy.timezone || WORKFLOW_DEFAULTS.DEFAULT_TIMEZONE;
    const quietStart = policy.quietHoursStart || WORKFLOW_DEFAULTS.QUIET_HOURS_START; // e.g. "22:00"
    const quietEnd = policy.quietHoursEnd || WORKFLOW_DEFAULTS.QUIET_HOURS_END;       // e.g. "07:00"

    // Parse time in designated timezone
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = timeFormatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const currentMinutes = hour * 60 + minute;

    const [startH, startM] = quietStart.split(':').map(Number);
    const [endH, endM] = quietEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let inQuietHours = false;
    if (startMinutes > endMinutes) {
      // Overnight (e.g. 22:00 to 07:00)
      inQuietHours = currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      inQuietHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    if (inQuietHours) {
      // Calculate next available time after quietEnd
      let minutesUntilResume = 0;
      if (currentMinutes >= startMinutes) {
        // Before midnight
        minutesUntilResume = 1440 - currentMinutes + endMinutes;
      } else {
        // After midnight
        minutesUntilResume = endMinutes - currentMinutes;
      }
      const resumeAt = new Date(now.getTime() + (minutesUntilResume + 5) * 60 * 1000); // 5 min buffer
      return { isQuietHour: true, resumeAt };
    }

    return { isQuietHour: false };
  }
}
