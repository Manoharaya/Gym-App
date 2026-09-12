import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface PlatformBillingOverview {
  organisationId: string;
  organisationName: string;
  planName: string;
  subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED';
  billingStatus: 'GOOD_STANDING' | 'ATTENTION_REQUIRED' | 'GRACE_PERIOD' | 'DELINQUENT';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  nextBillingDate: Date | string;
  currency: string;
  outstandingBalanceCents: number;
  currentUsage: {
    outlets: number;
    activeMembers: number;
    aiTokens: number;
  };
  limits: {
    maxOutlets: number;
    maxMembers: number;
    includedAiTokens: number;
  };
  overages: {
    outletOverage: number;
    memberOverage: number;
    aiTokenOverage: number;
  };
}

@Injectable()
export class PlatformBillingService {
  private readonly logger = new Logger(PlatformBillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Provides administrative visibility into an organisation's SaaS subscription & limits.
   * Day 55 will provide the authoritative billing engine; this provides the platform control plane view.
   */
  async getOrganisationBillingOverview(organisationId: string): Promise<PlatformBillingOverview> {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      include: {
        _count: {
          select: {
            outlets: true,
            memberProfiles: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organisation ${organisationId} not found`);
    }

    // Determine current tier limits based on organisation status or enterprise config
    const outletsCount = org._count.outlets;
    const membersCount = org._count.memberProfiles;

    // Aggregate monthly AI tokens
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const aiTokensAgg = await this.prisma.aIUsageRecord.aggregate({
      where: {
        organisationId,
        createdAt: { gte: startOfMonth },
      },
      _sum: { totalTokens: true },
    });

    const aiTokensUsed = aiTokensAgg._sum.totalTokens || 0;

    // Default plan boundaries
    const maxOutlets = 5;
    const maxMembers = 1000;
    const includedAiTokens = 500000;

    let subStatus: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' = 'ACTIVE';
    if (org.status === 'TRIAL') subStatus = 'TRIAL';
    else if (org.status === 'SUSPENDED') subStatus = 'CANCELLED';

    let billStatus: 'GOOD_STANDING' | 'ATTENTION_REQUIRED' | 'GRACE_PERIOD' | 'DELINQUENT' = 'GOOD_STANDING';
    if (org.status === 'SUSPENDED') billStatus = 'DELINQUENT';

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    nextBilling.setDate(1);

    return {
      organisationId: org.id,
      organisationName: org.name,
      planName: outletsCount > 3 ? 'Enterprise Tier' : 'Professional Tier',
      subscriptionStatus: subStatus,
      billingStatus: billStatus,
      billingCycle: 'MONTHLY',
      nextBillingDate: nextBilling.toISOString(),
      currency: org.currency || 'AUD',
      outstandingBalanceCents: 0,
      currentUsage: {
        outlets: outletsCount,
        activeMembers: membersCount,
        aiTokens: aiTokensUsed,
      },
      limits: {
        maxOutlets,
        maxMembers,
        includedAiTokens,
      },
      overages: {
        outletOverage: Math.max(0, outletsCount - maxOutlets),
        memberOverage: Math.max(0, membersCount - maxMembers),
        aiTokenOverage: Math.max(0, aiTokensUsed - includedAiTokens),
      },
    };
  }

  /**
   * Platform-wide aggregated billing metrics.
   */
  async getPlatformBillingAggregates() {
    const totalOrgs = await this.prisma.organisation.count();
    const activeOrgs = await this.prisma.organisation.count({ where: { status: 'ACTIVE' } });
    const trialOrgs = await this.prisma.organisation.count({ where: { status: 'TRIAL' } });
    const suspendedOrgs = await this.prisma.organisation.count({ where: { status: 'SUSPENDED' } });

    return {
      totalOrganisations: totalOrgs,
      activeSubscriptions: activeOrgs,
      trialSubscriptions: trialOrgs,
      suspendedSubscriptions: suspendedOrgs,
      estimatedMonthlyRunRateCents: activeOrgs * 29900, // standard baseline
      outstandingBalancesCount: suspendedOrgs,
    };
  }
}
