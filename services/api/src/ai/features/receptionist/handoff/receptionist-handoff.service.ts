/**
 * Day 31 — Receptionist Handoff Service
 * Coordinates human handoff lifecycles, staff triage, status transitions, and audit records.
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { EscalationService } from './escalation.service';
import { CreateHandoffDto, UpdateHandoffDto } from '../dto/receptionist.dto';
import { HandoffStatus } from '@fitcore/types';

@Injectable()
export class ReceptionistHandoffService {
  private readonly logger = new Logger(ReceptionistHandoffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly escalationService: EscalationService,
  ) {}

  /**
   * Creates a handoff request and marks conversation as HANDOFF_REQUESTED.
   */
  async createHandoff(organisationId: string, dto: CreateHandoffDto) {
    const conversation = await this.prisma.receptionistConversation.findUnique({
      where: { id: dto.conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${dto.conversationId} not found`);
    }

    if (conversation.organisationId !== organisationId) {
      throw new ForbiddenException('Tenant access violation');
    }

    const handoff = await this.prisma.receptionistHandoff.create({
      data: {
        organisationId,
        receptionistId: conversation.receptionistId,
        conversationId: dto.conversationId,
        outletId: dto.outletId || conversation.outletId || null,
        memberProfileId: conversation.customerId || null,
        reason: dto.reason,
        status: 'PENDING',
        customerSummary: dto.summary || dto.reasonDescription,
        suggestedAction: dto.reasonDescription,
      },
    });

    // Update conversation status to HANDOFF_REQUESTED
    await this.prisma.receptionistConversation.update({
      where: { id: dto.conversationId },
      data: { status: 'HANDOFF_REQUESTED' },
    });

    return handoff;
  }

  /**
   * Updates handoff status, staff assignment, and resolution notes.
   */
  async updateHandoff(
    organisationId: string,
    handoffId: string,
    dto: UpdateHandoffDto,
  ) {
    const handoff = await this.prisma.receptionistHandoff.findUnique({
      where: { id: handoffId },
      include: { conversation: true },
    });

    if (!handoff) {
      throw new NotFoundException(`Handoff ${handoffId} not found`);
    }

    if (handoff.conversation.organisationId !== organisationId) {
      throw new ForbiddenException('Tenant access violation');
    }

    const updated = await this.prisma.receptionistHandoff.update({
      where: { id: handoffId },
      data: {
        status: dto.status ?? handoff.status,
        assignedStaffId: dto.assignedToUserId ?? handoff.assignedStaffId,
        notes: dto.resolutionNotes ?? handoff.notes,
        ...(dto.status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
      },
    });

    // If resolved, mark conversation as RESOLVED
    if (dto.status === 'RESOLVED') {
      await this.prisma.receptionistConversation.update({
        where: { id: handoff.conversationId },
        data: { status: 'RESOLVED' },
      });
    }

    return updated;
  }

  /**
   * Lists handoffs for staff queue.
   */
  async listHandoffs(params: {
    organisationId: string;
    outletId?: string;
    status?: HandoffStatus;
    limit?: number;
    offset?: number;
  }) {
    const { organisationId, outletId, status, limit = 50, offset = 0 } = params;

    const where: any = {
      conversation: { organisationId },
    };
    if (outletId) where.outletId = outletId;
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      this.prisma.receptionistHandoff.count({ where }),
      this.prisma.receptionistHandoff.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
        skip: offset,
        include: {
          conversation: {
            select: {
              id: true,
              channel: true,
              status: true,
              lastMessageAt: true,
              metadata: true,
            },
          },
        },
      }),
    ]);

    return { total, items, limit, offset };
  }
}
