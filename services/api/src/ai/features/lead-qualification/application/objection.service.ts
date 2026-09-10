/**
 * FitCore Lead Qualification Objection Service (Day 38)
 *
 * Manages full lifecycle of prospect objections:
 * OPEN -> PARTIALLY_ADDRESSED -> RESOLVED / DISMISSED
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  CreateLeadObjectionDto,
  UpdateLeadObjectionDto,
} from '../dto/lead-qualification.dto';
import { QualificationActorType, LeadObjectionStatus } from '@fitcore/types';
import { QualificationHistoryService } from './qualification-history.service';

@Injectable()
export class ObjectionService {
  private readonly logger = new Logger(ObjectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly historyService: QualificationHistoryService,
  ) {}

  /**
   * Retrieves all objections for a lead, optionally filtered by status.
   */
  async findObjections(leadId: string, status?: LeadObjectionStatus) {
    return this.prisma.leadQualificationObjection.findMany({
      where: {
        leadId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Checks whether the lead has any open blocker objections.
   */
  async hasBlockerObjection(leadId: string): Promise<boolean> {
    const blocker = await this.prisma.leadQualificationObjection.findFirst({
      where: {
        leadId,
        status: 'OPEN',
        severity: 'BLOCKER',
      },
    });
    return !!blocker;
  }

  /**
   * Records a new objection in the relational database.
   */
  async createObjection(
    organisationId: string,
    leadId: string,
    dto: CreateLeadObjectionDto,
    actorType: QualificationActorType = 'AI_SALES_AGENT',
    actorId?: string,
  ) {
    const profile = await this.prisma.leadQualificationProfile.findUnique({
      where: { leadId },
    });

    const objection = await this.prisma.leadQualificationObjection.create({
      data: {
        organisationId,
        leadId,
        profileId: profile?.id,
        objectionType: dto.objectionType,
        status: 'OPEN',
        severity: dto.severity || 'MEDIUM',
        rawCustomerStatement: dto.rawCustomerStatement,
        normalizedSummary: dto.normalizedSummary,
        resolutionNotes: dto.resolutionNotes,
        source: dto.source || 'AI_EXTRACTION',
      },
    });

    // Record in qualification history
    await this.historyService.recordChanges({
      leadId,
      profileId: profile?.id,
      organisationId,
      actorType,
      actorId,
      source: dto.source || 'AI_EXTRACTION',
      evidence: dto.rawCustomerStatement,
      reason: `Objection recorded: ${dto.objectionType}`,
      changes: [
        {
          field: 'objection_created',
          previousValue: null,
          newValue: {
            id: objection.id,
            type: objection.objectionType,
            severity: objection.severity,
            summary: objection.normalizedSummary,
          },
        },
      ],
    });

    // Sync objections summary into profile JSON
    await this.syncProfileObjectionsJson(leadId);

    return objection;
  }

  /**
   * Updates or resolves an objection.
   */
  async updateObjection(
    organisationId: string,
    leadId: string,
    objectionId: string,
    dto: UpdateLeadObjectionDto,
    actorType: QualificationActorType = 'STAFF',
    actorId?: string,
  ) {
    const existing = await this.prisma.leadQualificationObjection.findUnique({
      where: { id: objectionId },
    });

    if (!existing || existing.leadId !== leadId || existing.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'OBJECTION_NOT_FOUND',
        message: `Objection ${objectionId} not found for lead ${leadId}`,
      });
    }

    const isResolving = dto.status === 'RESOLVED' && existing.status !== 'RESOLVED';
    const isAddressing = dto.status === 'PARTIALLY_ADDRESSED' && existing.status === 'OPEN';

    const updated = await this.prisma.leadQualificationObjection.update({
      where: { id: objectionId },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.severity ? { severity: dto.severity } : {}),
        ...(dto.normalizedSummary ? { normalizedSummary: dto.normalizedSummary } : {}),
        ...(dto.resolutionNotes ? { resolutionNotes: dto.resolutionNotes } : {}),
        ...(isResolving ? { resolvedAt: new Date() } : {}),
        ...(isAddressing || isResolving
          ? {
              addressedAt: new Date(),
              addressedByActorType: actorType,
              addressedByActorId: actorId,
            }
          : {}),
      },
    });

    // Record in qualification history
    await this.historyService.recordChanges({
      leadId,
      profileId: existing.profileId || undefined,
      organisationId,
      actorType,
      actorId,
      source: actorType === 'STAFF' ? 'STAFF_ENTERED' : 'AI_EXTRACTION',
      reason: `Objection ${objectionId} updated: status=${updated.status}`,
      changes: [
        {
          field: `objection_${objectionId}_status`,
          previousValue: existing.status,
          newValue: updated.status,
        },
      ],
    });

    // Sync objections summary into profile JSON
    await this.syncProfileObjectionsJson(leadId);

    return updated;
  }

  /**
   * Syncs active and resolved objections to profile.objections JSON for backward compatibility.
   */
  async syncProfileObjectionsJson(leadId: string): Promise<void> {
    const objections = await this.prisma.leadQualificationObjection.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    const objectionsSummary = objections.map((o) => ({
      id: o.id,
      type: o.objectionType,
      customerStatementSummary: o.normalizedSummary,
      timestamp: o.createdAt.toISOString(),
      resolved: o.status === 'RESOLVED' || o.status === 'DISMISSED',
      status: o.status,
      severity: o.severity,
    }));

    await this.prisma.leadQualificationProfile.updateMany({
      where: { leadId },
      data: {
        objections: objectionsSummary as any,
      },
    });
  }
}
