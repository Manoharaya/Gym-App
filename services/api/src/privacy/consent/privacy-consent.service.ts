import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ConsentImpactWarning {
  consentTypeKey: string;
  consequences: string;
  affectedFeatures: string[];
  historicalDataRetentionNote: string;
}

export const CONSENT_IMPACT_MAP: Record<string, ConsentImpactWarning> = {
  WEARABLE_DATA: {
    consentTypeKey: 'WEARABLE_DATA',
    consequences:
      'Turning off wearable data access will stop future wearable synchronization from connected devices.',
    affectedFeatures: ['Wearable Sync', 'Daily Biometrics', 'Sleep Recovery Insights'],
    historicalDataRetentionNote:
      'Previously synchronized wearable records are retained according to your configured retention and privacy policy unless explicit deletion is requested.',
  },
  HEALTH_DATA_PROCESSING: {
    consentTypeKey: 'HEALTH_DATA_PROCESSING',
    consequences:
      'Withdrawing health data consent will prevent fitness and nutrition coaches from referencing medical flags, injuries, or health clearance documents.',
    affectedFeatures: ['Personalized Safety Recommendations', 'Trainer Health Flags', 'Par-Q Review'],
    historicalDataRetentionNote:
      'Historical safety records must be preserved for medical liability and insurance compliance for the legally required duration.',
  },
  AI_PROCESSING: {
    consentTypeKey: 'AI_PROCESSING',
    consequences:
      'Turning off AI processing will disable personalized AI coaching, tailored workout adaptations, and automated daily check-ins.',
    affectedFeatures: ['AI Coaching Engine', 'AI Fitness Coach', 'AI Nutrition Coach', 'Check-In Intelligence'],
    historicalDataRetentionNote:
      'Past conversational interactions will be excluded from future AI context windows and scheduled for retention deletion.',
  },
  AI_DATA_PROCESSING: {
    consentTypeKey: 'AI_DATA_PROCESSING',
    consequences:
      'Turning off AI processing will disable personalized AI coaching, tailored workout adaptations, and automated daily check-ins.',
    affectedFeatures: ['AI Coaching Engine', 'AI Fitness Coach', 'AI Nutrition Coach', 'Check-In Intelligence'],
    historicalDataRetentionNote:
      'Past conversational interactions will be excluded from future AI context windows and scheduled for retention deletion.',
  },
  MARKETING: {
    consentTypeKey: 'MARKETING',
    consequences:
      'Opting out of marketing will stop promotional announcements, special membership offers, and event discounts.',
    affectedFeatures: ['Promotional Campaigns', 'Partner Offers', 'Newsletter'],
    historicalDataRetentionNote:
      'Essential operational and security communications will remain active as required for account management.',
  },
  COMMUNICATION: {
    consentTypeKey: 'COMMUNICATION',
    consequences:
      'Non-essential engagement messages and reminders will be stopped.',
    affectedFeatures: ['Workout Reminders', 'Streak Celebrations', 'Engagement Check-Ins'],
    historicalDataRetentionNote:
      'Transactional receipts, billing statements, and security alerts cannot be disabled.',
  },
};

@Injectable()
export class PrivacyConsentService {
  private readonly logger = new Logger(PrivacyConsentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all consent types with their latest published version and member's current status.
   */
  async getMemberConsents(memberId: string) {
    const consentTypes = await this.prisma.consentType.findMany({
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        records: {
          where: { memberProfileId: memberId },
          orderBy: { consentedAt: 'desc' },
          take: 1,
          include: {
            consentVersion: true,
          },
        },
      },
    });

    return consentTypes.map((type) => {
      const latestVersion = type.versions[0];
      const latestRecord = type.records[0];

      const isConsented = latestRecord?.status === 'CONSENTED';
      const requiresReconsent =
        latestVersion &&
        latestRecord &&
        latestRecord.consentVersionId !== latestVersion.id &&
        latestVersion.requiresReconsent;

      const impact = CONSENT_IMPACT_MAP[type.key] || {
        consentTypeKey: type.key,
        consequences: `Withdrawing consent for ${type.name} will restrict associated optional features.`,
        affectedFeatures: [type.name],
        historicalDataRetentionNote: 'Historical data is retained according to platform policy.',
      };

      const normalizedStatus =
        latestRecord?.status === 'CONSENTED'
          ? 'GRANTED'
          : latestRecord?.status === 'WITHDRAWN'
          ? 'REVOKED'
          : latestRecord?.status || 'NOT_REQUESTED';

      return {
        id: type.id,
        key: type.key,
        consentTypeKey: type.key,
        name: type.name,
        status: normalizedStatus,
        description: type.description,
        isMandatory: type.isMandatory,
        latestVersion: latestVersion
          ? {
              id: latestVersion.id,
              version: latestVersion.version,
              title: latestVersion.title || type.name,
              summary: latestVersion.summary || latestVersion.content,
              effectiveFrom: latestVersion.effectiveFrom.toISOString(),
            }
          : null,
        memberStatus: {
          consented: isConsented,
          status: normalizedStatus,
          consentedAt: latestRecord?.consentedAt?.toISOString() || null,
          withdrawnAt: latestRecord?.withdrawnAt?.toISOString() || null,
          consentedVersion: latestRecord?.consentVersion?.version || null,
          requiresReconsent: !!requiresReconsent,
        },
        withdrawalImpact: impact,
      };
    });
  }

  /**
   * Evaluates the consequences of withdrawing consent before the action is executed.
   */
  async getWithdrawalImpact(consentTypeKey: string): Promise<ConsentImpactWarning> {
    const warning = CONSENT_IMPACT_MAP[consentTypeKey];
    if (warning) return warning;

    const consentType = await this.prisma.consentType.findUnique({
      where: { key: consentTypeKey },
    });

    if (!consentType) {
      throw new NotFoundException(`Consent type '${consentTypeKey}' not found`);
    }

    return {
      consentTypeKey,
      consequences: `Withdrawing consent for ${consentType.name} may disable optional services.`,
      affectedFeatures: [consentType.name],
      historicalDataRetentionNote: 'Prior records are retained per standard organizational retention policies.',
    };
  }

  /**
   * Withdraws consent for a specific consent type.
   * Preserves immutable historical audit records.
   */
  async withdrawConsent(
    memberId: string,
    consentTypeKey: string,
    options?: {
      reason?: string;
      actorUserId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    let consentType = await this.prisma.consentType.findUnique({
      where: { key: consentTypeKey },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!consentType) {
      consentType = await this.prisma.consentType.create({
        data: {
          key: consentTypeKey,
          name: consentTypeKey.replace(/_/g, ' '),
          description: `Consent policy for ${consentTypeKey}`,
          isMandatory: false,
          versions: {
            create: {
              version: '1.0',
              content: `Policy terms for ${consentTypeKey}`,
              effectiveFrom: new Date(),
            },
          },
        },
        include: {
          versions: true,
        },
      });
    }

    if (consentType.isMandatory) {
      throw new BadRequestException(
        `Consent type '${consentType.name}' is mandatory for gym operations and cannot be withdrawn while maintaining an active membership.`,
      );
    }

    const latestVersion = consentType.versions[0];

    // Create a new record with status WITHDRAWN to preserve audit trail
    const record = await this.prisma.consentRecord.create({
      data: {
        memberProfileId: memberId,
        consentTypeId: consentType.id,
        consentVersionId: latestVersion.id,
        status: 'WITHDRAWN',
        consentedAt: new Date(),
        withdrawnAt: new Date(),
        actorUserId: options?.actorUserId || null,
        withdrawalReason: options?.reason || 'Member requested withdrawal via Privacy Center',
        source: 'PRIVACY_CENTER',
        ipAddress: options?.ipAddress || null,
        userAgent: options?.userAgent || null,
      },
    });

    const impact = await this.getWithdrawalImpact(consentTypeKey);
    this.logger.log(`Consent '${consentTypeKey}' withdrawn by member ${memberId}`);

    return {
      success: true,
      consentTypeKey,
      status: 'REVOKED',
      withdrawnAt: record.withdrawnAt,
      recordId: record.id,
      impactAnalysis: impact,
    };
  }

  /**
   * Grants or updates consent for a specific consent type.
   */
  async grantConsent(
    memberId: string,
    consentTypeKey: string,
    options?: {
      actorUserId?: string;
      ipAddress?: string;
      userAgent?: string;
      evidenceReference?: string;
    },
  ) {
    let consentType = await this.prisma.consentType.findUnique({
      where: { key: consentTypeKey },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!consentType) {
      consentType = await this.prisma.consentType.create({
        data: {
          key: consentTypeKey,
          name: consentTypeKey.replace(/_/g, ' '),
          description: `Consent policy for ${consentTypeKey}`,
          isMandatory: false,
          versions: {
            create: {
              version: '1.0',
              content: `Policy terms for ${consentTypeKey}`,
              effectiveFrom: new Date(),
            },
          },
        },
        include: {
          versions: true,
        },
      });
    }

    const latestVersion = consentType.versions[0];

    const record = await this.prisma.consentRecord.create({
      data: {
        memberProfileId: memberId,
        consentTypeId: consentType.id,
        consentVersionId: latestVersion.id,
        status: 'CONSENTED',
        consentedAt: new Date(),
        actorUserId: options?.actorUserId || null,
        evidenceReference: options?.evidenceReference || 'MEMBER_APP_INTERACTION',
        source: 'PRIVACY_CENTER',
        ipAddress: options?.ipAddress || null,
        userAgent: options?.userAgent || null,
      },
    });

    this.logger.log(`Consent '${consentTypeKey}' granted by member ${memberId}`);

    return {
      success: true,
      consentTypeKey,
      status: 'GRANTED',
      consentedAt: record.consentedAt,
      recordId: record.id,
    };
  }
}
