import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CommunicationChannel,
  CommunicationType,
  CommunicationStatus,
  CommunicationAnalyticsDto,
} from '../communications.types';

@Injectable()
export class CommunicationHistoryService {
  private readonly logger = new Logger(CommunicationHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Staff view: Full tenant-scoped communications list with delivery details.
   */
  async getStaffHistory(params: {
    organisationId: string;
    outletId?: string;
    recipientUserId?: string;
    recipientMemberId?: string;
    channel?: CommunicationChannel;
    type?: CommunicationType;
    status?: CommunicationStatus;
    page?: number;
    limit?: number;
  }) {
    const {
      organisationId,
      outletId,
      recipientUserId,
      recipientMemberId,
      channel,
      type,
      status,
      page = 1,
      limit = 20,
    } = params;

    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));

    const where: any = { organisationId };
    if (outletId) where.outletId = outletId;
    if (recipientUserId) where.recipientUserId = recipientUserId;
    if (recipientMemberId) where.recipientMemberId = recipientMemberId;
    if (channel) where.channel = channel;
    if (type) where.type = type;
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      this.prisma.communication.count({ where }),
      this.prisma.communication.findMany({
        where,
        include: {
          deliveryEvents: {
            orderBy: { timestamp: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Member view: Filtered history for authenticated member.
   * Strips internal AI reasoning, retention labels, provider secrets.
   */
  async getMemberHistory(userId: string, organisationId: string, page = 1, limit = 20) {
    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));

    const where = {
      organisationId,
      recipientUserId: userId,
      status: { notIn: ['DRAFT', 'PENDING_APPROVAL', 'CANCELLED'] },
    };

    const [total, items] = await Promise.all([
      this.prisma.communication.count({ where }),
      this.prisma.communication.findMany({
        where,
        select: {
          id: true,
          type: true,
          channel: true,
          subject: true,
          contentPreview: true,
          status: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Returns aggregated communication analytics for an organisation (Section 58, 59).
   */
  async getAnalytics(organisationId: string, startDate?: Date, endDate?: Date): Promise<CommunicationAnalyticsDto> {
    const where: any = { organisationId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const records = await this.prisma.communication.findMany({
      where,
      select: {
        status: true,
        channel: true,
        type: true,
        cost: true,
        currency: true,
      },
    });

    const totalMessages = records.length;
    const byStatus: any = {};
    const byChannel: any = {};
    const byType: any = {};
    let totalCost = 0;

    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byChannel[r.channel] = (byChannel[r.channel] || 0) + 1;
      byType[r.type] = (byType[r.type] || 0) + 1;
      if (r.cost) totalCost += Number(r.cost);
    }

    const deliveredCount = (byStatus['DELIVERED'] || 0) + (byStatus['READ'] || 0);
    const failedCount = byStatus['FAILED'] || 0;
    const suppressedCount = byStatus['SUPPRESSED'] || 0;
    const readCount = byStatus['READ'] || 0;

    return {
      totalMessages,
      byStatus,
      byChannel,
      byType,
      deliveryRate: totalMessages > 0 ? Number((deliveredCount / totalMessages).toFixed(3)) : 0,
      failureRate: totalMessages > 0 ? Number((failedCount / totalMessages).toFixed(3)) : 0,
      suppressionRate: totalMessages > 0 ? Number((suppressedCount / totalMessages).toFixed(3)) : 0,
      readRate: deliveredCount > 0 ? Number((readCount / deliveredCount).toFixed(3)) : 0,
      estimatedCost: Number(totalCost.toFixed(4)),
      currency: records[0]?.currency || 'USD',
    };
  }
}
