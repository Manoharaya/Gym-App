/**
 * Day 35 — Receptionist Interaction Service
 * Canonical cross-channel interaction management, lifecycle transitions,
 * channel neutrality, and tenant-scoped retrieval.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../audit/audit.service';
import {
  ReceptionistChannel,
  ReceptionistInteractionStatus,
  ReceptionistOutcome,
  ReceptionistOutcomeSource,
  ReceptionistWorkflowContext,
} from '@fitcore/types';
import { RECEPTIONIST_AUDIT_ACTIONS } from './receptionist-workflow.constants';

@Injectable()
export class ReceptionistInteractionService {
  private readonly logger = new Logger(ReceptionistInteractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Finds an active interaction for a conversation or creates a canonical new one.
   */
  async findOrCreateInteraction(params: {
    organisationId: string;
    outletId?: string | null;
    channel: ReceptionistChannel;
    conversationId: string;
    sessionId?: string | null;
    memberId?: string | null;
    leadId?: string | null;
    intent?: string | null;
    metadata?: Record<string, any>;
  }) {
    const {
      organisationId,
      outletId,
      channel,
      conversationId,
      sessionId,
      memberId,
      leadId,
      intent,
      metadata,
    } = params;

    // Check for existing active interaction
    const existing = await this.prisma.receptionistInteraction.findFirst({
      where: {
        conversationId,
        organisationId,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      // Update session or member/lead if provided
      if (sessionId || memberId || leadId || intent) {
        return this.prisma.receptionistInteraction.update({
          where: { id: existing.id },
          data: {
            sessionId: sessionId || existing.sessionId,
            memberId: memberId || existing.memberId,
            leadId: leadId || existing.leadId,
            intent: intent || existing.intent,
            outletId: outletId || existing.outletId,
            ...(metadata
              ? { metadata: { ...((existing.metadata as Record<string, any>) || {}), ...metadata } }
              : {}),
          },
        });
      }
      return existing;
    }

    return this.prisma.receptionistInteraction.create({
      data: {
        organisationId,
        outletId: outletId || null,
        channel,
        conversationId,
        sessionId: sessionId || null,
        memberId: memberId || null,
        leadId: leadId || null,
        status: 'ACTIVE',
        intent: intent || null,
        outcome: null,
        outcomeSource: 'AI',
        metadata: metadata || {},
      },
    });
  }

  /**
   * Updates interaction status and records authoritative outcome and source.
   */
  async updateInteractionStatus(params: {
    interactionId: string;
    organisationId: string;
    status: ReceptionistInteractionStatus;
    outcome?: ReceptionistOutcome;
    outcomeSource?: ReceptionistOutcomeSource;
    intent?: string;
    metadata?: Record<string, any>;
  }) {
    const {
      interactionId,
      organisationId,
      status,
      outcome,
      outcomeSource = 'SYSTEM',
      intent,
      metadata,
    } = params;

    const interaction = await this.prisma.receptionistInteraction.findUnique({
      where: { id: interactionId },
    });

    if (!interaction) {
      throw new NotFoundException(`Interaction ${interactionId} not found`);
    }

    if (interaction.organisationId !== organisationId) {
      throw new ForbiddenException('Tenant access violation');
    }

    const isTerminal = ['COMPLETED', 'ABANDONED', 'FAILED', 'HANDED_OFF'].includes(status);

    const updated = await this.prisma.receptionistInteraction.update({
      where: { id: interactionId },
      data: {
        status,
        outcome: outcome ?? interaction.outcome,
        outcomeSource: outcomeSource ?? interaction.outcomeSource,
        intent: intent ?? interaction.intent,
        endedAt: isTerminal ? new Date() : interaction.endedAt,
        ...(metadata
          ? { metadata: { ...((interaction.metadata as Record<string, any>) || {}), ...metadata } }
          : {}),
      },
    });

    return updated;
  }

  /**
   * Retrieves interaction by ID with tenant and outlet security validation.
   */
  async getInteraction(params: {
    interactionId: string;
    organisationId: string;
    outletId?: string;
    userId?: string;
  }) {
    const { interactionId, organisationId, outletId, userId } = params;

    const interaction = await this.prisma.receptionistInteraction.findUnique({
      where: { id: interactionId },
      include: {
        conversation: {
          select: {
            id: true,
            channel: true,
            status: true,
            messages: {
              take: 20,
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                role: true,
                content: true,
                contentType: true,
                createdAt: true,
              },
            },
          },
        },
        handoffs: true,
        followUpTasks: true,
        callbackRequests: true,
        member: {
          select: {
            id: true,
            userId: true,
            status: true,
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            score: true,
          },
        },
      },
    });

    if (!interaction) {
      throw new NotFoundException(`Interaction ${interactionId} not found`);
    }

    if (interaction.organisationId !== organisationId) {
      throw new ForbiddenException('Tenant access violation: cross-organisation access denied');
    }

    if (outletId && interaction.outletId && interaction.outletId !== outletId) {
      throw new ForbiddenException('Outlet access violation: cross-outlet access denied');
    }

    // Audit log
    await this.audit.log({
      userId,
      organisationId,
      outletId: interaction.outletId || undefined,
      action: RECEPTIONIST_AUDIT_ACTIONS.INTERACTION_VIEWED,
      resource: 'ReceptionistInteraction',
      resourceId: interaction.id,
      metadata: { channel: interaction.channel, status: interaction.status },
    });

    return interaction;
  }

  /**
   * Lists interactions with filtering and pagination.
   */
  async listInteractions(params: {
    organisationId: string;
    outletId?: string;
    channel?: ReceptionistChannel;
    status?: ReceptionistInteractionStatus;
    outcome?: ReceptionistOutcome;
    limit?: number;
    offset?: number;
  }) {
    const {
      organisationId,
      outletId,
      channel,
      status,
      outcome,
      limit = 50,
      offset = 0,
    } = params;

    const where: any = { organisationId };
    if (outletId) where.outletId = outletId;
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (outcome) where.outcome = outcome;

    const [total, items] = await Promise.all([
      this.prisma.receptionistInteraction.count({ where }),
      this.prisma.receptionistInteraction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          member: { select: { id: true, userId: true } },
          lead: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return { total, items, limit, offset };
  }

  /**
   * Creates a channel-neutral workflow context.
   */
  createContext(params: {
    organisationId: string;
    outletId?: string | null;
    channel: ReceptionistChannel;
    interactionId?: string;
    conversationId?: string;
    sessionId?: string;
    memberId?: string | null;
    leadId?: string | null;
    intent?: string;
    requestedAction?: string;
    identityState?: string;
    turnCount?: number;
    language?: string;
  }): ReceptionistWorkflowContext {
    return {
      organisationId: params.organisationId,
      outletId: params.outletId,
      channel: params.channel,
      interactionId: params.interactionId,
      conversationId: params.conversationId,
      sessionId: params.sessionId,
      memberId: params.memberId,
      leadId: params.leadId,
      intent: params.intent,
      requestedAction: params.requestedAction,
      identityState: params.identityState,
      turnCount: params.turnCount || 0,
      consecutiveFailures: 0,
      language: params.language || 'en',
    };
  }
}
