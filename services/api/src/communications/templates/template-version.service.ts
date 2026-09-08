import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CommunicationTemplateVersionDto, TemplateVersionStatus } from '../communications.types';

@Injectable()
export class TemplateVersionService {
  private readonly logger = new Logger(TemplateVersionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the active version for a given template.
   */
  async getActiveVersion(templateId: string) {
    const version = await this.prisma.communicationTemplateVersion.findFirst({
      where: { templateId, status: 'ACTIVE' },
      orderBy: { version: 'desc' },
    });

    if (!version) {
      // If no ACTIVE version, grab the latest version
      return this.prisma.communicationTemplateVersion.findFirst({
        where: { templateId },
        orderBy: { version: 'desc' },
      });
    }

    return version;
  }

  /**
   * Retrieves a specific version number for a template.
   */
  async getVersion(templateId: string, versionNumber: number) {
    const version = await this.prisma.communicationTemplateVersion.findUnique({
      where: {
        templateId_version: {
          templateId,
          version: versionNumber,
        },
      },
    });

    if (!version) {
      throw new NotFoundException(
        `Template version ${versionNumber} for template '${templateId}' not found`
      );
    }

    return version;
  }

  /**
   * Creates a new version for a template.
   */
  async createVersion(
    templateId: string,
    data: {
      subjectTemplate?: string;
      bodyTemplate: string;
      variablesSchema?: Record<string, any> | string[];
      status?: TemplateVersionStatus;
      createdBy?: string;
    },
  ) {
    const template = await this.prisma.communicationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID '${templateId}' not found`);
    }

    // Determine the next version number
    const latestVersion = await this.prisma.communicationTemplateVersion.findFirst({
      where: { templateId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersionNumber = (latestVersion?.version || 0) + 1;

    // If new version is ACTIVE, set previous ACTIVE versions to ARCHIVED
    if (data.status === 'ACTIVE' || !data.status) {
      await this.prisma.communicationTemplateVersion.updateMany({
        where: { templateId, status: 'ACTIVE' },
        data: { status: 'ARCHIVED' },
      });
    }

    return this.prisma.communicationTemplateVersion.create({
      data: {
        templateId,
        version: nextVersionNumber,
        subjectTemplate: data.subjectTemplate,
        bodyTemplate: data.bodyTemplate,
        variablesSchema: data.variablesSchema || {},
        status: data.status || 'ACTIVE',
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Lists all versions for a template.
   */
  async listVersions(templateId: string) {
    return this.prisma.communicationTemplateVersion.findMany({
      where: { templateId },
      orderBy: { version: 'desc' },
    });
  }
}
