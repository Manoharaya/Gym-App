/**
 * Day 39 — Follow-Up Sequence Management Service
 * Handles sequence authoring, versioning, template seeding, and step configurations.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditService } from '../../../../audit/audit.service';
import {
  CreateFollowUpSequenceDto,
  UpdateFollowUpSequenceDto,
  CreateFollowUpStepDto,
  UpdateFollowUpStepDto,
} from '../dto/follow-up.dto';
import {
  DEFAULT_FOLLOW_UP_TEMPLATES,
  FOLLOW_UP_AUDIT_ACTIONS,
} from '../domain/follow-up.constants';
import { FollowUpSequenceType } from '@fitcore/types';

@Injectable()
export class FollowUpSequenceService {
  private readonly logger = new Logger(FollowUpSequenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new follow-up sequence with version 1 and optional initial steps.
   */
  async createSequence(
    organisationId: string,
    dto: CreateFollowUpSequenceDto,
    creatorId?: string,
  ) {
    if (!organisationId) {
      throw new BadRequestException('organisationId is required for tenant isolation');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Sequence Header
      const sequence = await tx.followUpSequence.create({
        data: {
          organisationId,
          outletId: dto.outletId || null,
          name: dto.name,
          description: dto.description || null,
          sequenceType: dto.sequenceType,
          status: 'ACTIVE',
          triggerType: dto.triggerType || 'EVENT_DRIVEN',
          createdBy: creatorId || 'SYSTEM',
        },
      });

      // 2. Create Version 1
      const versionConfig = dto.configuration || {
        cooldownHours: 0,
        maxFollowUpsPerWeek: 4,
        quietHoursStart: '23:30',
        quietHoursEnd: '06:00',
      };

      const version = await tx.followUpSequenceVersion.create({
        data: {
          sequenceId: sequence.id,
          version: 1,
          status: 'PUBLISHED',
          configuration: versionConfig as any,
          createdBy: creatorId || 'SYSTEM',
          publishedAt: new Date(),
        },
      });

      // 3. Link Active Version
      await tx.followUpSequence.update({
        where: { id: sequence.id },
        data: { activeVersionId: version.id },
      });

      // 4. Create Initial Steps if provided
      if (dto.steps && dto.steps.length > 0) {
        for (const stepDto of dto.steps) {
          await tx.followUpStep.create({
            data: {
              sequenceVersionId: version.id,
              stepOrder: stepDto.stepOrder,
              name: stepDto.name,
              delayMinutes: stepDto.delayMinutes,
              channel: stepDto.channel,
              messageMode: stepDto.messageMode || 'PERSONALIZED_TEMPLATE',
              templateId: stepDto.templateId || null,
              promptId: stepDto.promptId || null,
              requiresApproval: stepDto.requiresApproval ?? false,
              stopOnReply: stepDto.stopOnReply ?? true,
              stopOnBooking: stepDto.stopOnBooking ?? true,
              stopOnConversion: stepDto.stopOnConversion ?? true,
              stopOnStaffHandoff: stepDto.stopOnStaffHandoff ?? true,
              status: 'ACTIVE',
              configuration: (stepDto.configuration as any) || {},
            },
          });
        }
      }

      await this.auditService.log({
        organisationId,
        action: FOLLOW_UP_AUDIT_ACTIONS.SEQUENCE_CREATED,
        resource: 'FollowUpSequence',
        resourceId: sequence.id,
        metadata: { sequenceType: dto.sequenceType, name: dto.name, creatorId, actorType: 'STAFF' },
      });

      return this.getSequence(organisationId, sequence.id, tx);
    });
  }

  /**
   * Automatically seed or retrieve default system sequence template for an organisation.
   */
  async getOrCreateDefaultSequence(
    organisationId: string,
    sequenceType: FollowUpSequenceType = 'LEAD_FOLLOW_UP',
    outletId?: string,
  ) {
    // Check if an active sequence of this type already exists for this tenant
    const existing = await this.prisma.followUpSequence.findFirst({
      where: {
        organisationId,
        sequenceType,
        status: { in: ['ACTIVE', 'DRAFT'] },
        ...(outletId ? { OR: [{ outletId }, { outletId: null }] } : {}),
      },
      include: {
        versions: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      const activeVersion = existing.versions.find((v) => v.status === 'PUBLISHED') || existing.versions[0];
      return {
        ...existing,
        activeVersion,
      };
    }

    // Seed from template definition
    const templateDef = DEFAULT_FOLLOW_UP_TEMPLATES[sequenceType] || DEFAULT_FOLLOW_UP_TEMPLATES.LEAD_FOLLOW_UP;

    return this.createSequence(organisationId, {
      name: templateDef.name,
      description: templateDef.description,
      sequenceType: templateDef.sequenceType,
      outletId,
      triggerType: templateDef.triggerType,
      configuration: {
        cooldownHours: templateDef.cooldownHours,
        maxFollowUpsPerWeek: templateDef.maxFollowUpsPerWeek,
        quietHoursStart: templateDef.quietHoursStart,
        quietHoursEnd: templateDef.quietHoursEnd,
      },
      steps: templateDef.steps.map((s) => ({
        stepOrder: s.stepOrder,
        name: s.name,
        delayMinutes: s.delayMinutes,
        channel: s.channel,
        messageMode: s.messageMode,
        requiresApproval: s.requiresApproval,
        stopOnReply: s.stopOnReply,
        stopOnBooking: s.stopOnBooking,
        stopOnConversion: s.stopOnConversion,
        stopOnStaffHandoff: s.stopOnStaffHandoff,
        configuration: {
          fallbackChannel: s.fallbackChannel,
          templateBody: s.templateBody,
          templateSubject: s.templateSubject,
        },
      })),
    });
  }

  /**
   * List all sequences under an organisation with active version and active enrollments count.
   */
  async listSequences(organisationId: string, outletId?: string) {
    return this.prisma.followUpSequence.findMany({
      where: {
        organisationId,
        ...(outletId ? { OR: [{ outletId }, { outletId: null }] } : {}),
      },
      include: {
        versions: {
          where: { status: 'ACTIVE' },
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
          orderBy: { version: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            enrollments: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get complete sequence by ID.
   */
  async getSequence(organisationId: string, sequenceId: string, client?: any) {
    const prisma = client || this.prisma;
    const sequence = await prisma.followUpSequence.findFirst({
      where: { id: sequenceId, organisationId },
      include: {
        versions: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!sequence) {
      throw new NotFoundException(`FollowUpSequence ${sequenceId} not found in this organisation`);
    }

    const activeVersion =
      sequence.versions.find((v: any) => v.id === sequence.activeVersionId) ||
      sequence.versions[0] ||
      null;

    return {
      ...sequence,
      activeVersion,
    };
  }

  /**
   * Update sequence status or configuration.
   */
  async updateSequence(
    organisationId: string,
    sequenceId: string,
    dto: UpdateFollowUpSequenceDto,
    staffId?: string,
  ) {
    await this.getSequence(organisationId, sequenceId);

    const updated = await this.prisma.followUpSequence.update({
      where: { id: sequenceId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        updatedBy: staffId || 'STAFF',
      },
    });

    await this.auditService.log({
      organisationId,
      action: FOLLOW_UP_AUDIT_ACTIONS.SEQUENCE_UPDATED,
      resource: 'FollowUpSequence',
      resourceId: sequenceId,
      metadata: { changes: dto, staffId, actorType: 'STAFF' },
    });

    return this.getSequence(organisationId, sequenceId);
  }

  /**
   * Add a step to an existing sequence active version.
   */
  async addStep(organisationId: string, sequenceId: string, dto: CreateFollowUpStepDto) {
    const sequence = await this.getSequence(organisationId, sequenceId);
    const version = sequence.activeVersion;
    if (!version) {
      throw new BadRequestException('Sequence has no active version to add step to');
    }

    const step = await this.prisma.followUpStep.create({
      data: {
        sequenceVersionId: version.id,
        stepOrder: dto.stepOrder,
        name: dto.name,
        delayMinutes: dto.delayMinutes,
        channel: dto.channel,
        messageMode: dto.messageMode || 'PERSONALIZED_TEMPLATE',
        templateId: dto.templateId || null,
        promptId: dto.promptId || null,
        requiresApproval: dto.requiresApproval ?? false,
        stopOnReply: dto.stopOnReply ?? true,
        stopOnBooking: dto.stopOnBooking ?? true,
        stopOnConversion: dto.stopOnConversion ?? true,
        stopOnStaffHandoff: dto.stopOnStaffHandoff ?? true,
        status: 'ACTIVE',
        configuration: (dto.configuration as any) || {},
      },
    });

    return step;
  }

  /**
   * Update a specific step.
   */
  async updateStep(
    organisationId: string,
    stepId: string,
    dto: UpdateFollowUpStepDto,
  ) {
    const step = await this.prisma.followUpStep.findUnique({
      where: { id: stepId },
      include: { sequenceVersion: { include: { sequence: true } } },
    });

    if (!step || step.sequenceVersion.sequence.organisationId !== organisationId) {
      throw new NotFoundException(`Step ${stepId} not found in this organisation`);
    }

    return this.prisma.followUpStep.update({
      where: { id: stepId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.delayMinutes !== undefined ? { delayMinutes: dto.delayMinutes } : {}),
        ...(dto.channel ? { channel: dto.channel } : {}),
        ...(dto.messageMode ? { messageMode: dto.messageMode } : {}),
        ...(dto.requiresApproval !== undefined ? { requiresApproval: dto.requiresApproval } : {}),
        ...(dto.stopOnReply !== undefined ? { stopOnReply: dto.stopOnReply } : {}),
        ...(dto.stopOnBooking !== undefined ? { stopOnBooking: dto.stopOnBooking } : {}),
        ...(dto.stopOnConversion !== undefined ? { stopOnConversion: dto.stopOnConversion } : {}),
        ...(dto.stopOnStaffHandoff !== undefined ? { stopOnStaffHandoff: dto.stopOnStaffHandoff } : {}),
        ...(dto.configuration ? { configuration: dto.configuration as any } : {}),
      },
    });
  }
}
