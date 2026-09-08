import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ConsentPolicyService } from './consent-policy.service';
import {
  CommunicationChannel,
  CommunicationType,
  CommunicationPreferenceDto,
} from '../communications.types';
import {
  TRANSACTIONAL_COMMUNICATION_TYPES,
  COMMUNICATION_AUDIT_ACTIONS,
} from '../communications.constants';

@Injectable()
export class CommunicationPreferenceService {
  private readonly logger = new Logger(CommunicationPreferenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly consentPolicy: ConsentPolicyService,
  ) {}

  /**
   * Retrieves all communication preferences for a user within an organisation.
   */
  async getPreferences(userId: string, organisationId: string) {
    const preferences = await this.prisma.communicationPreference.findMany({
      where: { userId, organisationId },
    });

    const marketingConsent = await this.consentPolicy.checkCanonicalMarketingConsent(userId);

    return {
      userId,
      organisationId,
      marketingConsentActive: marketingConsent,
      preferences,
    };
  }

  /**
   * Updates communication preferences for specific channel and communication type.
   */
  async updatePreference(
    userId: string,
    organisationId: string,
    channel: CommunicationChannel,
    type: CommunicationType,
    enabled: boolean,
  ) {
    // Transactional communications cannot be disabled
    if (TRANSACTIONAL_COMMUNICATION_TYPES.includes(type as any) && !enabled) {
      throw new BadRequestException(
        `Critical communication type '${type}' cannot be disabled for compliance reasons`
      );
    }

    const preference = await this.prisma.communicationPreference.upsert({
      where: {
        userId_organisationId_channel_type: {
          userId,
          organisationId,
          channel,
          type,
        },
      },
      update: {
        enabled,
        optedOutAt: enabled ? null : new Date(),
      },
      create: {
        userId,
        organisationId,
        channel,
        type,
        enabled,
        optedOutAt: enabled ? null : new Date(),
      },
    });

    await this.auditService.log({
      userId,
      organisationId,
      action: COMMUNICATION_AUDIT_ACTIONS.PREFERENCE_UPDATED,
      resource: 'communication_preference',
      resourceId: preference.id,
      metadata: { channel, type, enabled },
    });

    return preference;
  }

  /**
   * Processes an opt-out (e.g., from SMS "STOP" or email Unsubscribe webhook).
   */
  async recordOptOut(
    userId: string,
    organisationId: string,
    channel: CommunicationChannel,
    type?: CommunicationType,
  ) {
    const typesToOptOut: CommunicationType[] = type
      ? [type]
      : ['MARKETING', 'ENGAGEMENT', 'REACTIVATION', 'REMINDER'];

    const results = [];
    for (const commType of typesToOptOut) {
      if (TRANSACTIONAL_COMMUNICATION_TYPES.includes(commType as any)) continue;

      const pref = await this.prisma.communicationPreference.upsert({
        where: {
          userId_organisationId_channel_type: {
            userId,
            organisationId,
            channel,
            type: commType,
          },
        },
        update: {
          enabled: false,
          optedOutAt: new Date(),
        },
        create: {
          userId,
          organisationId,
          channel,
          type: commType,
          enabled: false,
          optedOutAt: new Date(),
        },
      });
      results.push(pref);
    }

    await this.auditService.log({
      userId,
      organisationId,
      action: COMMUNICATION_AUDIT_ACTIONS.UNSUBSCRIBED,
      resource: 'communication_preference',
      metadata: { channel, types: typesToOptOut },
    });

    return results;
  }

  /**
   * Checks whether communication is enabled for user based on channel and type.
   */
  async isChannelAllowed(
    userId: string,
    organisationId: string,
    channel: CommunicationChannel,
    type: CommunicationType,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Transactional communications always allowed
    if (TRANSACTIONAL_COMMUNICATION_TYPES.includes(type as any)) {
      return { allowed: true };
    }

    const pref = await this.prisma.communicationPreference.findUnique({
      where: {
        userId_organisationId_channel_type: {
          userId,
          organisationId,
          channel,
          type,
        },
      },
    });

    if (pref && !pref.enabled) {
      return {
        allowed: false,
        reason: `OPTED_OUT: User has opted out of ${type} communications on ${channel}`,
      };
    }

    return { allowed: true };
  }
}
