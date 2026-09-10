/**
 * Day 35 — Receptionist Analytics & Inbox Service
 * Aggregates operational KPIs, channel breakdowns, non-causal attribution,
 * and unified staff triage inbox.
 */

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  ReceptionistInboxFilterDto,
  ReceptionistOperationsDashboardDto,
  ReceptionistChannel,
} from '@fitcore/types';

@Injectable()
export class ReceptionistAnalyticsService {
  private readonly logger = new Logger(ReceptionistAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves operational receptionist dashboard KPIs, queues, and channel breakdown.
   */
  async getOperationsDashboard(params: {
    organisationId: string;
    outletId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ReceptionistOperationsDashboardDto> {
    const { organisationId, outletId, startDate, endDate } = params;

    const baseWhere: any = { organisationId };
    if (outletId) baseWhere.outletId = outletId;
    if (startDate || endDate) {
      baseWhere.createdAt = {};
      if (startDate) baseWhere.createdAt.gte = startDate;
      if (endDate) baseWhere.createdAt.lte = endDate;
    }

    // 1. KPI Counts
    const [
      totalInteractions,
      resolvedInteractions,
      unresolvedInteractions,
      handoffCount,
      callbackCount,
      missedCallsCount,
      abandonedCallsCount,
      leadsCreated,
      leadsQualified,
      bookingsCreated,
      bookingFailures,
    ] = await Promise.all([
      this.prisma.receptionistInteraction.count({ where: baseWhere }),
      this.prisma.receptionistInteraction.count({
        where: { ...baseWhere, status: 'COMPLETED' },
      }),
      this.prisma.receptionistInteraction.count({
        where: { ...baseWhere, outcome: 'UNRESOLVED' },
      }),
      this.prisma.receptionistHandoff.count({ where: baseWhere }),
      this.prisma.callbackRequest.count({ where: baseWhere }),
      this.prisma.receptionistInteraction.count({
        where: { ...baseWhere, intent: 'MISSED_CALL' },
      }),
      this.prisma.receptionistInteraction.count({
        where: { ...baseWhere, status: 'ABANDONED' },
      }),
      this.prisma.receptionistInteraction.count({
        where: { ...baseWhere, outcome: 'LEAD_CREATED' },
      }),
      this.prisma.receptionistInteraction.count({
        where: { ...baseWhere, outcome: 'LEAD_QUALIFIED' },
      }),
      this.prisma.receptionistInteraction.count({
        where: { ...baseWhere, outcome: 'BOOKING_CREATED' },
      }),
      this.prisma.receptionistInteraction.count({
        where: { ...baseWhere, outcome: 'FAILED' },
      }),
    ]);

    const resolutionRate = totalInteractions > 0 ? (resolvedInteractions / totalInteractions) * 100 : 0;
    const handoffRate = totalInteractions > 0 ? (handoffCount / totalInteractions) * 100 : 0;

    // 2. Channel Breakdown
    const channels: ReceptionistChannel[] = ['VOICE', 'WEB', 'WHATSAPP', 'SMS', 'EMAIL'];
    const channelCounts = await Promise.all(
      channels.map((ch) =>
        this.prisma.receptionistInteraction.count({
          where: { ...baseWhere, channel: ch },
        }),
      ),
    );

    const channelBreakdown: Record<ReceptionistChannel, number> = {
      VOICE: channelCounts[0],
      WEB: channelCounts[1],
      WHATSAPP: channelCounts[2],
      SMS: channelCounts[3],
      EMAIL: channelCounts[4],
    };

    // 3. Queues (Pending handoffs, follow-ups, callbacks)
    const [openHandoffs, pendingFollowUps, pendingCallbacks, recentInteractions] = await Promise.all([
      this.prisma.receptionistHandoff.findMany({
        where: {
          ...baseWhere,
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.receptionistFollowUpTask.findMany({
        where: {
          ...baseWhere,
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.callbackRequest.findMany({
        where: {
          ...baseWhere,
          status: { in: ['REQUESTED', 'ASSIGNED', 'SCHEDULED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.receptionistInteraction.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      kpis: {
        totalInteractions,
        resolvedInteractions,
        unresolvedInteractions,
        resolutionRate: Math.round(resolutionRate * 10) / 10,
        handoffCount,
        handoffRate: Math.round(handoffRate * 10) / 10,
        callbackCount,
        missedCallsCount,
        abandonedCallsCount,
        leadsCreated,
        leadsQualified,
        bookingsCreated,
        bookingFailures,
      },
      channelBreakdown,
      openHandoffs,
      pendingFollowUps,
      pendingCallbacks,
      recentInteractions,
    };
  }

  /**
   * Unified Receptionist Staff Inbox: Triage open handoffs, follow-ups, and callbacks.
   */
  async getStaffInbox(params: ReceptionistInboxFilterDto) {
    const {
      organisationId,
      outletId,
      priority,
      status,
      type = 'ALL',
      assignedStaffId,
      limit = 20,
      offset = 0,
    } = params;

    const baseWhere: any = { organisationId };
    if (outletId) baseWhere.outletId = outletId;
    if (assignedStaffId) baseWhere.assignedStaffId = assignedStaffId;

    const results: Array<{
      itemType: 'HANDOFF' | 'FOLLOW_UP' | 'CALLBACK';
      id: string;
      priority: string;
      status: string;
      title: string;
      reason: string;
      assignedStaffId?: string | null;
      createdAt: Date;
    }> = [];

    // 1. Handoffs
    if (type === 'ALL' || type === 'HANDOFF') {
      const handoffWhere = { ...baseWhere };
      if (status) handoffWhere.status = status;
      if (priority) handoffWhere.priority = priority;

      const handoffs = await this.prisma.receptionistHandoff.findMany({
        where: handoffWhere,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      for (const h of handoffs) {
        results.push({
          itemType: 'HANDOFF',
          id: h.id,
          priority: h.priority,
          status: h.status,
          title: `Staff Handoff: ${h.reason}`,
          reason: h.reason,
          assignedStaffId: h.assignedStaffId,
          createdAt: h.createdAt,
        });
      }
    }

    // 2. Follow-Up Tasks
    if (type === 'ALL' || type === 'FOLLOW_UP') {
      const taskWhere = { ...baseWhere };
      if (status) taskWhere.status = status;
      if (priority) taskWhere.priority = priority;

      const tasks = await this.prisma.receptionistFollowUpTask.findMany({
        where: taskWhere,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      for (const t of tasks) {
        results.push({
          itemType: 'FOLLOW_UP',
          id: t.id,
          priority: t.priority,
          status: t.status,
          title: `Task: ${t.reason}`,
          reason: t.reason,
          assignedStaffId: t.assignedStaffId,
          createdAt: t.createdAt,
        });
      }
    }

    // 3. Callback Requests
    if (type === 'ALL' || type === 'CALLBACK') {
      const callbackWhere = { ...baseWhere };
      if (status) callbackWhere.status = status;

      const callbacks = await this.prisma.callbackRequest.findMany({
        where: callbackWhere,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      for (const c of callbacks) {
        results.push({
          itemType: 'CALLBACK',
          id: c.id,
          priority: 'NORMAL',
          status: c.status,
          title: `Callback: ${c.phoneNumber || 'Customer'}`,
          reason: c.reason,
          assignedStaffId: c.assignedStaffId,
          createdAt: c.createdAt,
        });
      }
    }

    // Sort by createdAt desc
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      total: results.length,
      items: results.slice(offset, offset + limit),
      limit,
      offset,
    };
  }
}
