/**
 * Day 33 — Master Leads Service
 * Orchestrates multi-tenant lead lifecycle, progressive capture, duplicate detection,
 * qualification, deterministic scoring, staff assignment, and CRM foundation.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LeadDuplicateService } from './lead-duplicate.service';
import { LeadScoringService } from './lead-scoring.service';
import { LeadNextActionService } from './lead-next-action.service';
import { LeadQualificationService } from './lead-qualification.service';
import {
  CreateLeadInputDto,
  UpdateLeadInputDto,
  UpdateLeadQualificationInputDto,
  AssignStaffInputDto,
  LeadFilterQueryDto,
  LeadDto,
  LeadMetricsDto,
  LeadStatus,
  LeadSource,
  LeadConsentStatus,
  PreferredContactChannel,
  QualificationStatus,
  LeadNextBestAction,
  ReadinessLevel,
  PreferredSchedule,
} from '@fitcore/types';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly duplicateService: LeadDuplicateService,
    private readonly scoringService: LeadScoringService,
    private readonly nextActionService: LeadNextActionService,
    private readonly qualificationService: LeadQualificationService,
  ) {}

  /**
   * 1. Create a new Lead with duplicate detection, progressive capture, and initial qualification.
   */
  async createLead(organisationId: string, dto: CreateLeadInputDto): Promise<LeadDto> {
    // A. Verify organisation exists
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
    });
    if (!org) {
      throw new NotFoundException(`Organisation ${organisationId} not found`);
    }

    // B. Normalize contact signals
    const normEmail = this.duplicateService.normalizeEmail(dto.email);
    const normPhone = this.duplicateService.normalizePhone(dto.phone);

    // C. Check for duplicates
    const duplicateResult = await this.duplicateService.detectDuplicates(organisationId, {
      email: normEmail,
      phone: normPhone,
    });

    if (duplicateResult.type === 'EXISTING_LEAD' && duplicateResult.existingLeadId) {
      this.logger.log(`[LEADS] Existing lead matched: ${duplicateResult.existingLeadId}. Returning existing lead.`);
      return this.getLead(organisationId, duplicateResult.existingLeadId);
    }

    // D. Calculate initial deterministic score
    const initialScoring = this.scoringService.calculateScore({
      status: dto.status || 'NEW',
      source: dto.source || 'AI_RECEPTIONIST',
      email: normEmail,
      phone: normPhone,
      consentStatus: dto.consentStatus || 'NOT_REQUESTED',
      goals: dto.initialGoals || [],
      serviceInterests: dto.initialServiceInterests || [],
      preferredOutletId: dto.outletId,
      readiness: dto.initialReadiness || 'INTERESTED',
    });

    // E. Determine initial next best action
    const nextAction = this.nextActionService.determineNextAction('temp_id', {
      status: dto.status || 'NEW',
      email: normEmail,
      phone: normPhone,
      goals: dto.initialGoals || [],
      serviceInterests: dto.initialServiceInterests || [],
      preferredOutletId: dto.outletId,
      readiness: dto.initialReadiness || 'INTERESTED',
    });

    // F. Persist Lead and initial LeadQualificationProfile in database
    const lead = await this.prisma.lead.create({
      data: {
        organisationId,
        outletId: dto.outletId || null,
        source: dto.source || 'AI_RECEPTIONIST',
        sourceMetadata: dto.sourceMetadata ? (dto.sourceMetadata as any) : undefined,
        status: dto.status || 'NEW',
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
        email: normEmail,
        phone: normPhone,
        preferredContactChannel: dto.preferredContactChannel || null,
        preferredLanguage: dto.preferredLanguage || 'en',
        consentStatus: dto.consentStatus || 'NOT_REQUESTED',
        consentSource: dto.consentSource || null,
        consentedAt: dto.consentStatus === 'GRANTED' ? new Date() : null,
        originatingConversationId: dto.originatingConversationId || null,
        score: initialScoring.score,
        scoreVersion: initialScoring.scoreVersion,
        scoreFactors: initialScoring.scoreFactors as any,
        scoreCalculatedAt: initialScoring.calculatedAt,
        lastInteractionAt: new Date(),
        qualificationProfile: {
          create: {
            goals: dto.initialGoals || [],
            serviceInterests: dto.initialServiceInterests || ['MEMBERSHIP'],
            preferredOutletId: dto.outletId || null,
            readiness: dto.initialReadiness || 'INTERESTED',
            qualificationStatus:
              (dto.initialGoals && dto.initialGoals.length > 0) || normEmail || normPhone
                ? 'PARTIALLY_QUALIFIED'
                : 'NOT_STARTED',
            recommendedNextAction: nextAction.recommendedAction,
            nextActionReason: nextAction.reason,
            aiSummary: `New lead created from ${dto.source || 'AI_RECEPTIONIST'}. Goals: ${
              dto.initialGoals?.join(', ') || 'Not specified'
            }.`,
          },
        },
        activities: {
          create: {
            organisationId,
            activityType: 'LEAD_CREATED',
            actorType: dto.source === 'STAFF' ? 'STAFF' : 'AI_RECEPTIONIST',
            title: 'Lead Captured',
            description: `Lead created via ${dto.source || 'AI_RECEPTIONIST'}. Initial score: ${initialScoring.score}/100.`,
            metadata: {
              source: dto.source || 'AI_RECEPTIONIST',
              score: initialScoring.score,
              duplicateResultType: duplicateResult.type,
            },
          },
        },
      },
      include: {
        qualificationProfile: true,
        outlet: { select: { id: true, name: true } },
        assignedStaff: { select: { id: true, displayName: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    // G. Audit Log
    await this.auditService.log({
      organisationId,
      outletId: dto.outletId || undefined,
      action: 'LEAD_CREATED',
      resource: 'LEAD',
      resourceId: lead.id,
      metadata: {
        leadId: lead.id,
        source: lead.source,
        score: lead.score,
        duplicateType: duplicateResult.type,
      },
    });

    this.logger.log(`[LEADS] Created lead ${lead.id} in org ${organisationId} with initial score ${lead.score}`);
    return this.mapLeadToDto(lead);
  }

  /**
   * 2. Get single lead with qualification profile and recent activity timeline.
   */
  async getLead(organisationId: string, leadId: string): Promise<LeadDto> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        qualificationProfile: {
          include: { preferredOutlet: { select: { id: true, name: true } } },
        },
        outlet: { select: { id: true, name: true } },
        assignedStaff: { select: { id: true, displayName: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!lead || lead.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'LEAD_NOT_FOUND',
        message: `Lead ${leadId} not found in organisation ${organisationId}`,
      });
    }

    return this.mapLeadToDto(lead);
  }

  /**
   * 3. List leads with multi-tenant filtering, search, and pagination.
   */
  async listLeads(
    organisationId: string,
    filter: LeadFilterQueryDto,
  ): Promise<{ items: LeadDto[]; total: number; page: number; limit: number }> {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const where: any = { organisationId };

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.outletId) {
      where.outletId = filter.outletId;
    }
    if (filter.source) {
      where.source = filter.source;
    }
    if (filter.assignedStaffId) {
      where.assignedStaffId = filter.assignedStaffId;
    }
    if (typeof filter.minScore === 'number') {
      where.score = { ...(where.score || {}), gte: filter.minScore };
    }
    if (typeof filter.maxScore === 'number') {
      where.score = { ...(where.score || {}), lte: filter.maxScore };
    }
    if (filter.qualificationStatus) {
      where.qualificationProfile = { qualificationStatus: filter.qualificationStatus };
    }
    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        include: {
          qualificationProfile: {
            include: { preferredOutlet: { select: { id: true, name: true } } },
          },
          outlet: { select: { id: true, name: true } },
          assignedStaff: { select: { id: true, displayName: true } },
          activities: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      items: items.map((l) => this.mapLeadToDto(l)),
      total,
      page,
      limit,
    };
  }

  /**
   * 4. Update lead contact details, status, or outlet.
   */
  async updateLead(organisationId: string, leadId: string, dto: UpdateLeadInputDto): Promise<LeadDto> {
    await this.getLead(organisationId, leadId);

    const data: any = { ...dto };
    if (dto.email) {
      data.email = this.duplicateService.normalizeEmail(dto.email);
    }
    if (dto.phone) {
      data.phone = this.duplicateService.normalizePhone(dto.phone);
    }
    if (dto.consentStatus === 'GRANTED') {
      data.consentedAt = new Date();
    }
    data.lastInteractionAt = new Date();

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data,
      include: {
        qualificationProfile: true,
        outlet: { select: { id: true, name: true } },
        assignedStaff: { select: { id: true, displayName: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    // Record activity
    await this.prisma.leadActivity.create({
      data: {
        leadId,
        organisationId,
        activityType: 'CONTACT_UPDATED',
        actorType: 'STAFF',
        title: 'Lead Updated',
        description: 'Contact information or lead status modified.',
        metadata: { updatedFields: Object.keys(dto) },
      },
    });

    return this.mapLeadToDto(updated);
  }

  /**
   * 5. Update lead qualification profile and re-score deterministically.
   */
  async updateQualification(
    organisationId: string,
    leadId: string,
    dto: UpdateLeadQualificationInputDto,
  ): Promise<LeadDto> {
    const lead = await this.getLead(organisationId, leadId);

    // Upsert qualification profile
    await this.prisma.leadQualificationProfile.upsert({
      where: { leadId },
      create: {
        leadId,
        goals: dto.goals || [],
        serviceInterests: dto.serviceInterests || [],
        preferredOutletId: dto.preferredOutletId,
        preferredSchedule: dto.preferredSchedule,
        experienceLevel: dto.experienceLevel,
        readiness: dto.readiness,
        priceSensitivity: dto.priceSensitivity,
        objections: dto.objections as any,
        preferredContactChannel: dto.preferredContactChannel,
        preferredLanguage: dto.preferredLanguage,
        qualificationStatus: dto.qualificationStatus || 'IN_PROGRESS',
        recommendedNextAction: dto.recommendedNextAction,
        nextActionReason: dto.nextActionReason,
        aiSummary: dto.aiSummary,
      },
      update: {
        goals: dto.goals !== undefined ? dto.goals : undefined,
        serviceInterests: dto.serviceInterests !== undefined ? dto.serviceInterests : undefined,
        preferredOutletId: dto.preferredOutletId !== undefined ? dto.preferredOutletId : undefined,
        preferredSchedule: dto.preferredSchedule !== undefined ? dto.preferredSchedule : undefined,
        experienceLevel: dto.experienceLevel !== undefined ? dto.experienceLevel : undefined,
        readiness: dto.readiness !== undefined ? dto.readiness : undefined,
        priceSensitivity: dto.priceSensitivity !== undefined ? dto.priceSensitivity : undefined,
        objections: dto.objections !== undefined ? (dto.objections as any) : undefined,
        preferredContactChannel:
          dto.preferredContactChannel !== undefined ? dto.preferredContactChannel : undefined,
        preferredLanguage: dto.preferredLanguage !== undefined ? dto.preferredLanguage : undefined,
        qualificationStatus:
          dto.qualificationStatus !== undefined ? dto.qualificationStatus : undefined,
        recommendedNextAction:
          dto.recommendedNextAction !== undefined ? dto.recommendedNextAction : undefined,
        nextActionReason: dto.nextActionReason !== undefined ? dto.nextActionReason : undefined,
        aiSummary: dto.aiSummary !== undefined ? dto.aiSummary : undefined,
        qualificationVersion: { increment: 1 },
      },
    });

    // Re-score deterministically
    const scoring = this.scoringService.calculateScore({
      status: lead.status,
      source: lead.source,
      email: lead.email,
      phone: lead.phone,
      consentStatus: lead.consentStatus,
      goals: dto.goals || lead.qualification?.goals,
      serviceInterests: dto.serviceInterests || lead.qualification?.serviceInterests,
      preferredOutletId: dto.preferredOutletId || lead.outletId,
      preferredSchedule: dto.preferredSchedule || lead.qualification?.preferredSchedule,
      experienceLevel: dto.experienceLevel || lead.qualification?.experienceLevel,
      readiness: dto.readiness || lead.qualification?.readiness,
      priceSensitivity: dto.priceSensitivity || lead.qualification?.priceSensitivity,
    });

    // Re-evaluate Next Best Action
    const nextAction = this.nextActionService.determineNextAction(leadId, {
      status: lead.status,
      email: lead.email,
      phone: lead.phone,
      goals: dto.goals || lead.qualification?.goals,
      serviceInterests: dto.serviceInterests || lead.qualification?.serviceInterests,
      preferredOutletId: dto.preferredOutletId || lead.outletId,
      preferredSchedule: dto.preferredSchedule || lead.qualification?.preferredSchedule,
      readiness: dto.readiness || lead.qualification?.readiness,
      objections: dto.objections || lead.qualification?.objections,
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        score: scoring.score,
        scoreVersion: scoring.scoreVersion,
        scoreFactors: scoring.scoreFactors as any,
        scoreCalculatedAt: scoring.calculatedAt,
        lastInteractionAt: new Date(),
      },
    });

    // Record activity
    await this.prisma.leadActivity.create({
      data: {
        leadId,
        organisationId,
        activityType: 'QUALIFICATION_UPDATED',
        actorType: 'STAFF',
        title: 'Qualification Profile Updated',
        description: `Score recalculated: ${scoring.score}/100. Recommended next action: ${nextAction.recommendedAction}.`,
        metadata: { score: scoring.score, nextAction: nextAction.recommendedAction },
      },
    });

    return this.getLead(organisationId, leadId);
  }

  /**
   * 6. Assign a lead to an active staff profile in the same organisation.
   */
  async assignStaff(organisationId: string, leadId: string, dto: AssignStaffInputDto): Promise<LeadDto> {
    await this.getLead(organisationId, leadId);

    const staff = await this.prisma.staffProfile.findUnique({
      where: { id: dto.staffProfileId },
    });

    if (!staff || staff.organisationId !== organisationId) {
      throw new BadRequestException('Assigned staff profile does not belong to this organisation');
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedStaffId: staff.id,
        assignedOutletId: dto.outletId || null,
        assignedAt: new Date(),
      },
      include: {
        qualificationProfile: true,
        outlet: { select: { id: true, name: true } },
        assignedStaff: { select: { id: true, displayName: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        organisationId,
        activityType: 'STAFF_ASSIGNED',
        actorType: 'STAFF',
        title: 'Staff Assigned',
        description: `Lead assigned to ${staff.displayName}. Notes: ${dto.notes || 'None'}.`,
        metadata: { staffId: staff.id, staffName: staff.displayName },
      },
    });

    return this.mapLeadToDto(updated);
  }

  /**
   * 7. Request human handoff for a lead.
   */
  async requestHandoff(
    organisationId: string,
    leadId: string,
    reason: string,
    notes?: string,
  ): Promise<LeadDto> {
    const lead = await this.getLead(organisationId, leadId);

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: lead.status === 'NEW' ? 'QUALIFYING' : lead.status,
      },
    });

    await this.prisma.leadQualificationProfile.updateMany({
      where: { leadId },
      data: {
        qualificationStatus: 'NEEDS_HUMAN_REVIEW',
        recommendedNextAction: 'HANDOFF_TO_STAFF',
        nextActionReason: reason,
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        organisationId,
        activityType: 'HANDOFF_CREATED',
        actorType: 'AI_RECEPTIONIST',
        title: 'Staff Handoff Requested',
        description: `Reason: ${reason}. Notes: ${notes || 'None'}.`,
        metadata: { reason, notes },
      },
    });

    return this.getLead(organisationId, leadId);
  }

  /**
   * 8. Aggregates conversion metrics and telemetry across leads.
   */
  async getMetrics(organisationId: string, outletId?: string): Promise<LeadMetricsDto> {
    const where: any = { organisationId };
    if (outletId) where.outletId = outletId;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalLeads, newLeadsToday, leads] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({
        where: { ...where, createdAt: { gte: startOfToday } },
      }),
      this.prisma.lead.findMany({
        where,
        select: {
          status: true,
          source: true,
          score: true,
          qualificationProfile: { select: { qualificationStatus: true } },
        },
      }),
    ]);

    let qualifiedLeads = 0;
    let unqualifiedLeads = 0;
    let totalScore = 0;

    const leadsByStatus: Record<string, number> = {};
    const leadsBySource: Record<string, number> = {};

    let trialsOrTours = 0;
    let conversions = 0;

    for (const l of leads) {
      totalScore += l.score;
      leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1;
      leadsBySource[l.source] = (leadsBySource[l.source] || 0) + 1;

      if (l.qualificationProfile?.qualificationStatus === 'QUALIFIED') {
        qualifiedLeads++;
      }
      if (
        l.status === 'UNQUALIFIED' ||
        l.qualificationProfile?.qualificationStatus === 'UNQUALIFIED'
      ) {
        unqualifiedLeads++;
      }
      if (l.status === 'TRIAL_INTEREST' || l.status === 'TOUR_INTEREST') {
        trialsOrTours++;
      }
      if (l.status === 'CONVERTED') {
        conversions++;
      }
    }

    const averageScore = totalLeads > 0 ? Math.round(totalScore / totalLeads) : 0;

    // Estimate conversations involving receptionist
    const totalConversations = await this.prisma.receptionistConversation.count({
      where: { organisationId, ...(outletId ? { outletId } : {}) },
    });

    return {
      totalLeads,
      newLeadsToday,
      qualifiedLeads,
      unqualifiedLeads,
      averageScore,
      conversionFunnel: {
        totalConversations,
        leadsCaptured: totalLeads,
        leadsQualified: qualifiedLeads,
        trialsOrToursRequested: trialsOrTours,
        conversions,
      },
      leadsByStatus,
      leadsBySource,
    };
  }

  /**
   * Helper mapping Prisma Lead to LeadDto
   */
  private mapLeadToDto(lead: any): LeadDto {
    const q = lead.qualificationProfile;
    const nameParts = [lead.firstName, lead.lastName].filter(Boolean);
    const displayName = nameParts.length > 0 ? nameParts.join(' ') : 'Anonymous Prospect';

    return {
      id: lead.id,
      organisationId: lead.organisationId,
      outletId: lead.outletId,
      outletName: lead.outlet?.name || null,
      source: lead.source as LeadSource,
      sourceMetadata: lead.sourceMetadata as Record<string, any> | null,
      status: lead.status as LeadStatus,
      firstName: lead.firstName,
      lastName: lead.lastName,
      displayName,
      email: lead.email,
      phone: lead.phone,
      preferredContactChannel: lead.preferredContactChannel as PreferredContactChannel | null,
      preferredLanguage: lead.preferredLanguage,
      consentStatus: lead.consentStatus as LeadConsentStatus,
      consentSource: lead.consentSource,
      consentedAt: lead.consentedAt?.toISOString() || null,
      originatingConversationId: lead.originatingConversationId,
      assignedStaffId: lead.assignedStaffId,
      assignedStaffName: lead.assignedStaff?.displayName || null,
      assignedOutletId: lead.assignedOutletId,
      assignedAt: lead.assignedAt?.toISOString() || null,
      assignedById: lead.assignedById,
      score: lead.score,
      scoreVersion: lead.scoreVersion,
      scoreFactors: (lead.scoreFactors as any[]) || [],
      scoreCalculatedAt: lead.scoreCalculatedAt?.toISOString() || null,
      lastInteractionAt: lead.lastInteractionAt?.toISOString() || null,
      qualification: q
        ? {
            id: q.id,
            leadId: q.leadId,
            goals: (q.goals as string[]) || [],
            serviceInterests: (q.serviceInterests as string[]) || [],
            preferredOutletId: q.preferredOutletId,
            preferredOutletName: q.preferredOutlet?.name || null,
            preferredSchedule: q.preferredSchedule as PreferredSchedule | null,
            experienceLevel: q.experienceLevel as any,
            readiness: q.readiness as ReadinessLevel | null,
            priceSensitivity: q.priceSensitivity as any,
            objections: (q.objections as any[]) || [],
            preferredContactChannel: q.preferredContactChannel as any,
            preferredLanguage: q.preferredLanguage,
            qualificationStatus: q.qualificationStatus as QualificationStatus,
            qualificationVersion: q.qualificationVersion,
            missingInformation: (q.missingInformation as string[]) || [],
            recommendedNextAction: q.recommendedNextAction as LeadNextBestAction | null,
            nextActionReason: q.nextActionReason,
            aiConfidence: q.aiConfidence,
            aiEvidence: (q.aiEvidence as any[]) || [],
            aiSummary: q.aiSummary,
            lastEvaluatedAt: q.lastEvaluatedAt?.toISOString() || null,
            createdAt: q.createdAt.toISOString(),
            updatedAt: q.updatedAt.toISOString(),
          }
        : null,
      recentActivities: (lead.activities || []).map((a: any) => ({
        id: a.id,
        leadId: a.leadId,
        organisationId: a.organisationId,
        activityType: a.activityType,
        actorType: a.actorType,
        actorId: a.actorId,
        title: a.title,
        description: a.description,
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
      })),
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
  }
}
