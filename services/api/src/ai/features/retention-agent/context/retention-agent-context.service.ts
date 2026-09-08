import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { EngagementSignalService } from '../../engagement-intelligence/signals/engagement-signal.service';
import { MemberEngagementBaselineService } from '../../engagement-intelligence/profile/member-engagement-baseline.service';
import { RetentionRiskService } from '../../engagement-intelligence/risk/retention-risk.service';
import { RiskFactorService } from '../../retention-intelligence/analysis/risk-factor.service';
import { CommunicationPreferenceService } from '../../../../communications/preferences/communication-preference.service';
import { ConsentPolicyService } from '../../../../communications/preferences/consent-policy.service';
import { CommunicationType, CommunicationChannel } from '@fitcore/types';
import { RetentionAgentMemberContext } from './retention-agent-context.types';
import { RETENTION_OUTREACH_COOLDOWN_DAYS } from '../retention-agent.constants';

import { RetentionMetricsEngineService } from '../metrics/retention-metrics-engine.service';

@Injectable()
export class RetentionAgentContextService {
  private readonly logger = new Logger(RetentionAgentContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalService: EngagementSignalService,
    private readonly baselineService: MemberEngagementBaselineService,
    private readonly retentionRiskService: RetentionRiskService,
    private readonly riskFactorService: RiskFactorService,
    private readonly preferenceService: CommunicationPreferenceService,
    private readonly consentService: ConsentPolicyService,
    private readonly metricsEngine: RetentionMetricsEngineService,
  ) {}

  /**
   * Builds the comprehensive, sanitized context for the Retention Agent.
   * Enforces strict exclusion of PAR-Q, medical diagnoses, payment details, and private notes.
   */
  async buildContext(
    memberId: string,
    organisationId: string,
  ): Promise<RetentionAgentMemberContext> {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberId, organisationId },
      include: {
        user: true,
        trainerClientAssignments: {
          where: { status: 'ACTIVE' },
          include: {
            trainerProfile: {
              include: {
                staffProfile: {
                  include: {
                    user: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
          take: 1,
        },
        memberships: {
          where: { status: { in: ['ACTIVE', 'SUSPENDED', 'PENDING'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            membershipPlan: { select: { name: true } },
          },
        },
        trainingGoals: {
          where: { status: 'ACTIVE' },
          take: 3,
        },
        memberOutlets: {
          take: 1,
          include: {
            outlet: { select: { id: true, name: true } },
          },
        },
        memberReactivationProfiles: {
          take: 1,
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in organisation`);
    }

    const now = new Date();

    // 1. Gather engagement telemetry and baselines (Day 25)
    const signals = await this.signalService.collectAllSignals(memberId, organisationId, now);
    const baseline = await this.baselineService.computeBaseline(memberId, organisationId, now);

    // 2. Retention intelligence (Day 26)
    const assessment = this.retentionRiskService.evaluateRetentionRisk(signals, baseline, 'NO_ACTION', now);
    const primaryFactors = this.riskFactorService.evaluateRiskFactors(signals, baseline);
    const positiveSignals = this.riskFactorService.evaluatePositiveSignals(signals, baseline);
    const riskTrend = this.riskFactorService.computeRiskTrend(signals, baseline, positiveSignals);

    // 3. Reactivation context (Day 27)
    const reactivationProfile = member.memberReactivationProfiles?.[0];

    // 4. Communication policies & preferences (Day 28)
    const channels: CommunicationChannel[] = ['WHATSAPP', 'SMS', 'EMAIL', 'PUSH', 'IN_APP'];
    const allowedChannels: CommunicationChannel[] = [];
    const optedOutChannels: CommunicationChannel[] = [];

    let hasConsent = true;
    try {
      const consentResult = await this.consentService.evaluateConsent(
        member.userId,
        'ENGAGEMENT' as CommunicationType,
      );
      hasConsent = consentResult.allowed;
    } catch {
      hasConsent = true; // Safe fallback
    }

    for (const channel of channels) {
      try {
        const prefCheck = await this.preferenceService.isChannelAllowed(
          member.userId,
          organisationId,
          channel,
          'ENGAGEMENT' as CommunicationType,
        );
        if (prefCheck.allowed) {
          allowedChannels.push(channel);
        } else {
          optedOutChannels.push(channel);
        }
      } catch {
        allowedChannels.push(channel);
      }
    }

    // 5. Check recent outreach cooldown (Section 7)
    const cooldownCutoff = new Date(Date.now() - RETENTION_OUTREACH_COOLDOWN_DAYS * 24 * 3600 * 1000);
    const recentOutreachCount = await this.prisma.retentionOutreach.count({
      where: {
        memberId,
        organisationId,
        createdAt: { gte: cooldownCutoff },
        status: { notIn: ['REJECTED', 'CANCELLED', 'EXPIRED'] },
      },
    });
    const isCooldownActive = recentOutreachCount > 0;

    // 6. Check wearable connection (engagement flag only, no raw vitals)
    const wearableCount = await this.prisma.wearableConnection.count({
      where: { memberId, status: 'CONNECTED' },
    });

    const activeTrainerUser = member.trainerClientAssignments?.[0]?.trainerProfile?.staffProfile?.user;
    const activeMembership = member.memberships?.[0];
    const activeOutlet = member.memberOutlets?.[0]?.outlet;

    const baselineWeekly = baseline?.baselineVisitsPerWeek ?? 0;
    const recentWeekly = signals?.attendance?.visitsLast28d ? signals.attendance.visitsLast28d / 4 : 0;
    const dropPct = baselineWeekly > 0 ? Math.max(0, ((baselineWeekly - recentWeekly) / baselineWeekly) * 100) : 0;
    const daysInactive = signals?.attendance?.lastGymVisitAt
      ? Math.floor((now.getTime() - new Date(signals.attendance.lastGymVisitAt).getTime()) / (24 * 3600 * 1000))
      : 0;

    // 7. Compute complete deterministic retention data bundle (Section 7A)
    const dataBundle = await this.metricsEngine.computeRetentionDataBundle(memberId, organisationId, now);

    return {
      memberId: member.id,
      userId: member.userId,
      organisationId,
      outletId: activeOutlet?.id,
      firstName: member.user.firstName || 'Member',
      preferredName: member.preferredName || member.user.firstName || undefined,
      preferredLanguage: (member.user as any).preferredLanguage || 'English',
      lifecycleStage: 'ACTIVE',
      membership: {
        status: activeMembership?.status || member.status,
        tierName: (activeMembership as any)?.membershipPlan?.name || 'Standard',
        expiresAt: activeMembership?.endDate?.toISOString(),
        autoRenew: Boolean((activeMembership as any)?.autoRenew),
      },
      engagement: {
        baselineWeeklyVisits: Number(baselineWeekly.toFixed(1)),
        recentWeeklyVisits: Number(recentWeekly.toFixed(1)),
        dropPercentage: Number(dropPct.toFixed(1)),
        daysInactive,
        completedWorkoutsLast30Days: signals?.workout?.workoutsCompletedLast28d ?? 0,
        bookingsLast30Days: signals?.booking?.bookingsLast28d ?? 0,
        noShowsLast30Days: signals?.attendance?.noShowCountLast28d ?? 0,
        hasWearableConnected: wearableCount > 0,
      },
      goals: (member.trainingGoals || []).map((g) => ({
        title: g.title,
        status: 'ACTIVE',
      })),
      trainer: activeTrainerUser
        ? {
            trainerId: member.trainerClientAssignments[0].trainerProfileId,
            trainerName: `${activeTrainerUser.firstName || ''} ${activeTrainerUser.lastName || ''}`.trim(),
          }
        : undefined,
      retentionSignals: {
        riskLevel: assessment.riskLevel,
        riskTrend,
        primaryFactors,
        positiveSignals,
      },
      reactivationContext: reactivationProfile
        ? {
            lifecycleState: reactivationProfile.lifecycleState,
            recoveryState: reactivationProfile.recoveryState,
          }
        : undefined,
      communicationPolicy: {
        allowedChannels,
        hasConsent,
        optedOutChannels,
        isCooldownActive,
      },
      dataBundle,
      dataPoints: dataBundle.dataPoints,
      dataQuality: dataBundle.overallDataQuality,
    };
  }
}
