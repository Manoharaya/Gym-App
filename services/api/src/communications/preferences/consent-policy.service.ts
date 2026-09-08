import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CommunicationType } from '../communications.types';
import { TRANSACTIONAL_COMMUNICATION_TYPES } from '../communications.constants';

export interface ConsentEvaluationResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class ConsentPolicyService {
  private readonly logger = new Logger(ConsentPolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates canonical Day 4 consent compliance for a communication.
   * Transactional and security messages are permitted by legal contract basis.
   * Marketing and non-essential engagement communications strictly require active consent.
   */
  async evaluateConsent(
    userId: string,
    communicationType: CommunicationType,
  ): Promise<ConsentEvaluationResult> {
    // 1. Transactional/Operational/Security/System communications are exempt from marketing consent
    if (TRANSACTIONAL_COMMUNICATION_TYPES.includes(communicationType as any)) {
      return { allowed: true };
    }

    // 2. For MARKETING, check canonical Day 4 ConsentRecord
    if (communicationType === 'MARKETING') {
      const hasMarketingConsent = await this.checkCanonicalMarketingConsent(userId);
      if (!hasMarketingConsent) {
        return {
          allowed: false,
          reason: 'MISSING_CONSENT: Marketing consent is absent or withdrawn',
        };
      }
    }

    // 3. For general communication consent check
    const hasGeneralConsent = await this.checkCanonicalCommunicationConsent(userId);
    if (!hasGeneralConsent && communicationType === 'ENGAGEMENT') {
      // If explicit COMMUNICATION consent type exists and is REVOKED, suppress
      return {
        allowed: false,
        reason: 'MISSING_CONSENT: Communication consent has been revoked',
      };
    }

    return { allowed: true };
  }

  /**
   * Checks whether the member has active consented record for MARKETING in Day 4 ConsentRecord table.
   */
  async checkCanonicalMarketingConsent(userId: string): Promise<boolean> {
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
   * Checks whether user has active communication consent.
   */
  async checkCanonicalCommunicationConsent(userId: string): Promise<boolean> {
    const memberProfile = await this.prisma.memberProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!memberProfile) {
      return true; // Non-member users (e.g. staff) default to true
    }

    const commConsentType = await this.prisma.consentType.findFirst({
      where: {
        key: { in: ['COMMUNICATION', 'GENERAL_COMMUNICATION'] },
      },
    });

    if (!commConsentType) {
      return true; // Optional consent type, permitted if not configured
    }

    const latestRecord = await this.prisma.consentRecord.findFirst({
      where: {
        memberProfileId: memberProfile.id,
        consentTypeId: commConsentType.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    return latestRecord ? latestRecord.status === 'CONSENTED' : true;
  }
}
