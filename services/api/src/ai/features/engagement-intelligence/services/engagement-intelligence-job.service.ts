import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { EngagementSignalService } from '../signals/engagement-signal.service';
import { MemberEngagementProfileService } from '../profile/member-engagement-profile.service';
import { MemberEngagementBaselineService } from '../profile/member-engagement-baseline.service';
import { EngagementTrendService } from '../trends/engagement-trend.service';
import { RetentionRiskService } from '../risk/retention-risk.service';
import { EngagementAnalyticsService } from '../analytics/engagement-analytics.service';
import { EngagementIntelligenceCacheService } from './engagement-intelligence-cache.service';

@Injectable()
export class EngagementIntelligenceJobService {
  private readonly logger = new Logger(EngagementIntelligenceJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalService: EngagementSignalService,
    private readonly profileService: MemberEngagementProfileService,
    private readonly baselineService: MemberEngagementBaselineService,
    private readonly trendService: EngagementTrendService,
    private readonly retentionRiskService: RetentionRiskService,
    private readonly analyticsService: EngagementAnalyticsService,
    private readonly cacheService: EngagementIntelligenceCacheService,
  ) {}

  /**
   * Idempotent background job calculating engagement profile, trends, and retention risk for a member.
   */
  async processMemberEngagement(
    memberId: string,
    organisationId: string,
    now: Date = new Date(),
  ) {
    const startTime = Date.now();
    try {
      this.logger.log(`Starting engagement calculation for member: ${memberId}`);

      // 1. Collect deterministic signals
      const signals = await this.signalService.collectAllSignals(memberId, organisationId, now);

      // 2. Compute personal baseline
      const baseline = await this.baselineService.computeBaseline(memberId, organisationId, now);

      // 3. Compute profile
      const profile = await this.profileService.buildProfile(signals, now);

      // 4. Compute trends
      const trends = this.trendService.detectTrends(signals, baseline);

      // 5. Compute retention risk
      const risk = this.retentionRiskService.evaluateRetentionRisk(signals, baseline, 'NO_ACTION', now);

      // 6. Cache updated results
      await Promise.all([
        this.cacheService.set(organisationId, memberId, 'summary', profile),
        this.cacheService.set(organisationId, memberId, 'trends', trends),
        this.cacheService.set(organisationId, memberId, 'risk', risk),
      ]);

      const latency = Date.now() - startTime;
      this.logger.log(`Completed engagement calculation for member: ${memberId} in ${latency}ms`);

      return { profile, trends, risk, latency };
    } catch (err: any) {
      this.logger.error(`Failed engagement calculation for member: ${memberId}: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Idempotent job refreshing organization aggregate metrics.
   */
  async refreshOrganisationMetrics(
    organisationId: string,
    outletId?: string,
    now: Date = new Date(),
  ) {
    this.logger.log(`Refreshing aggregate engagement metrics for org: ${organisationId}`);
    const analytics = await this.analyticsService.getOrganisationAnalytics(organisationId, outletId, now);
    return analytics;
  }
}
