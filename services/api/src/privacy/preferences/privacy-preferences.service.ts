import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdatePrivacyPreferencesDto } from '../dto/privacy.dto';

@Injectable()
export class PrivacyPreferencesService {
  private readonly logger = new Logger(PrivacyPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves or initializes member privacy preferences.
   */
  async getPreferences(memberId: string, organisationId: string) {
    let prefs = await this.prisma.memberPrivacyPreference.findUnique({
      where: { memberId },
    });

    if (!prefs) {
      prefs = await this.prisma.memberPrivacyPreference.create({
        data: {
          memberId,
          organisationId,
          aiPersonalization: true,
          analytics: true,
          marketing: false,
          wearables: true,
          dataSharing: false,
          personalization: true,
        },
      });
    }

    // Also fetch communication preferences from Day 28
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });

    const commPrefs = member?.userId
      ? await this.prisma.communicationPreference.findMany({
          where: { userId: member.userId, organisationId },
        })
      : [];

    return {
      privacy: {
        id: prefs.id,
        memberId: prefs.memberId,
        organisationId: prefs.organisationId,
        aiPersonalization: prefs.aiPersonalization,
        aiPersonalizationEnabled: prefs.aiPersonalization,
        analytics: prefs.analytics,
        marketing: prefs.marketing,
        marketingConsent: prefs.marketing,
        wearables: prefs.wearables,
        wearableDataSharing: prefs.wearables,
        dataSharing: prefs.dataSharing,
        personalization: prefs.personalization,
        updatedAt: prefs.updatedAt.toISOString(),
      },
      securityAlertsEnabled: true,
      billingReceiptsEnabled: true,
      communications: commPrefs.map((cp) => ({
        channel: cp.channel,
        type: cp.type,
        enabled: cp.enabled,
        optedOutAt: cp.optedOutAt?.toISOString() || null,
      })),
    };
  }

  /**
   * Updates privacy preferences for a member.
   */
  async updatePreferences(
    memberId: string,
    organisationId: string,
    dto: UpdatePrivacyPreferencesDto,
  ) {
    const aiPersonalization = dto.aiPersonalization ?? dto.aiPersonalizationEnabled;
    const wearables = dto.wearables ?? dto.wearableDataSharing;
    const marketing = dto.marketing ?? dto.marketingConsent;

    const prefs = await this.prisma.memberPrivacyPreference.upsert({
      where: { memberId },
      create: {
        memberId,
        organisationId,
        aiPersonalization: aiPersonalization ?? true,
        analytics: dto.analytics ?? true,
        marketing: marketing ?? false,
        wearables: wearables ?? true,
        dataSharing: dto.dataSharing ?? false,
        personalization: dto.personalization ?? true,
      },
      update: {
        ...(aiPersonalization !== undefined && { aiPersonalization }),
        ...(dto.analytics !== undefined && { analytics: dto.analytics }),
        ...(marketing !== undefined && { marketing }),
        ...(wearables !== undefined && { wearables }),
        ...(dto.dataSharing !== undefined && { dataSharing: dto.dataSharing }),
        ...(dto.personalization !== undefined && { personalization: dto.personalization }),
      },
    });

    this.logger.log(`Privacy preferences updated for member ${memberId}`);

    return {
      id: prefs.id,
      memberId: prefs.memberId,
      organisationId: prefs.organisationId,
      aiPersonalization: prefs.aiPersonalization,
      aiPersonalizationEnabled: prefs.aiPersonalization,
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      marketingConsent: prefs.marketing,
      wearables: prefs.wearables,
      wearableDataSharing: prefs.wearables,
      dataSharing: prefs.dataSharing,
      personalization: prefs.personalization,
      updatedAt: prefs.updatedAt.toISOString(),
    };
  }

  /**
   * Updates communication preference channel for member (Day 28 integration).
   * Invariant: Cannot disable SECURITY or TRANSACTIONAL messages.
   */
  async updateCommunicationPreference(
    memberId: string,
    organisationId: string,
    channel: string,
    type: string,
    enabled: boolean,
  ) {
    if (['TRANSACTIONAL', 'SECURITY', 'SYSTEM'].includes(type.toUpperCase()) && !enabled) {
      throw new Error(`Cannot disable mandatory ${type} communications required for account security and compliance.`);
    }

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });

    if (!member?.userId) {
      throw new Error(`Member profile ${memberId} has no associated user`);
    }

    const updated = await this.prisma.communicationPreference.upsert({
      where: {
        userId_organisationId_channel_type: {
          userId: member.userId,
          organisationId,
          channel: channel.toUpperCase(),
          type: type.toUpperCase(),
        },
      },
      create: {
        userId: member.userId,
        organisationId,
        channel: channel.toUpperCase(),
        type: type.toUpperCase(),
        enabled,
        optedOutAt: enabled ? null : new Date(),
      },
      update: {
        enabled,
        optedOutAt: enabled ? null : new Date(),
      },
    });

    return updated;
  }
}
