import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConsentPolicyService } from '../preferences/consent-policy.service';
import { CommunicationPreferenceService } from '../preferences/communication-preference.service';
import {
  CommunicationChannel,
  CommunicationType,
  CommunicationPolicyResult,
} from '../communications.types';
import {
  TRANSACTIONAL_COMMUNICATION_TYPES,
  DEFAULT_QUIET_HOURS,
  RATE_LIMIT_CONFIG,
} from '../communications.constants';

export interface PolicyEvaluation {
  result: CommunicationPolicyResult;
  reason?: string;
  delayUntil?: Date;
}

@Injectable()
export class DeliveryPolicyService {
  private readonly logger = new Logger(DeliveryPolicyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly consentPolicy: ConsentPolicyService,
    private readonly preferenceService: CommunicationPreferenceService,
  ) {}

  /**
   * Evaluates whether a proposed communication is permitted to proceed,
   * needs suppression, or requires quiet-hour delaying.
   */
  async evaluatePolicy(params: {
    organisationId: string;
    outletId?: string;
    userId?: string;
    memberId?: string;
    channel: CommunicationChannel;
    type: CommunicationType;
    templateId?: string;
    timezone?: string;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  }): Promise<PolicyEvaluation> {
    const {
      organisationId,
      userId,
      memberId,
      channel,
      type,
      templateId,
      timezone = DEFAULT_QUIET_HOURS.TIMEZONE,
      quietHoursStart,
      quietHoursEnd,
    } = params;

    const isTransactional = TRANSACTIONAL_COMMUNICATION_TYPES.includes(type as any);

    // 1. Consent Check (Section 24)
    if (userId) {
      const consentResult = await this.consentPolicy.evaluateConsent(userId, type);
      if (!consentResult.allowed) {
        return {
          result: 'MISSING_CONSENT',
          reason: consentResult.reason,
        };
      }
    }

    // 2. User Preferences Check (Section 22, 23)
    if (userId) {
      const prefResult = await this.preferenceService.isChannelAllowed(
        userId,
        organisationId,
        channel,
        type
      );
      if (!prefResult.allowed) {
        return {
          result: 'OPTED_OUT',
          reason: prefResult.reason,
        };
      }
    }

    // 3. Duplicate Suppression Window (Section 35)
    // Only check duplicate suppression if templateId is specified
    if ((userId || memberId) && templateId) {
      const isDuplicate = await this.checkDuplicateSuppression({
        userId,
        memberId,
        templateId,
        type,
        windowSeconds: RATE_LIMIT_CONFIG.DUPLICATE_SUPPRESSION_WINDOW_SECONDS,
      });

      if (isDuplicate) {
        return {
          result: 'SUPPRESSED',
          reason: 'DUPLICATE_SUPPRESSION: Identical template dispatched within suppression window',
        };
      }
    }

    // 4. Rate Limiting Check (Section 44)
    if (userId) {
      const isRateLimited = await this.checkRateLimit(userId, RATE_LIMIT_CONFIG.MAX_PER_RECIPIENT_PER_MINUTE);
      if (isRateLimited) {
        return {
          result: 'SUPPRESSED',
          reason: 'RATE_LIMITED: Maximum recipient message frequency exceeded',
        };
      }
    }

    // 5. Quiet Hours Evaluation (Section 45) - Only for intrusive channels with configured quiet hours
    if (!isTransactional && (channel === 'SMS' || channel === 'PUSH') && quietHoursStart && quietHoursEnd) {
      const inQuietHours = this.isWithinQuietHours(
        quietHoursStart,
        quietHoursEnd,
        timezone
      );
      if (inQuietHours) {
        return {
          result: 'SUPPRESSED',
          reason: 'QUIET_HOURS: Non-transactional communication suppressed during quiet hours',
        };
      }
    }

    return { result: 'ALLOWED' };
  }

  /**
   * Checks for duplicate communications within the suppression window.
   */
  private async checkDuplicateSuppression(params: {
    userId?: string;
    memberId?: string;
    templateId?: string;
    type: CommunicationType;
    windowSeconds: number;
  }): Promise<boolean> {
    if (!params.templateId) return false;

    const windowStart = new Date(Date.now() - params.windowSeconds * 1000);

    const where: any = {
      createdAt: { gte: windowStart },
      type: params.type,
      templateId: params.templateId,
      status: { notIn: ['FAILED', 'CANCELLED'] },
    };

    if (params.userId) where.recipientUserId = params.userId;
    if (params.memberId) where.recipientMemberId = params.memberId;

    const count = await this.prisma.communication.count({ where });
    return count > 0;
  }

  /**
   * Checks if recipient received too many messages in the last minute.
   */
  private async checkRateLimit(userId: string, maxPerMinute: number): Promise<boolean> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const count = await this.prisma.communication.count({
      where: {
        recipientUserId: userId,
        createdAt: { gte: oneMinuteAgo },
      },
    });
    return count >= maxPerMinute;
  }

  /**
   * Evaluates if current time in specified timezone is inside quiet hours.
   */
  isWithinQuietHours(start: string, end: string, timezone: string): boolean {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });

      const parts = formatter.formatToParts(new Date());
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      const currentMinutes = hour * 60 + minute;

      const [startH, startM] = start.split(':').map((v) => parseInt(v, 10));
      const [endH, endM] = end.split(':').map((v) => parseInt(v, 10));
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes > endMinutes) {
        // Crosses midnight (e.g. 21:00 to 08:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } catch {
      return false;
    }
  }
}
