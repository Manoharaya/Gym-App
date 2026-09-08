/**
 * Day 31 — Receptionist Context Aggregator Service
 * Assembles unified context for AI receptionist prompt generation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OrganisationContextService } from './organisation-context.service';
import { OutletContextService } from './outlet-context.service';
import { CustomerContextService } from './customer-context.service';
import { ReceptionistAggregatedContext } from '../receptionist.types';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class ReceptionistContextService {
  private readonly logger = new Logger(ReceptionistContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContextService: OrganisationContextService,
    private readonly outletContextService: OutletContextService,
    private readonly customerContextService: CustomerContextService,
  ) {}

  async buildContext(params: {
    organisationId: string;
    conversationId: string;
    outletId?: string | null;
    memberId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
  }): Promise<ReceptionistAggregatedContext> {
    const {
      organisationId,
      conversationId,
      outletId,
      memberId,
      customerName,
      customerPhone,
      customerEmail,
    } = params;

    // 1. Resolve Org Context
    const orgContext = await this.orgContextService.getOrganisationContext(organisationId);

    // 2. Resolve Outlet Context if specified or pinned
    let resolvedOutletId = outletId;
    if (!resolvedOutletId) {
      // Check if conversation already has an outlet pinned
      const conv = await this.prisma.receptionistConversation.findUnique({
        where: { id: conversationId },
        select: { outletId: true },
      });
      if (conv?.outletId) {
        resolvedOutletId = conv.outletId;
      }
    }

    const outletContext = resolvedOutletId
      ? await this.outletContextService.getOutletContext(organisationId, resolvedOutletId)
      : null;

    // 3. Resolve Customer Context
    const customerContext = await this.customerContextService.resolveCustomerContext({
      organisationId,
      memberId,
      customerName,
      customerPhone,
      customerEmail,
    });

    // 4. Multi-outlet Ambiguity Assessment
    const isMultiOutlet = orgContext.outletsCount > 1;
    const hasOutletDisambiguated = !!resolvedOutletId || orgContext.outletsCount <= 1;

    // 5. Recent Conversation Messages
    const recentMessages = await this.prisma.receptionistMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return {
      organisation: orgContext,
      outlet: outletContext,
      customer: customerContext,
      multiOutletContext: {
        isMultiOutlet,
        hasOutletDisambiguated,
        availableOutlets: orgContext.outlets.map((o) => ({ id: o.id, name: o.name })),
      },
      retrievedKnowledge: [],
      recentMessages: recentMessages.reverse().map((m) => ({
        role: m.role as any,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }
}
