import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ResolvedMultiOutletScope } from '../domain/outlet-permission.service';
import { DateWindowBounds } from '../../business-intelligence/services/comparison.service';
import { MultiOutletFilterDto } from '../dto/multi-outlet-filter.dto';
import { OutletOverviewSummaryDto } from '@fitcore/types';

export interface RawOutletMetrics {
  outletId: string;
  outletName: string;
  code: string;
  currency: string;
  activeMembers: number;
  priorActiveMembers: number;
  newMembers: number;
  reactivatedMembers: number;
  cancelledMembers: number;
  netMemberChange: number;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  newLeads: number;
  conversions: number;
  totalVisits: number;
  uniqueVisitors: number;
  totalBookings: number;
  attendedBookings: number;
  totalCapacity: number;
  averageEngagementScore: number;
  highRiskRetentionCount: number;
  totalRetentionPopulation: number;
}

export interface UnattributedRevenueResult {
  currency: string;
  grossRevenue: number;
  netRevenue: number;
  transactionCount: number;
}

@Injectable()
export class OutletMetricService {
  private readonly logger = new Logger(OutletMetricService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Queries all outlets in organisation and extracts raw authoritative domain metrics.
   * Also separates unattributed revenue where outlet attribution is missing.
   */
  async queryRawOutletMetrics(
    scope: ResolvedMultiOutletScope,
    bounds: DateWindowBounds,
    filters: MultiOutletFilterDto,
  ): Promise<{
    outlets: RawOutletMetrics[];
    unattributed: Record<string, UnattributedRevenueResult>;
  }> {
    const orgId = scope.organisationId;

    // 1. Fetch Outlets in Scope
    const outletWhere: any = {
      organisationId: orgId,
      status: 'ACTIVE',
    };
    if (scope.outletId) {
      outletWhere.id = scope.outletId;
    } else if (scope.authorizedOutletIds && scope.authorizedOutletIds.length > 0) {
      outletWhere.id = { in: scope.authorizedOutletIds };
    }

    const outlets = await this.prisma.outlet.findMany({
      where: outletWhere,
      orderBy: { name: 'asc' },
    });

    const outletMetrics: RawOutletMetrics[] = [];

    // 2. Query each outlet's authoritative records
    for (const outlet of outlets) {
      // Membership
      const activeMembers = await this.prisma.memberMembership.count({
        where: {
          organisationId: orgId,
          originOutletId: outlet.id,
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      });

      const priorActiveMembers = await this.prisma.memberMembership.count({
        where: {
          organisationId: orgId,
          originOutletId: outlet.id,
          status: { in: ['ACTIVE', 'TRIAL'] },
          activatedAt: { lt: bounds.startDate },
        },
      });

      const newMemberships = await this.prisma.memberMembership.findMany({
        where: {
          organisationId: orgId,
          originOutletId: outlet.id,
          status: { in: ['ACTIVE', 'TRIAL'] },
          activatedAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      });
      const newMembers = newMemberships.length;

      const cancelledMembers = await this.prisma.memberMembership.count({
        where: {
          organisationId: orgId,
          originOutletId: outlet.id,
          status: 'CANCELLED',
          cancelledAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      });

      // Reactivated members (had prior cancelled membership)
      let reactivatedMembers = 0;
      for (const nm of newMemberships) {
        const prior = await this.prisma.memberMembership.findFirst({
          where: {
            memberProfileId: nm.memberProfileId,
            status: 'CANCELLED',
            cancelledAt: { lt: nm.activatedAt || bounds.startDate },
          },
        });
        if (prior) reactivatedMembers++;
      }

      const netMemberChange = newMembers + reactivatedMembers - cancelledMembers;

      // Finance (Authoritative Day 6 Payment Transactions with explicit origin outlet)
      const txWhere: any = {
        organisationId: orgId,
        memberMembership: {
          originOutletId: outlet.id,
        },
        createdAt: { gte: bounds.startDate, lte: bounds.endDate },
      };
      if (filters.currency) {
        txWhere.currency = filters.currency;
      }

      const txs = await this.prisma.paymentTransaction.findMany({
        where: txWhere,
      });

      const successfulTxs = txs.filter((t) => t.status === 'SUCCEEDED');
      const grossMinor = successfulTxs.reduce((acc, t) => acc + t.amountMinor, 0);

      // Refunds
      const refunds = await this.prisma.paymentRefund.findMany({
        where: {
          organisationId: orgId,
          status: 'SUCCEEDED',
          createdAt: { gte: bounds.startDate, lte: bounds.endDate },
          paymentTransactionId: { in: successfulTxs.map((t) => t.id) },
        },
      });
      const refundsMinor = refunds.reduce((acc, r) => acc + r.amountMinor, 0);
      const netMinor = Math.max(0, grossMinor - refundsMinor);

      // Sales Leads & Conversions
      const leads = await this.prisma.lead.findMany({
        where: {
          organisationId: orgId,
          outletId: outlet.id,
          createdAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      });
      const newLeads = leads.length;

      const opps = await this.prisma.salesOpportunity.findMany({
        where: {
          organisationId: orgId,
          outletId: outlet.id,
          createdAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      });
      const oppConversions = opps.filter((o) => o.currentStage === 'CONVERTED' || o.convertedAt !== null).length;
      const leadConversions = leads.filter((l) => l.status === 'CONVERTED').length;
      const conversions = oppConversions > 0 ? oppConversions : leadConversions;

      // Attendance
      const totalVisits = await this.prisma.checkIn.count({
        where: {
          organisationId: orgId,
          outletId: outlet.id,
          checkedInAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      });

      const uniqueVisitsGroup = await this.prisma.checkIn.groupBy({
        by: ['memberProfileId'],
        where: {
          organisationId: orgId,
          outletId: outlet.id,
          checkedInAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      });
      const uniqueVisitors = uniqueVisitsGroup.length;

      // Bookings & Capacity
      const bookings = await this.prisma.booking.findMany({
        where: {
          organisationId: orgId,
          classSession: {
            outletId: outlet.id,
          },
          createdAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      });
      const totalBookings = bookings.length;
      const attendedBookings = bookings.filter((b) => b.status === 'ATTENDED').length;

      const classSessions = await this.prisma.classSession.findMany({
        where: {
          organisationId: orgId,
          outletId: outlet.id,
          startsAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
      });
      const totalCapacity = classSessions.reduce((acc, s) => acc + (s.capacity || 20), 0);

      // Engagement
      const engagementProfiles = await this.prisma.memberEngagementProfile.findMany({
        where: {
          organisationId: orgId,
        },
      });
      const avgEngagement =
        engagementProfiles.length > 0
          ? Math.round(
              engagementProfiles.reduce((acc, p) => acc + (p.engagementScore || 50), 0) /
                engagementProfiles.length,
            )
          : 68;

      // Retention Risk
      const highRiskCount = await this.prisma.retentionAnalysis.count({
        where: {
          organisationId: orgId,
          riskLevel: { in: ['HIGH', 'ELEVATED'] },
        },
      });

      outletMetrics.push({
        outletId: outlet.id,
        outletName: outlet.name,
        code: outlet.code,
        currency: txs[0]?.currency || (outlet as any).currency || 'AUD',
        activeMembers,
        priorActiveMembers,
        newMembers,
        reactivatedMembers,
        cancelledMembers,
        netMemberChange,
        grossRevenue: Math.round((grossMinor / 100) * 100) / 100,
        refunds: Math.round((refundsMinor / 100) * 100) / 100,
        netRevenue: Math.round((netMinor / 100) * 100) / 100,
        newLeads,
        conversions,
        totalVisits,
        uniqueVisitors,
        totalBookings,
        attendedBookings,
        totalCapacity: totalCapacity > 0 ? totalCapacity : 100,
        averageEngagementScore: avgEngagement,
        highRiskRetentionCount: highRiskCount,
        totalRetentionPopulation: activeMembers,
      });
    }

    // 3. Detect Unattributed Revenue
    // (Payments in org where memberMembership or originOutletId is NULL)
    const unattributedTxs = await this.prisma.paymentTransaction.findMany({
      where: {
        organisationId: orgId,
        status: 'SUCCEEDED',
        createdAt: { gte: bounds.startDate, lte: bounds.endDate },
        OR: [
          { memberMembershipId: null },
          { memberMembership: { originOutletId: null } },
        ],
      },
    });

    const unattributed: Record<string, UnattributedRevenueResult> = {};
    for (const tx of unattributedTxs) {
      const curr = tx.currency || 'AUD';
      if (!unattributed[curr]) {
        unattributed[curr] = {
          currency: curr,
          grossRevenue: 0,
          netRevenue: 0,
          transactionCount: 0,
        };
      }
      unattributed[curr].grossRevenue += tx.amountMinor / 100;
      unattributed[curr].netRevenue += tx.amountMinor / 100;
      unattributed[curr].transactionCount += 1;
    }

    return {
      outlets: outletMetrics,
      unattributed,
    };
  }
}
