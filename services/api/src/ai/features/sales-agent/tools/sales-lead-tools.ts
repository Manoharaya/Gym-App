/**
 * Day 36 — AI Sales Agent Lead Tools
 * Integrates directly with Day 33 LeadsService and LeadQualificationService.
 * Reuses the existing Lead system — NEVER creates a duplicate lead table.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { LeadsService } from '../../../../leads/leads.service';
import { LeadQualificationService } from '../../../../leads/lead-qualification.service';
import { CreateLeadInputDto, UpdateLeadQualificationInputDto } from '@fitcore/types';

@Injectable()
export class SalesLeadTools {
  private readonly logger = new Logger(SalesLeadTools.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
    private readonly qualificationService: LeadQualificationService,
  ) {}

  /**
   * 1. Get existing Lead Context (profile, score, qualification status).
   */
  async getLeadContext(organisationId: string, leadId: string) {
    const lead = await this.leadsService.getLead(organisationId, leadId);
    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found in organisation`);
    }

    return {
      id: lead.id,
      organisationId: lead.organisationId,
      outletId: lead.outletId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      score: lead.score,
      consentStatus: lead.consentStatus,
      preferredContactChannel: lead.preferredContactChannel,
      qualificationStatus: lead.qualification?.qualificationStatus || 'NOT_STARTED',
      goals: lead.qualification?.goals || [],
      serviceInterests: lead.qualification?.serviceInterests || [],
      preferredSchedule: lead.qualification?.preferredSchedule || 'FLEXIBLE',
      readiness: lead.qualification?.readiness || 'INTERESTED',
    };
  }

  /**
   * 2. Get Lead Qualification Details.
   */
  async getLeadQualification(organisationId: string, leadId: string) {
    const qual = await this.prisma.leadQualificationProfile.findUnique({
      where: { leadId },
    });
    return qual;
  }

  /**
   * 3. Get Sales Conversation record with latest discoveries and summaries.
   */
  async getSalesConversation(organisationId: string, conversationId: string) {
    const conv = await this.prisma.salesConversation.findFirst({
      where: { id: conversationId, organisationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
        recommendations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        nextActions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        handoffs: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    if (!conv) {
      throw new NotFoundException(`Sales conversation ${conversationId} not found`);
    }

    return conv;
  }

  /**
   * 4. Create or reuse Lead via Day 33 master LeadsService.
   */
  async createLead(organisationId: string, dto: CreateLeadInputDto) {
    this.logger.log(`[SalesLeadTools] Capturing/reusing lead for org ${organisationId}`);
    return this.leadsService.createLead(organisationId, {
      ...dto,
      source: dto.source || 'AI_RECEPTIONIST',
    });
  }

  /**
   * 5. Update Lead Qualification Profile via Day 33 LeadsService.
   */
  async updateLeadQualification(
    organisationId: string,
    leadId: string,
    dto: UpdateLeadQualificationInputDto,
  ) {
    this.logger.log(`[SalesLeadTools] Updating qualification for lead ${leadId}`);
    return this.leadsService.updateQualification(organisationId, leadId, dto);
  }
}
