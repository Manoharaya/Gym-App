import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PrivacyQualityReportDto } from '@fitcore/types';

@Injectable()
export class PrivacyDataQualityService {
  private readonly logger = new Logger(PrivacyDataQualityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates system data quality and privacy health.
   */
  async getQualityReport(organisationId: string): Promise<PrivacyQualityReportDto> {
    const issues: string[] = [];

    // 1. Assets check
    const totalAssets = await this.prisma.privacyDataAsset.count({
      where: {
        OR: [{ organisationId }, { organisationId: null }],
      },
    });

    const unclassified = await this.prisma.privacyDataAsset.count({
      where: {
        OR: [{ organisationId }, { organisationId: null }],
        classification: 'INTERNAL', // if default internal was unchanged on sensitive assets
        sensitive: true,
      },
    });

    if (unclassified > 0) {
      issues.push(`${unclassified} sensitive data asset(s) have not been elevated to SENSITIVE or HIGHLY_SENSITIVE classification.`);
    }

    // 2. Retention coverage check
    const retentionPoliciesCount = await this.prisma.privacyRetentionPolicy.count({
      where: { organisationId, enabled: true },
    });

    const missingRetention = Math.max(0, 6 - retentionPoliciesCount);
    if (missingRetention > 0) {
      issues.push(`${missingRetention} mandatory core data categories lack an active retention policy.`);
    }

    // 3. Active holds
    const activeHoldsCount = await this.prisma.privacyRetentionHold.count({
      where: { organisationId, status: 'ACTIVE' },
    });

    if (activeHoldsCount > 0) {
      issues.push(`${activeHoldsCount} active legal/operational retention hold(s) are actively suspending automated deletions.`);
    }

    // 4. Deletions awaiting review
    const pendingReviewDeletionsCount = await this.prisma.privacyDeletionPlan.count({
      where: { organisationId, status: 'REVIEW_REQUIRED' },
    });

    if (pendingReviewDeletionsCount > 0) {
      issues.push(`${pendingReviewDeletionsCount} deletion plan(s) are blocked awaiting compliance officer review.`);
    }

    // 5. Stale exports check
    const staleExportsCount = await this.prisma.privacyExportJob.count({
      where: {
        organisationId,
        downloadExpiresAt: { lt: new Date() },
        status: 'COMPLETED',
      },
    });

    let status: 'HEALTHY' | 'WARNING' | 'ACTION_REQUIRED' | 'CRITICAL' = 'HEALTHY';
    if (pendingReviewDeletionsCount > 0 || unclassified > 0) {
      status = 'ACTION_REQUIRED';
    } else if (missingRetention > 0 || activeHoldsCount > 0) {
      status = 'WARNING';
    }

    return {
      status,
      totalAssetsCataloged: totalAssets,
      unclassifiedAssetsCount: unclassified,
      missingRetentionCount: missingRetention,
      activeHoldsCount,
      pendingReviewDeletionsCount,
      staleExportsCount,
      issues,
    };
  }
}
