import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  NotificationCategoryEnum,
  NotificationChannelEnum,
  NotificationPriorityEnum,
  UpdateNotificationPreferencesDto,
} from '../dto/communication.dto';

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Retrieves all notification preferences for a user under an organisation.
   */
  async getUserPreferences(userId: string, organisationId: string) {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId, organisationId },
    });

    // Check canonical marketing consent
    const marketingConsent = await this.checkMarketingConsent(userId);

    return {
      preferences,
      marketingConsentActive: marketingConsent,
    };
  }

  /**
   * Upserts a preference for a specific category and channel.
   */
  async updatePreference(
    userId: string,
    organisationId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    const pref = await this.prisma.notificationPreference.upsert({
      where: {
        userId_organisationId_category_channel: {
          userId,
          organisationId,
          category: dto.category,
          channel: dto.channel,
        },
      },
      update: {
        enabled: dto.enabled,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        timezone: dto.timezone ?? 'UTC',
      },
      create: {
        userId,
        organisationId,
        category: dto.category,
        channel: dto.channel,
        enabled: dto.enabled,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        timezone: dto.timezone ?? 'UTC',
      },
    });

    await this.audit.log({
      userId,
      action: 'NOTIFICATION_PREFERENCE_CHANGED',
      resource: 'notification_preferences',
      resourceId: pref.id,
      organisationId,
      metadata: {
        category: dto.category,
        channel: dto.channel,
        enabled: dto.enabled,
      },
    });

    return pref;
  }

  /**
   * Evaluates if a given notification should be delivered to the specified channel
   * considering user preference, marketing consent, and quiet hours.
   */
  async isDeliveryAllowed(
    userId: string,
    organisationId: string,
    category: NotificationCategoryEnum,
    channel: NotificationChannelEnum,
    priority: NotificationPriorityEnum = NotificationPriorityEnum.NORMAL,
    isMarketing: boolean = false,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Transactional bypass for security and critical payment alerts
    const isCritical =
      category === NotificationCategoryEnum.SECURITY ||
      priority === NotificationPriorityEnum.URGENT;

    // 2. In-app notifications are always captured into notification center
    if (channel === NotificationChannelEnum.IN_APP) {
      return { allowed: true };
    }

    // 3. Marketing Consent Check (Slice 5)
    if (isMarketing || category === NotificationCategoryEnum.MARKETING) {
      const hasConsent = await this.checkMarketingConsent(userId);
      if (!hasConsent) {
        return {
          allowed: false,
          reason: 'MARKETING_CONSENT_WITHDRAWN_OR_MISSING',
        };
      }
    }

    // 4. Check user explicit preference
    const preference = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_organisationId_category_channel: {
          userId,
          organisationId,
          category,
          channel,
        },
      },
    });

    if (preference && !preference.enabled) {
      if (isCritical) {
        // Critical alerts cannot be turned off for security/fraud reasons
        return { allowed: true };
      }
      return { allowed: false, reason: 'USER_OPTED_OUT' };
    }

    // 5. Check Quiet Hours for intrusive channels (PUSH, SMS)
    if (
      preference &&
      (channel === NotificationChannelEnum.PUSH || channel === NotificationChannelEnum.SMS) &&
      preference.quietHoursStart &&
      preference.quietHoursEnd &&
      !isCritical
    ) {
      const inQuietHours = this.isCurrentlyInQuietHours(
        preference.quietHoursStart,
        preference.quietHoursEnd,
        preference.timezone || 'UTC',
      );

      if (inQuietHours) {
        return { allowed: false, reason: 'QUIET_HOURS_ACTIVE' };
      }
    }

    return { allowed: true };
  }

  /**
   * Checks whether the user has consented to marketing communications
   * in the canonical Day 4 ConsentRecord table.
   */
  private async checkMarketingConsent(userId: string): Promise<boolean> {
    const memberProfile = await this.prisma.memberProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!memberProfile) {
      return false;
    }

    const marketingConsentType = await this.prisma.consentType.findFirst({
      where: {
        key: { in: ['MARKETING', 'MARKETING_COMMUNICATIONS', 'PROMOTIONAL'] },
      },
    });

    if (!marketingConsentType) {
      // If no explicit marketing consent type exists, default to false for privacy
      return false;
    }

    const latestRecord = await this.prisma.consentRecord.findFirst({
      where: {
        memberProfileId: memberProfile.id,
        consentTypeId: marketingConsentType.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    return latestRecord?.status === 'CONSENTED';
  }

  /**
   * Determines if current time in given timezone falls within quiet hours (HH:mm - HH:mm).
   */
  private isCurrentlyInQuietHours(
    start: string,
    end: string,
    timezone: string,
  ): boolean {
    try {
      const now = new Date();
      // Format current time in user's timezone to HH:mm
      const timeString = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);

      if (start <= end) {
        // e.g. 13:00 to 17:00
        return timeString >= start && timeString < end;
      } else {
        // Over midnight, e.g. 22:00 to 07:00
        return timeString >= start || timeString < end;
      }
    } catch {
      // Fallback on invalid timezone
      return false;
    }
  }
}
