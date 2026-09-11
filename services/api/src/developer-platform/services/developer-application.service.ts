/**
 * FitCore — Day 49: Developer Application Lifecycle Service
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeveloperSecurityService } from './developer-security.service';
import { ApiAuditService } from './api-audit.service';
import { ApiScopeService } from './api-scope.service';
import {
  CreateDeveloperApplicationDto,
  DeveloperApplicationDto,
  DeveloperApplicationStatus,
  DeveloperApplicationType,
  DeveloperEnvironment,
  RateLimitTier,
  UpdateDeveloperApplicationDto,
} from '@fitcore/types';
import { DeveloperError } from '../domain/developer-errors';

export interface ApplicationCreatedResponseDto {
  application: DeveloperApplicationDto;
  clientSecret: string; // ONLY returned once on creation!
}

@Injectable()
export class DeveloperApplicationService {
  private readonly logger = new Logger(DeveloperApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly security: DeveloperSecurityService,
    private readonly audit: ApiAuditService,
    private readonly scopeService: ApiScopeService,
  ) {}

  /**
   * Creates a new developer application.
   */
  async createApplication(
    organisationId: string | null,
    createdByUserId: string,
    dto: CreateDeveloperApplicationDto,
  ): Promise<ApplicationCreatedResponseDto> {
    const clientId = this.security.generateClientId();
    const plainClientSecret = this.security.generateClientSecret();
    const clientSecretHash = this.security.hashSecret(plainClientSecret);

    // Validate scopes
    const allowedScopes = dto.allowedScopes
      ? this.scopeService.validateScopes(dto.allowedScopes)
      : ['members:read', 'classes:read', 'bookings:read', 'bookings:write'];

    const app = await this.prisma.developerApplication.create({
      data: {
        organisationId,
        createdByUserId,
        name: dto.name,
        description: dto.description,
        applicationType: dto.applicationType || 'ORGANISATION',
        status: 'ACTIVE',
        environment: dto.environment || 'SANDBOX',
        clientId,
        clientSecretHash,
        redirectUris: dto.redirectUris || [],
        allowedScopes,
        webhookEnabled: dto.webhookEnabled !== undefined ? dto.webhookEnabled : true,
        rateLimitTier: dto.environment === 'PRODUCTION' ? 'STANDARD' : 'SANDBOX',
      },
    });

    await this.audit.log({
      organisationId,
      applicationId: app.id,
      userId: createdByUserId,
      action: 'DEVELOPER_APPLICATION_CREATED',
      resource: 'DeveloperApplication',
      resourceId: app.id,
      metadata: { name: app.name, clientId, environment: app.environment },
    });

    return {
      application: this.mapToDto(app),
      clientSecret: plainClientSecret,
    };
  }

  /**
   * Updates an application's details, redirect URIs, or allowed scopes.
   */
  async updateApplication(
    applicationId: string,
    dto: UpdateDeveloperApplicationDto,
    userId?: string,
  ): Promise<DeveloperApplicationDto> {
    const existing = await this.prisma.developerApplication.findUnique({
      where: { id: applicationId },
    });
    if (!existing) {
      throw DeveloperError.notFound('DeveloperApplication', applicationId);
    }

    let allowedScopes = existing.allowedScopes;
    if (dto.allowedScopes) {
      allowedScopes = this.scopeService.validateScopes(dto.allowedScopes);
    }

    const updated = await this.prisma.developerApplication.update({
      where: { id: applicationId },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        redirectUris: dto.redirectUris ?? existing.redirectUris,
        allowedScopes,
        status: dto.status ?? (existing.status as any),
        webhookEnabled: dto.webhookEnabled ?? existing.webhookEnabled,
      },
    });

    await this.audit.log({
      organisationId: updated.organisationId,
      applicationId: updated.id,
      userId,
      action: 'DEVELOPER_APPLICATION_UPDATED',
      resource: 'DeveloperApplication',
      resourceId: updated.id,
      metadata: { changes: dto },
    });

    return this.mapToDto(updated);
  }

  /**
   * Rotates an application's client secret.
   */
  async rotateClientSecret(
    applicationId: string,
    userId?: string,
  ): Promise<{ application: DeveloperApplicationDto; clientSecret: string }> {
    const existing = await this.prisma.developerApplication.findUnique({
      where: { id: applicationId },
    });
    if (!existing) {
      throw DeveloperError.notFound('DeveloperApplication', applicationId);
    }

    const plainClientSecret = this.security.generateClientSecret();
    const clientSecretHash = this.security.hashSecret(plainClientSecret);

    const updated = await this.prisma.developerApplication.update({
      where: { id: applicationId },
      data: { clientSecretHash },
    });

    await this.audit.log({
      organisationId: updated.organisationId,
      applicationId: updated.id,
      userId,
      action: 'DEVELOPER_APPLICATION_SECRET_ROTATED',
      resource: 'DeveloperApplication',
      resourceId: updated.id,
    });

    return {
      application: this.mapToDto(updated),
      clientSecret: plainClientSecret,
    };
  }

  /**
   * Suspends or revokes an application and invalidates all associated credentials.
   */
  async revokeApplication(
    applicationId: string,
    status: 'SUSPENDED' | 'REVOKED' | 'ARCHIVED' = 'REVOKED',
    userId?: string,
  ): Promise<DeveloperApplicationDto> {
    const app = await this.prisma.developerApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) {
      throw DeveloperError.notFound('DeveloperApplication', applicationId);
    }

    // Cascade revoke API keys, tokens, and pause webhooks
    await this.prisma.$transaction([
      this.prisma.developerApplication.update({
        where: { id: applicationId },
        data: { status },
      }),
      this.prisma.developerApiKey.updateMany({
        where: { applicationId, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      }),
      this.prisma.oAuthToken.updateMany({
        where: { applicationId, status: 'ACTIVE' },
        data: { status: 'REVOKED' },
      }),
      this.prisma.webhookSubscription.updateMany({
        where: { applicationId, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      }),
    ]);

    const updated = await this.prisma.developerApplication.findUniqueOrThrow({
      where: { id: applicationId },
    });

    await this.audit.log({
      organisationId: updated.organisationId,
      applicationId: updated.id,
      userId,
      action: status === 'SUSPENDED' ? 'DEVELOPER_APPLICATION_SUSPENDED' : 'DEVELOPER_APPLICATION_REVOKED',
      resource: 'DeveloperApplication',
      resourceId: updated.id,
      metadata: { newStatus: status },
    });

    return this.mapToDto(updated);
  }

  /**
   * Lists applications for an organisation
   */
  async listApplications(organisationId?: string): Promise<DeveloperApplicationDto[]> {
    const where: any = {};
    if (organisationId) {
      where.organisationId = organisationId;
    }

    const apps = await this.prisma.developerApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return apps.map((a) => this.mapToDto(a));
  }

  /**
   * Gets a specific application by ID or Client ID
   */
  async getApplication(idOrClientId: string): Promise<DeveloperApplicationDto> {
    const app = await this.prisma.developerApplication.findFirst({
      where: {
        OR: [{ id: idOrClientId }, { clientId: idOrClientId }],
      },
    });
    if (!app) {
      throw DeveloperError.notFound('DeveloperApplication', idOrClientId);
    }
    return this.mapToDto(app);
  }

  mapToDto(a: any): DeveloperApplicationDto {
    return {
      id: a.id,
      organisationId: a.organisationId,
      createdByUserId: a.createdByUserId,
      name: a.name,
      description: a.description,
      applicationType: a.applicationType as DeveloperApplicationType,
      status: a.status as DeveloperApplicationStatus,
      environment: a.environment as DeveloperEnvironment,
      clientId: a.clientId,
      redirectUris: a.redirectUris,
      allowedScopes: a.allowedScopes as any[],
      webhookEnabled: a.webhookEnabled,
      rateLimitTier: a.rateLimitTier as RateLimitTier,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}
