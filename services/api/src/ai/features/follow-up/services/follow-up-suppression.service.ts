/**
 * Day 39 — Follow-Up Suppression Service
 * Enforces centralized suppression: opt-outs, quiet hours, cooldown periods, and frequency limits.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  FollowUpSuppressionResult,
  FollowUpStepChannel,
} from '@fitcore/types';

@Injectable()
export class FollowUpSuppressionService {
  private readonly logger = new Logger(FollowUpSuppressionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates all suppression criteria immediately prior to step execution.
   */
  async evaluateSuppression(
    organisationId: string,
    params: {
      leadId?: string;
      memberId?: string;
      channel: FollowUpStepChannel;
      outletTimezone?: string;
      cooldownHours?: number;
      maxPerWeek?: number;
      quietHoursStart?: string; // "21:00"
      quietHoursEnd?: string;   // "08:00"
    },
  ): Promise<FollowUpSuppressionResult> {
    const {
      leadId,
      channel,
      cooldownHours,
      maxPerWeek,
      quietHoursStart,
      quietHoursEnd,
    } = params;

    // 1. Check Explicit Database Suppressions
    if (leadId) {
      const activeSuppression = await this.prisma.followUpSuppression.findFirst({
        where: {
          organisationId,
          leadId,
          OR: [{ channel }, { channel: null }],
          AND: [
            {
              OR: [
                { activeUntil: null },
                { activeUntil: { gt: new Date() } },
              ],
            },
          ],
        },
      });

      if (activeSuppression) {
        return {
          suppressed: true,
          reason: activeSuppression.reason as any,
          message: `Suppressed due to active suppression record: ${activeSuppression.reason}`,
          activeUntil: activeSuppression.activeUntil || undefined,
        };
      }
    }

    // 2. Check Lead Consent / Opt-Out Status
    if (leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { consentStatus: true, status: true },
      });

      if (lead) {
        if (lead.consentStatus === 'DENIED' || lead.consentStatus === 'WITHDRAWN') {
          return {
            suppressed: true,
            reason: 'CONSENT_WITHDRAWN',
            message: `Lead has opted out or withdrawn communication consent (${lead.consentStatus})`,
          };
        }
        if (lead.status === 'CONVERTED') {
          return {
            suppressed: true,
            reason: 'CONVERTED',
            message: 'Lead has already converted to a paying member',
          };
        }
        if (lead.status === 'HANDOFF_IN_PROGRESS') {
          return {
            suppressed: true,
            reason: 'HANDOFF',
            message: 'Lead is in active staff handoff',
          };
        }
      }
    }

    // 3. Check Cooldown Period (e.g. 1 message per 24 hours to this recipient)
    if (leadId && cooldownHours && cooldownHours > 0) {
      const cooldownThreshold = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
      const recentExecution = await this.prisma.followUpStepExecution.findFirst({
        where: {
          organisationId,
          enrollment: { leadId },
          status: 'SUCCESS',
          executedAt: { gte: cooldownThreshold },
        },
        orderBy: { executedAt: 'desc' },
      });

      if (recentExecution && recentExecution.executedAt) {
        const cooldownRemainingMs =
          recentExecution.executedAt.getTime() + cooldownHours * 60 * 60 * 1000 - Date.now();
        if (cooldownRemainingMs > 0) {
          return {
            suppressed: true,
            reason: 'COOLDOWN',
            message: `Recipient is in cooldown period until ${new Date(Date.now() + cooldownRemainingMs).toISOString()}`,
            activeUntil: new Date(Date.now() + cooldownRemainingMs),
          };
        }
      }
    }

    // 4. Check Frequency Capping (e.g. max 4 messages in last 7 days)
    if (leadId && maxPerWeek && maxPerWeek > 0) {
      const weekThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyExecutionCount = await this.prisma.followUpStepExecution.count({
        where: {
          organisationId,
          enrollment: { leadId },
          status: 'SUCCESS',
          executedAt: { gte: weekThreshold },
        },
      });

      if (weeklyExecutionCount >= maxPerWeek) {
        return {
          suppressed: true,
          reason: 'FREQUENCY_EXCEEDED',
          message: `Weekly message limit (${maxPerWeek}) reached for recipient`,
        };
      }
    }

    // 5. Check Quiet Hours (Section 14)
    if (quietHoursStart && quietHoursEnd && this.isWithinQuietHours(quietHoursStart, quietHoursEnd)) {
      return {
        suppressed: true,
        reason: 'QUIET_HOURS',
        message: `Current time is within configured quiet hours (${quietHoursStart} - ${quietHoursEnd})`,
      };
    }

    return {
      suppressed: false,
    };
  }

  /**
   * Evaluates whether the current local time falls into quiet hours.
   */
  isWithinQuietHours(quietStart: string, quietEnd: string, currentLocalHourMinutes?: string): boolean {
    let nowStr = currentLocalHourMinutes;
    if (!nowStr) {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      nowStr = `${hours}:${mins}`;
    }

    const [startH, startM] = quietStart.split(':').map(Number);
    const [endH, endM] = quietEnd.split(':').map(Number);
    const [curH, curM] = nowStr.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const curMinutes = curH * 60 + curM;

    if (startMinutes > endMinutes) {
      // Overnight window (e.g., 21:00 to 08:00)
      return curMinutes >= startMinutes || curMinutes < endMinutes;
    } else {
      // Intraday window
      return curMinutes >= startMinutes && curMinutes < endMinutes;
    }
  }

  /**
   * Manually record a suppression.
   */
  async recordSuppression(
    organisationId: string,
    leadId: string,
    reason: string,
    channel?: string,
    activeUntil?: Date,
  ) {
    return this.prisma.followUpSuppression.create({
      data: {
        organisationId,
        leadId,
        channel: channel || null,
        reason,
        activeUntil: activeUntil || null,
      },
    });
  }
}
