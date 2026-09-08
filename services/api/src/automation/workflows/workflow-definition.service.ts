/**
 * Day 30 — Workflow Definition Service
 *
 * Manages CRUD operations, schema validation, versioning,
 * publishing, and lifecycle transitions of engagement workflows.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowSafetyService } from '../safeguards/workflow-safety.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  EngagementWorkflowSummaryDto,
  EngagementWorkflowDetailDto,
} from '@fitcore/types';

@Injectable()
export class WorkflowDefinitionService {
  private readonly logger = new Logger(WorkflowDefinitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly safetyService: WorkflowSafetyService,
  ) {}

  /**
   * Creates a new engagement workflow with version 1.
   */
  async createWorkflow(
    organisationId: string,
    dto: CreateWorkflowDto,
    userId?: string,
  ): Promise<EngagementWorkflowDetailDto> {
    // Validate safety of planned actions
    this.safetyService.validateActionsSafety(dto.actions);

    const created = await this.prisma.engagementWorkflow.create({
      data: {
        organisationId,
        outletId: dto.outletId || null,
        name: dto.name,
        description: dto.description || null,
        triggerType: dto.triggerType,
        status: 'DRAFT',
        enabled: false,
        approvalMode: dto.approvalMode || 'CONFIGURABLE',
        version: 1,
        createdBy: userId || null,
        versions: {
          create: {
            version: 1,
            triggerDefinition: {
              triggerType: dto.triggerType,
              parameters: dto.triggerConfig.parameters || {},
              audienceFilter: dto.audienceFilter || {},
            } as any,
            conditionDefinition: (dto.triggerConfig.conditions || {}) as any,
            actionDefinition: dto.actions as any,
            settings: {
              audienceFilter: dto.audienceFilter,
              stopConditions: dto.stopConditions,
              safetyPolicy: dto.safetyPolicy,
              tags: dto.tags || [],
            } as any,
            createdBy: userId || null,
          },
        },
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    return this.mapToDetailDto(created, (created as any).versions?.[0]);
  }

  /**
   * Updates a workflow, incrementing version if criteria or actions change.
   */
  async updateWorkflow(
    id: string,
    organisationId: string,
    dto: UpdateWorkflowDto,
    userId?: string,
  ): Promise<EngagementWorkflowDetailDto> {
    const existing = await this.prisma.engagementWorkflow.findFirst({
      where: { id, organisationId },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Workflow ${id} not found in organisation ${organisationId}.`);
    }

    if (dto.actions) {
      this.safetyService.validateActionsSafety(dto.actions);
    }

    const currentVersion = (existing as any).versions?.[0];
    const newVersionNumber = existing.version + 1;

    // Create new version snapshot if definition changes
    if (dto.actions || dto.triggerConfig || dto.audienceFilter || dto.stopConditions || dto.safetyPolicy) {
      const currentSettings = (currentVersion?.settings as Record<string, any>) || {};

      await this.prisma.engagementWorkflowVersion.create({
        data: {
          workflowId: existing.id,
          version: newVersionNumber,
          triggerDefinition: {
            triggerType: dto.triggerType || existing.triggerType,
            parameters: dto.triggerConfig?.parameters || (currentVersion?.triggerDefinition as any)?.parameters || {},
            audienceFilter: dto.audienceFilter || currentSettings.audienceFilter || {},
          } as any,
          conditionDefinition: (dto.triggerConfig?.conditions || currentVersion?.conditionDefinition || {}) as any,
          actionDefinition: ((dto.actions as any) || currentVersion?.actionDefinition || []) as any,
          settings: {
            audienceFilter: dto.audienceFilter || currentSettings.audienceFilter,
            stopConditions: dto.stopConditions || currentSettings.stopConditions,
            safetyPolicy: dto.safetyPolicy || currentSettings.safetyPolicy,
            tags: dto.tags || currentSettings.tags || [],
          } as any,
          createdBy: userId || null,
        },
      });

      await this.prisma.engagementWorkflow.update({
        where: { id: existing.id },
        data: {
          name: dto.name || existing.name,
          description: dto.description !== undefined ? dto.description : existing.description,
          triggerType: dto.triggerType || existing.triggerType,
          approvalMode: dto.approvalMode || existing.approvalMode,
          version: newVersionNumber,
          updatedBy: userId || null,
        },
      });
    } else {
      // Just metadata update
      await this.prisma.engagementWorkflow.update({
        where: { id: existing.id },
        data: {
          name: dto.name || existing.name,
          description: dto.description !== undefined ? dto.description : existing.description,
          approvalMode: dto.approvalMode || existing.approvalMode,
          updatedBy: userId || null,
        },
      });
    }

    return this.getWorkflow(id, organisationId);
  }

  /**
   * Activates / Publishes a workflow.
   */
  async activateWorkflow(id: string, organisationId: string): Promise<EngagementWorkflowDetailDto> {
    const existing = await this.prisma.engagementWorkflow.findFirst({
      where: { id, organisationId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!existing) throw new NotFoundException(`Workflow ${id} not found.`);

    await this.prisma.engagementWorkflow.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        enabled: true,
      },
    });

    if (existing.versions[0]) {
      await this.prisma.engagementWorkflowVersion.update({
        where: { id: existing.versions[0].id },
        data: { publishedAt: new Date() },
      });
    }

    return this.getWorkflow(id, organisationId);
  }

  /**
   * Publishes a workflow (immutable version snapshot with publishedAt timestamp).
   */
  async publishWorkflow(id: string, organisationId: string): Promise<EngagementWorkflowDetailDto> {
    return this.activateWorkflow(id, organisationId);
  }

  /**
   * Pauses an active workflow.
   */
  async pauseWorkflow(id: string, organisationId: string): Promise<EngagementWorkflowDetailDto> {
    await this.prisma.engagementWorkflow.updateMany({
      where: { id, organisationId },
      data: { status: 'PAUSED', enabled: false },
    });
    return this.getWorkflow(id, organisationId);
  }

  /**
   * Archives a workflow.
   */
  async archiveWorkflow(id: string, organisationId: string): Promise<EngagementWorkflowDetailDto> {
    await this.prisma.engagementWorkflow.updateMany({
      where: { id, organisationId },
      data: { status: 'ARCHIVED', enabled: false },
    });
    return this.getWorkflow(id, organisationId);
  }

  /**
   * Fetches single workflow details.
   */
  async getWorkflow(id: string, organisationId: string): Promise<EngagementWorkflowDetailDto> {
    const workflow = await this.prisma.engagementWorkflow.findFirst({
      where: { id, organisationId },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found.`);
    }

    return this.mapToDetailDto(workflow, workflow.versions[0]);
  }

  /**
   * Lists workflows with filter options and instance summaries.
   */
  async listWorkflows(
    organisationId: string,
    filters: { status?: string; triggerType?: string; outletId?: string; search?: string },
  ): Promise<EngagementWorkflowSummaryDto[]> {
    const where: any = {
      organisationId,
    };

    if (filters.status) where.status = filters.status;
    if (filters.triggerType) where.triggerType = filters.triggerType;
    if (filters.outletId) where.outletId = filters.outletId;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const workflows = await this.prisma.engagementWorkflow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
    });

    return workflows.map((w) => ({
      id: w.id,
      organisationId: w.organisationId,
      outletId: w.outletId,
      name: w.name,
      description: w.description,
      triggerType: w.triggerType as any,
      status: w.status as any,
      approvalMode: w.approvalMode as any,
      currentVersion: w.version,
      activeInstanceCount: w._count.instances,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    }));
  }

  private mapToDetailDto(workflow: any, version: any): EngagementWorkflowDetailDto {
    const triggerDef = (version?.triggerDefinition as Record<string, any>) || {};
    const conditionDef = (version?.conditionDefinition as any) || null;
    const actionDefs = (version?.actionDefinition as any[]) || [];
    const settings = (version?.settings as Record<string, any>) || {};

    return {
      id: workflow.id,
      organisationId: workflow.organisationId,
      outletId: workflow.outletId,
      name: workflow.name,
      description: workflow.description,
      triggerType: workflow.triggerType as any,
      status: workflow.status as any,
      approvalMode: workflow.approvalMode as any,
      currentVersion: workflow.version,
      triggerConfig: {
        triggerType: workflow.triggerType as any,
        parameters: triggerDef.parameters || {},
        conditions: conditionDef,
      },
      audienceFilter: settings.audienceFilter || triggerDef.audienceFilter || null,
      stopConditions: settings.stopConditions || null,
      safetyPolicy: settings.safetyPolicy || null,
      actions: actionDefs,
      tags: settings.tags || [],
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    };
  }
}
