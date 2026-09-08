import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { RetentionAgentContextService } from '../context/retention-agent-context.service';

@Injectable()
export class RetentionAgentToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextService: RetentionAgentContextService,
  ) {}

  /**
   * Strictly read-only tool implementations for the Retention Agent.
   * Autonomous write tools are strictly prohibited.
   */

  async getRetentionRisk(memberId: string, organisationId: string) {
    const ctx = await this.contextService.buildContext(memberId, organisationId);
    return ctx.retentionSignals;
  }

  async getRetentionRiskFactors(memberId: string, organisationId: string) {
    const ctx = await this.contextService.buildContext(memberId, organisationId);
    return {
      primaryFactors: ctx.retentionSignals.primaryFactors,
      positiveSignals: ctx.retentionSignals.positiveSignals,
    };
  }

  async getEngagementSummary(memberId: string, organisationId: string) {
    const ctx = await this.contextService.buildContext(memberId, organisationId);
    return ctx.engagement;
  }

  async getEngagementTrends(memberId: string, organisationId: string) {
    const ctx = await this.contextService.buildContext(memberId, organisationId);
    return {
      riskTrend: ctx.retentionSignals.riskTrend,
      baselineWeeklyVisits: ctx.engagement.baselineWeeklyVisits,
      recentWeeklyVisits: ctx.engagement.recentWeeklyVisits,
      dropPercentage: ctx.engagement.dropPercentage,
    };
  }

  async getAttendanceSummary(memberId: string, organisationId: string) {
    const ctx = await this.contextService.buildContext(memberId, organisationId);
    return {
      daysInactive: ctx.engagement.daysInactive,
      baselineWeeklyVisits: ctx.engagement.baselineWeeklyVisits,
      recentWeeklyVisits: ctx.engagement.recentWeeklyVisits,
    };
  }

  async getBookingSummary(memberId: string, organisationId: string) {
    const ctx = await this.contextService.buildContext(memberId, organisationId);
    return {
      bookingsLast30Days: ctx.engagement.bookingsLast30Days,
      noShowsLast30Days: ctx.engagement.noShowsLast30Days,
    };
  }

  async getWorkoutAdherence(memberId: string, organisationId: string) {
    const ctx = await this.contextService.buildContext(memberId, organisationId);
    return {
      completedWorkoutsLast30Days: ctx.engagement.completedWorkoutsLast30Days,
    };
  }

  async getGoalProgress(memberId: string, organisationId: string) {
    const ctx = await this.contextService.buildContext(memberId, organisationId);
    return ctx.goals;
  }

  async getMembershipStatus(memberId: string, organisationId: string) {
    const ctx = await this.contextService.buildContext(memberId, organisationId);
    return ctx.membership;
  }

  async getPreviousRetentionInterventions(memberId: string, organisationId: string) {
    return this.prisma.retentionOutreach.findMany({
      where: { memberId, organisationId },
      select: {
        id: true,
        interventionType: true,
        selectedChannel: true,
        status: true,
        outcome: true,
        sentAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  async getCommunicationPreferences(memberId: string, organisationId: string) {
    const ctx = await this.contextService.buildContext(memberId, organisationId);
    return ctx.communicationPolicy;
  }

  async getRecentCommunicationHistory(memberId: string, organisationId: string) {
    return this.prisma.communication.findMany({
      where: { recipientMemberId: memberId, organisationId },
      select: {
        id: true,
        type: true,
        channel: true,
        status: true,
        subject: true,
        sentAt: true,
        deliveredAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  async getMemberLifecycleContext(memberId: string, organisationId: string) {
    const ctx = await this.contextService.buildContext(memberId, organisationId);
    return {
      lifecycleStage: ctx.lifecycleStage,
      reactivation: ctx.reactivationContext,
    };
  }
}
