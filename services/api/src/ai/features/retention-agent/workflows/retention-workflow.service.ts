import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { RetentionAnalysisService } from '../analysis/retention-analysis.service';
import { RetentionMemberSelectorService } from '../analysis/retention-member-selector.service';
import { RetentionApprovalService } from './retention-approval.service';
import {
  RetentionQueueQueryDto,
  RetentionOutreachDto,
  RetentionAgentAnalyticsDto,
  CreateOutreachDto,
  CommunicationChannel,
} from '@fitcore/types';

@Injectable()
export class RetentionWorkflowService {
  private readonly logger = new Logger(RetentionWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisService: RetentionAnalysisService,
    private readonly memberSelector: RetentionMemberSelectorService,
    private readonly approvalService: RetentionApprovalService,
  ) {}

  /**
   * Generates a pending outreach for an eligible member.
   * Mandates status: PENDING_APPROVAL.
   */
  async createOutreachForMember(
    memberId: string,
    organisationId: string,
    staffUserId?: string,
    promptQuery?: string,
  ): Promise<RetentionOutreachDto> {
    const { analysis, draftMessage } = await this.analysisService.analyzeMember(
      memberId,
      organisationId,
      staffUserId,
      promptQuery,
    );

    const created = await this.prisma.retentionOutreach.create({
      data: {
        organisationId,
        memberId,
        outletId: analysis.outletId,
        retentionAnalysisId: analysis.id,
        interventionType: analysis.recommendedInterventions[0] || 'TRAINER_CHECK_IN',
        status: 'PENDING_APPROVAL',
        approvalStatus: 'PENDING',
        recommendedChannel: analysis.recommendedChannel,
        selectedChannel: analysis.recommendedChannel,
        messageDraft: draftMessage,
        scheduledAt: analysis.recommendedTiming?.recommendedAt
          ? new Date(analysis.recommendedTiming.recommendedAt)
          : undefined,
        assignedStaffId: staffUserId || undefined,
      },
      include: {
        memberProfile: { include: { user: true } },
        outlet: true,
        assignedStaff: true,
        approvedByStaff: true,
      },
    });

    return this.approvalService.mapToDto(created);
  }

  /**
   * Retrieves the staff retention outreach queue with filtering and pagination.
   */
  async getQueue(
    organisationId: string,
    query: RetentionQueueQueryDto,
  ): Promise<{ items: RetentionOutreachDto[]; total: number; limit: number; offset: number }> {
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = query.offset ? Number(query.offset) : 0;

    const where: any = {
      organisationId,
      ...(query.outletId ? { outletId: query.outletId } : {}),
      ...(query.assignedStaffId ? { assignedStaffId: query.assignedStaffId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.channel ? { selectedChannel: query.channel } : {}),
    };

    if (query.search) {
      where.memberProfile = {
        user: {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      };
    }

    const [outreaches, total] = await Promise.all([
      this.prisma.retentionOutreach.findMany({
        where,
        include: {
          memberProfile: { include: { user: true } },
          outlet: true,
          assignedStaff: true,
          approvedByStaff: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.retentionOutreach.count({ where }),
    ]);

    return {
      items: outreaches.map((o) => this.approvalService.mapToDto(o)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Retrieves outreach detail by ID ensuring tenant isolation.
   */
  async getOutreachById(
    id: string,
    organisationId: string,
  ): Promise<RetentionOutreachDto> {
    const outreach = await this.prisma.retentionOutreach.findUnique({
      where: { id },
      include: {
        memberProfile: { include: { user: true } },
        outlet: true,
        assignedStaff: true,
        approvedByStaff: true,
      },
    });

    if (!outreach) {
      throw new NotFoundException(`Outreach ${id} not found`);
    }

    if (outreach.organisationId !== organisationId) {
      throw new ForbiddenException('Cross-tenant outreach access denied');
    }

    return this.approvalService.mapToDto(outreach);
  }

  /**
   * Calculates retention agent operational analytics.
   */
  async getAnalytics(
    organisationId: string,
    outletId?: string,
  ): Promise<RetentionAgentAnalyticsDto> {
    const whereOrg: any = {
      organisationId,
      ...(outletId ? { outletId } : {}),
    };

    const [
      candidates,
      analysesCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      deliveredCount,
      respondedCount,
      reengagedCount,
      outreaches,
    ] = await Promise.all([
      this.memberSelector.findCandidates(organisationId, outletId, 100),
      this.prisma.retentionAgentAnalysis.count({ where: whereOrg }),
      this.prisma.retentionOutreach.count({ where: { ...whereOrg, status: 'PENDING_APPROVAL' } }),
      this.prisma.retentionOutreach.count({ where: { ...whereOrg, status: 'APPROVED' } }),
      this.prisma.retentionOutreach.count({ where: { ...whereOrg, status: 'REJECTED' } }),
      this.prisma.retentionOutreach.count({ where: { ...whereOrg, status: 'DELIVERED' } }),
      this.prisma.retentionOutreach.count({ where: { ...whereOrg, status: 'ENGAGED' } }),
      this.prisma.retentionOutreach.count({ where: { ...whereOrg, status: 'REENGAGED' } }),
      this.prisma.retentionOutreach.findMany({
        where: whereOrg,
        select: { selectedChannel: true, interventionType: true },
        take: 1000,
      }),
    ]);

    const channelDistribution: Record<CommunicationChannel, number> = {
      WHATSAPP: 0,
      SMS: 0,
      EMAIL: 0,
      PUSH: 0,
      IN_APP: 0,
      VOICE: 0,
    };

    const interventionDistribution: Record<string, number> = {};

    for (const o of outreaches) {
      const ch = o.selectedChannel as CommunicationChannel;
      if (channelDistribution[ch] !== undefined) {
        channelDistribution[ch]++;
      }
      interventionDistribution[o.interventionType] =
        (interventionDistribution[o.interventionType] || 0) + 1;
    }

    return {
      organisationId,
      outletId,
      candidatesIdentified: candidates.length,
      analysesGenerated: analysesCount,
      recommendationsGenerated: analysesCount,
      outreachPendingApproval: pendingCount,
      outreachApproved: approvedCount,
      outreachRejected: rejectedCount,
      outreachSent: approvedCount + deliveredCount,
      outreachDelivered: deliveredCount,
      outreachResponded: respondedCount,
      membersReengaged: reengagedCount,
      channelDistribution,
      interventionDistribution,
      calculatedAt: new Date().toISOString(),
    };
  }
}
