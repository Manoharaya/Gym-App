/**
 * Day 33 — AI Receptionist Lead Tools
 * Controlled tools for prospective customer capture, qualification retrieval,
 * contact updates, and staff handoff.
 */

import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { LeadsService } from '../../../../leads/leads.service';
import { LeadQualificationService } from '../../../../leads/lead-qualification.service';
import { PrismaService } from '../../../../database/prisma.service';
import {
  CreateLeadInputDto,
  UpdateLeadInputDto,
  UpdateLeadQualificationInputDto,
} from '@fitcore/types';

@Injectable()
export class LeadTools {
  private readonly logger = new Logger(LeadTools.name);

  constructor(
    private readonly leadsService: LeadsService,
    private readonly qualificationService: LeadQualificationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 1. Retrieve lead details.
   */
  async getLead(organisationId: string, leadId: string) {
    if (!leadId) throw new BadRequestException('leadId is required');
    return this.leadsService.getLead(organisationId, leadId);
  }

  /**
   * 2. Retrieve lead qualification profile.
   */
  async getLeadQualification(organisationId: string, leadId: string) {
    if (!leadId) throw new BadRequestException('leadId is required');
    const lead = await this.leadsService.getLead(organisationId, leadId);
    return lead.qualification;
  }

  /**
   * 3. Retrieve lead activity timeline.
   */
  async getLeadHistory(organisationId: string, leadId: string) {
    if (!leadId) throw new BadRequestException('leadId is required');
    const lead = await this.leadsService.getLead(organisationId, leadId);
    return lead.recentActivities || [];
  }

  /**
   * 4. Retrieve lead options for an outlet (membership plans, trial offers, tour availability).
   */
  async getOutletLeadInformation(organisationId: string, outletId?: string) {
    const where: any = { organisationId };
    if (outletId) where.id = outletId;

    const outlets = await this.prisma.outlet.findMany({
      where,
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        phone: true,
        email: true,
        timezone: true,
      },
      take: 5,
    });

    const plans = await this.prisma.membershipPlan.findMany({
      where: { organisationId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        description: true,
        membershipType: true,
        price: true,
        currency: true,
        trialDuration: true,
      },
      take: 5,
    });

    return {
      outlets,
      membershipOptions: plans,
      trialAvailable: plans.some((p) => p.trialDuration && p.trialDuration > 0),
    };
  }

  /**
   * 5. Capture a new lead from conversation.
   * AI is strictly prohibited from fabricating MARKETING_CONSENT = GRANTED without user affirmation.
   */
  async createLead(
    organisationId: string,
    params: {
      outletId?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      preferredContactChannel?: any;
      preferredLanguage?: string;
      consentStatus?: any;
      originatingConversationId?: string;
      initialGoals?: string[];
      initialServiceInterests?: string[];
      initialReadiness?: any;
    },
  ) {
    const createDto: CreateLeadInputDto = {
      organisationId,
      outletId: params.outletId,
      source: 'AI_RECEPTIONIST',
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      preferredContactChannel: params.preferredContactChannel,
      preferredLanguage: params.preferredLanguage || 'en',
      consentStatus: params.consentStatus || 'NOT_REQUESTED',
      consentSource: 'AI_RECEPTIONIST_CONVERSATION',
      originatingConversationId: params.originatingConversationId,
      initialGoals: params.initialGoals,
      initialServiceInterests: params.initialServiceInterests,
      initialReadiness: params.initialReadiness,
    };

    return this.leadsService.createLead(organisationId, createDto);
  }

  /**
   * 6. Update lead contact information.
   */
  async updateLeadContact(
    organisationId: string,
    leadId: string,
    params: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      preferredContactChannel?: any;
      consentStatus?: any;
    },
  ) {
    if (!leadId) throw new BadRequestException('leadId is required');

    const updateDto: UpdateLeadInputDto = {
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      preferredContactChannel: params.preferredContactChannel,
      consentStatus: params.consentStatus,
    };

    return this.leadsService.updateLead(organisationId, leadId, updateDto);
  }

  /**
   * 7. Update lead qualification signals from conversation.
   */
  async updateLeadQualification(
    organisationId: string,
    leadId: string,
    params: {
      goals?: string[];
      serviceInterests?: string[];
      preferredOutletId?: string;
      preferredSchedule?: any;
      readiness?: any;
      priceSensitivity?: any;
      objections?: any[];
      aiSummary?: string;
    },
  ) {
    if (!leadId) throw new BadRequestException('leadId is required');

    const updateDto: UpdateLeadQualificationInputDto = {
      goals: params.goals,
      serviceInterests: params.serviceInterests,
      preferredOutletId: params.preferredOutletId,
      preferredSchedule: params.preferredSchedule,
      readiness: params.readiness,
      priceSensitivity: params.priceSensitivity,
      objections: params.objections,
      aiSummary: params.aiSummary,
    };

    return this.leadsService.updateQualification(organisationId, leadId, updateDto);
  }

  /**
   * 8. Request human staff handoff for a lead.
   */
  async requestLeadHandoff(
    organisationId: string,
    leadId: string,
    params: { reason: string; notes?: string },
  ) {
    if (!leadId) throw new BadRequestException('leadId is required');
    if (!params.reason) throw new BadRequestException('reason is required');

    return this.leadsService.requestHandoff(organisationId, leadId, params.reason, params.notes);
  }
}
