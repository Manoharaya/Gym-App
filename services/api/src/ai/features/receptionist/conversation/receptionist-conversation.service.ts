/**
 * Day 31 — Receptionist Conversation Service
 * Manages conversational sessions, lifecycle, multi-turn history, and participant linkage.
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { ConversationChannel, ConversationStatus } from '@fitcore/types';

@Injectable()
export class ReceptionistConversationService {
  private readonly logger = new Logger(ReceptionistConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds an active conversation by external session or ID, or creates a new one.
   */
  async findOrCreateConversation(params: {
    organisationId: string;
    receptionistId: string;
    conversationId?: string;
    externalConversationId?: string;
    channel?: ConversationChannel;
    outletId?: string | null;
    memberId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    language?: string;
  }) {
    const {
      organisationId,
      receptionistId,
      conversationId,
      externalConversationId,
      channel = 'WEB_CHAT',
      outletId,
      memberId,
      customerName,
      customerPhone,
      customerEmail,
      language = 'en',
    } = params;

    // 1. If explicit conversationId is provided
    if (conversationId) {
      const existing = await this.prisma.receptionistConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20,
          },
          handoffs: true,
        },
      });

      if (existing) {
        if (existing.organisationId !== organisationId) {
          throw new ForbiddenException('Access to conversation across tenants denied');
        }
        return this.prisma.receptionistConversation.update({
          where: { id: existing.id },
          data: {
            lastMessageAt: new Date(),
            outletId: outletId || existing.outletId,
            customerId: memberId || existing.customerId,
            metadata: {
              ...(existing.metadata as any),
              customerName: customerName || (existing.metadata as any)?.customerName,
              customerPhone: customerPhone || (existing.metadata as any)?.customerPhone,
              customerEmail: customerEmail || (existing.metadata as any)?.customerEmail,
            },
          },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 20,
            },
            handoffs: true,
          },
        });
      }
    }

    // 2. If externalConversationId is provided, check for existing active conversation
    if (externalConversationId) {
      const existing = await this.prisma.receptionistConversation.findFirst({
        where: {
          organisationId,
          externalContactId: externalConversationId,
          status: { in: ['ACTIVE', 'WAITING', 'HANDOFF_REQUESTED'] },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20,
          },
          handoffs: true,
        },
      });

      if (existing) {
        return this.prisma.receptionistConversation.update({
          where: { id: existing.id },
          data: {
            lastMessageAt: new Date(),
            outletId: outletId || existing.outletId,
          },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 20,
            },
            handoffs: true,
          },
        });
      }
    }

    // 3. Create fresh conversation
    return this.prisma.receptionistConversation.create({
      data: {
        organisationId,
        receptionistId,
        outletId: outletId || null,
        channel,
        externalContactId: externalConversationId || null,
        customerId: memberId || null,
        language,
        status: 'ACTIVE',
        metadata: {
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
        },
      },
      include: {
        messages: true,
        handoffs: true,
      },
    });
  }

  /**
   * Retrieves conversation by ID with tenant isolation verification.
   */
  async getConversation(organisationId: string, id: string) {
    const conversation = await this.prisma.receptionistConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        handoffs: {
          orderBy: { createdAt: 'desc' },
        },
        receptionist: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Receptionist conversation ${id} not found`);
    }

    if (conversation.organisationId !== organisationId) {
      throw new ForbiddenException('Access to conversation denied');
    }

    return conversation;
  }

  /**
   * Updates conversation status (e.g. HANDOFF_REQUESTED, RESOLVED, CLOSED).
   */
  async updateStatus(
    organisationId: string,
    id: string,
    status: ConversationStatus,
    summary?: string,
  ) {
    const conv = await this.getConversation(organisationId, id);

    return this.prisma.receptionistConversation.update({
      where: { id: conv.id },
      data: {
        status,
        ...(summary ? { summary } : {}),
      },
    });
  }

  /**
   * Disambiguates or pins an outlet to the conversation.
   */
  async setOutlet(organisationId: string, id: string, outletId: string) {
    const conv = await this.getConversation(organisationId, id);

    return this.prisma.receptionistConversation.update({
      where: { id: conv.id },
      data: { outletId },
    });
  }

  /**
   * Lists conversations for staff monitoring.
   */
  async listConversations(params: {
    organisationId: string;
    outletId?: string;
    status?: ConversationStatus;
    channel?: ConversationChannel;
    limit?: number;
    offset?: number;
  }) {
    const { organisationId, outletId, status, channel, limit = 50, offset = 0 } = params;

    const where: any = { organisationId };
    if (outletId) where.outletId = outletId;
    if (status) where.status = status;
    if (channel) where.channel = channel;

    const [total, items] = await Promise.all([
      this.prisma.receptionistConversation.count({ where }),
      this.prisma.receptionistConversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          handoffs: {
            where: { status: 'PENDING' },
            take: 1,
          },
        },
      }),
    ]);

    return { total, items, limit, offset };
  }
}
