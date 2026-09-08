import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { TemplateVersionService } from './template-version.service';
import { TemplateRendererService } from './template-renderer.service';
import {
  CommunicationChannel,
  CommunicationType,
  CommunicationTemplateDto,
} from '../communications.types';
import { COMMUNICATION_AUDIT_ACTIONS } from '../communications.constants';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly versionService: TemplateVersionService,
    private readonly rendererService: TemplateRendererService,
  ) {}

  /**
   * Retrieves templates accessible to an organisation (includes org-specific and SYSTEM templates).
   */
  async getTemplates(organisationId: string, filter?: { channel?: CommunicationChannel; type?: CommunicationType }) {
    const where: any = {
      OR: [{ organisationId }, { organisationId: null }, { isSystem: true }],
      status: 'ACTIVE',
    };

    if (filter?.channel) where.channel = filter.channel;
    if (filter?.type) where.type = filter.type;

    return this.prisma.communicationTemplate.findMany({
      where,
      include: {
        versions: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { version: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves a single template by ID ensuring tenant isolation.
   */
  async getTemplateById(templateId: string, organisationId?: string) {
    const template = await this.prisma.communicationTemplate.findUnique({
      where: { id: templateId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Communication template '${templateId}' not found`);
    }

    if (
      organisationId &&
      template.organisationId &&
      template.organisationId !== organisationId &&
      !template.isSystem
    ) {
      throw new ForbiddenException('Cross-tenant template access denied');
    }

    return template;
  }

  /**
   * Creates a new communication template and its initial version (v1).
   */
  async createTemplate(params: {
    organisationId?: string | null;
    name: string;
    type: CommunicationType;
    channel: CommunicationChannel;
    description?: string;
    isSystem?: boolean;
    subjectTemplate?: string;
    bodyTemplate: string;
    variablesSchema?: Record<string, any> | string[];
    actorUserId?: string;
  }) {
    const {
      organisationId = null,
      name,
      type,
      channel,
      description,
      isSystem = false,
      subjectTemplate,
      bodyTemplate,
      variablesSchema = {},
      actorUserId,
    } = params;

    const template = await this.prisma.communicationTemplate.create({
      data: {
        organisationId,
        name,
        type,
        channel,
        description,
        isSystem,
        status: 'ACTIVE',
      },
    });

    const version = await this.versionService.createVersion(template.id, {
      subjectTemplate,
      bodyTemplate,
      variablesSchema,
      status: 'ACTIVE',
      createdBy: actorUserId,
    });

    if (actorUserId && organisationId) {
      await this.auditService.log({
        userId: actorUserId,
        organisationId,
        action: COMMUNICATION_AUDIT_ACTIONS.TEMPLATE_CREATED,
        resource: 'communication_template',
        resourceId: template.id,
        metadata: { name, channel, type, version: version.version },
      });
    }

    return {
      ...template,
      versions: [version],
    };
  }

  /**
   * Updates an organisation template. If subject or body is updated, a new version is created.
   */
  async updateTemplate(
    templateId: string,
    organisationId: string,
    params: {
      name?: string;
      description?: string;
      status?: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
      subjectTemplate?: string;
      bodyTemplate?: string;
      variablesSchema?: Record<string, any> | string[];
      actorUserId?: string;
    }
  ) {
    const existing = await this.getTemplateById(templateId, organisationId);

    if (existing.isSystem || !existing.organisationId) {
      throw new ForbiddenException('System templates cannot be modified by organisations');
    }

    const updatedTemplate = await this.prisma.communicationTemplate.update({
      where: { id: templateId },
      data: {
        name: params.name ?? existing.name,
        description: params.description ?? existing.description,
        status: params.status ?? existing.status,
      },
    });

    let newVersion;
    if (params.bodyTemplate !== undefined || params.subjectTemplate !== undefined) {
      newVersion = await this.versionService.createVersion(templateId, {
        subjectTemplate: params.subjectTemplate,
        bodyTemplate: params.bodyTemplate ?? '',
        variablesSchema: params.variablesSchema,
        status: 'ACTIVE',
        createdBy: params.actorUserId,
      });
    }

    return {
      ...updatedTemplate,
      latestVersion: newVersion,
    };
  }

  /**
   * Renders a template with provided variables.
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, any>,
    specificVersion?: number,
  ): Promise<{ subject?: string; body: string; version: number }> {
    const version = specificVersion
      ? await this.versionService.getVersion(templateId, specificVersion)
      : await this.versionService.getActiveVersion(templateId);

    if (!version) {
      throw new BadRequestException(`No active version found for template '${templateId}'`);
    }

    const renderedSubject = version.subjectTemplate
      ? this.rendererService.render(version.subjectTemplate, variables)
      : undefined;

    const renderedBody = this.rendererService.render(
      version.bodyTemplate,
      variables,
      version.variablesSchema as any
    );

    return {
      subject: renderedSubject,
      body: renderedBody,
      version: version.version,
    };
  }
}
