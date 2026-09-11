import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MemberPrivacyRestrictionStatus } from '@fitcore/types';

@Injectable()
export class PrivacyRestrictionService {
  private readonly logger = new Logger(PrivacyRestrictionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves active restriction for a member.
   */
  async getMemberRestriction(memberId: string, organisationId: string) {
    const restriction = await this.prisma.memberPrivacyRestriction.findFirst({
      where: {
        memberId,
        organisationId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: (restriction?.status as MemberPrivacyRestrictionStatus) || 'NONE',
      reason: restriction?.reason || null,
      restrictedFeatures: restriction?.restrictedFeatures || [],
      imposedAt: restriction?.imposedAt?.toISOString() || null,
    };
  }

  /**
   * Applies or updates privacy restriction on a member.
   */
  async setRestriction(
    memberId: string,
    organisationId: string,
    status: MemberPrivacyRestrictionStatus,
    reason?: string,
    restrictedFeatures: string[] = ['AI_PERSONALIZATION', 'MARKETING', 'ANALYTICS', 'WEARABLES'],
    imposedBy?: string,
  ) {
    const record = await this.prisma.memberPrivacyRestriction.create({
      data: {
        memberId,
        organisationId,
        status,
        reason: reason || null,
        restrictedFeatures,
        imposedBy: imposedBy || null,
        imposedAt: status !== 'NONE' ? new Date() : null,
        releasedAt: status === 'NONE' ? new Date() : null,
      },
    });

    this.logger.log(
      `Privacy restriction '${status}' applied to member ${memberId} by ${imposedBy || 'SYSTEM'}`,
    );

    return {
      id: record.id,
      memberId: record.memberId,
      status: record.status,
      reason: record.reason,
      restrictedFeatures: record.restrictedFeatures,
      imposedAt: record.imposedAt?.toISOString() || null,
    };
  }

  /**
   * Evaluates if a specific feature is restricted for the member.
   */
  async isFeatureRestricted(
    memberId: string,
    organisationId: string,
    feature: string,
  ): Promise<boolean> {
    const active = await this.prisma.memberPrivacyRestriction.findFirst({
      where: {
        memberId,
        organisationId,
        status: { in: ['RESTRICTED', 'UNDER_REVIEW'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!active) return false;

    return active.restrictedFeatures.includes(feature) || active.restrictedFeatures.includes('ALL');
  }
}
