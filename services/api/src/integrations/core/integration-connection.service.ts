/**
 * FitCore — Day 48: Integration Connection Service
 *
 * Manages external provider connections, encrypted credential persistence,
 * multi-scope lifecycle management, and DTO mapping without secret exposure.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IntegrationRegistry } from './integration-registry.service';
import { IntegrationCredentialService } from './integration-credential.service';
import { IntegrationAuditService } from './integration-audit.service';
import { IntegrationPermissionService, IntegrationAccessContext } from './integration-permission.service';
import { IntegrationHealthService } from './integration-health.service';
import {
  IntegrationConnectionDto,
  CreateIntegrationConnectionDto,
  IntegrationScope,
  IntegrationConnectionStatus,
} from '@fitcore/types';
import { UpdateConnectionDto } from '../dto/update-connection.dto';

@Injectable()
export class IntegrationConnectionService {
  private readonly logger = new Logger(IntegrationConnectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: IntegrationRegistry,
    private readonly credentialService: IntegrationCredentialService,
    private readonly auditService: IntegrationAuditService,
    private readonly permissionService: IntegrationPermissionService,
    private readonly healthService: IntegrationHealthService,
  ) {}

  /**
   * Creates a new connection record in PENDING or CONNECTED status.
   */
  async createConnection(
    ctx: IntegrationAccessContext,
    dto: CreateIntegrationConnectionDto,
  ): Promise<IntegrationConnectionDto> {
    const providerMeta = this.registry.getProvider(dto.integrationKey);
    const scope: IntegrationScope = dto.scope || providerMeta.supportedScopes[0] || 'ORGANISATION';

    if (!providerMeta.supportedScopes.includes(scope)) {
      throw new BadRequestException(
        `Scope '${scope}' is not supported by provider '${dto.integrationKey}'. Supported scopes: ${providerMeta.supportedScopes.join(', ')}`,
      );
    }

    // RBAC & IDOR validation
    this.permissionService.assertCanMutateScope(ctx, scope, {
      outletId: dto.outletId,
      memberId: dto.memberId,
      staffId: dto.staffId,
    });

    const targetOutletId = scope === 'OUTLET' ? dto.outletId || ctx.outletId : null;
    const targetMemberId = scope === 'MEMBER' ? dto.memberId || ctx.memberId : null;
    const targetStaffId = scope === 'STAFF' ? dto.staffId || ctx.staffId : null;

    if (scope === 'OUTLET' && !targetOutletId) {
      throw new BadRequestException('outletId is required for OUTLET-scoped integrations');
    }
    if (scope === 'MEMBER' && !targetMemberId) {
      throw new BadRequestException('memberId is required for MEMBER-scoped integrations');
    }
    if (scope === 'STAFF' && !targetStaffId) {
      throw new BadRequestException('staffId is required for STAFF-scoped integrations');
    }

    // Encrypt credentials if provided
    let encryptedCredentials: string | null = null;
    let initialStatus: IntegrationConnectionStatus = 'PENDING';
    if (dto.credentials && Object.keys(dto.credentials).length > 0) {
      encryptedCredentials = this.credentialService.encrypt(dto.credentials);
      initialStatus = 'CONNECTED';
    }

    const connection = await this.prisma.integrationConnection.create({
      data: {
        organisationId: ctx.organisationId,
        outletId: targetOutletId,
        memberId: targetMemberId,
        staffId: targetStaffId,
        integrationKey: providerMeta.integrationKey,
        provider: providerMeta.provider,
        category: providerMeta.category,
        scope,
        status: initialStatus,
        environment: dto.environment || 'DEVELOPMENT',
        encryptedCredentials,
        configuration: (dto.configuration as any) || {},
        connectedByUserId: ctx.userId,
        connectedAt: initialStatus === 'CONNECTED' ? new Date() : null,
      },
    });

    await this.auditService.log({
      organisationId: ctx.organisationId,
      connectionId: connection.id,
      userId: ctx.userId,
      action: 'INTEGRATION_CONNECTED',
      resourceId: connection.id,
      metadata: { integrationKey: connection.integrationKey, scope: connection.scope },
    });

    return this.mapToDto(connection);
  }

  /**
   * Retrieves connection by ID with strict tenant and IDOR isolation.
   */
  async getConnectionById(
    ctx: IntegrationAccessContext,
    connectionId: string,
  ): Promise<IntegrationConnectionDto> {
    const connection = await this.prisma.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException(`Integration connection '${connectionId}' not found`);
    }

    this.permissionService.assertCanAccessConnection(ctx, connection);
    return this.mapToDto(connection);
  }

  /**
   * Lists connections for the organisation with optional filters.
   */
  async listConnections(
    ctx: IntegrationAccessContext,
    filters?: {
      category?: string;
      status?: string;
      scope?: string;
      integrationKey?: string;
      outletId?: string;
      memberId?: string;
      staffId?: string;
    },
  ): Promise<IntegrationConnectionDto[]> {
    const where: any = { organisationId: ctx.organisationId };

    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;
    if (filters?.scope) where.scope = filters.scope;
    if (filters?.integrationKey) where.integrationKey = filters.integrationKey.toUpperCase();
    if (filters?.outletId) where.outletId = filters.outletId;
    if (filters?.memberId) where.memberId = filters.memberId;
    if (filters?.staffId) where.staffId = filters.staffId;

    // For non-superadmin and non-admin, limit by role scope
    const isOrgAdmin =
      ctx.roles.includes('SUPERADMIN') ||
      ctx.roles.includes('ORGANISATION_OWNER') ||
      ctx.roles.includes('ADMIN') ||
      ctx.roles.includes('OWNER');

    if (!isOrgAdmin) {
      const isMember = ctx.roles.includes('MEMBER');
      const isTrainer = ctx.roles.includes('TRAINER');
      const isOutletManager = ctx.roles.includes('OUTLET_MANAGER');

      if (isMember) {
        where.scope = 'MEMBER';
        where.memberId = ctx.memberId || 'NONE';
      } else if (isTrainer) {
        where.scope = 'STAFF';
        where.staffId = ctx.staffId || 'NONE';
      } else if (isOutletManager) {
        where.scope = 'OUTLET';
        where.outletId = ctx.outletId || 'NONE';
      }
    }

    const connections = await this.prisma.integrationConnection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return connections.map((c) => this.mapToDto(c));
  }

  /**
   * Updates an existing connection.
   */
  async updateConnection(
    ctx: IntegrationAccessContext,
    connectionId: string,
    dto: UpdateConnectionDto,
  ): Promise<IntegrationConnectionDto> {
    const connection = await this.prisma.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException(`Integration connection '${connectionId}' not found`);
    }

    this.permissionService.assertCanMutateScope(ctx, connection.scope as IntegrationScope, {
      outletId: connection.outletId || undefined,
      memberId: connection.memberId || undefined,
      staffId: connection.staffId || undefined,
    });

    const updateData: any = {};
    if (dto.environment) updateData.environment = dto.environment;
    if (dto.status) updateData.status = dto.status;
    if (dto.configuration) updateData.configuration = dto.configuration;

    if (dto.credentials && Object.keys(dto.credentials).length > 0) {
      updateData.encryptedCredentials = this.credentialService.encrypt(dto.credentials);
      updateData.status = 'CONNECTED';
      updateData.connectedAt = new Date();
      updateData.configurationVersion = connection.configurationVersion + 1;

      await this.auditService.log({
        organisationId: ctx.organisationId,
        connectionId,
        userId: ctx.userId,
        action: 'INTEGRATION_CREDENTIAL_ROTATED',
        resourceId: connectionId,
      });
    }

    const updated = await this.prisma.integrationConnection.update({
      where: { id: connectionId },
      data: updateData,
    });

    await this.auditService.log({
      organisationId: ctx.organisationId,
      connectionId,
      userId: ctx.userId,
      action: 'INTEGRATION_CONFIGURATION_CHANGED',
      resourceId: connectionId,
      metadata: { status: updated.status, environment: updated.environment },
    });

    return this.mapToDto(updated);
  }

  /**
   * Disconnects a connection and wipes/sanitizes encrypted credentials.
   */
  async disconnect(
    ctx: IntegrationAccessContext,
    connectionId: string,
  ): Promise<IntegrationConnectionDto> {
    const connection = await this.prisma.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException(`Integration connection '${connectionId}' not found`);
    }

    this.permissionService.assertCanMutateScope(ctx, connection.scope as IntegrationScope, {
      outletId: connection.outletId || undefined,
      memberId: connection.memberId || undefined,
      staffId: connection.staffId || undefined,
    });

    const updated = await this.prisma.integrationConnection.update({
      where: { id: connectionId },
      data: {
        status: 'DISCONNECTED',
        disconnectedAt: new Date(),
        encryptedCredentials: null, // Wipe sensitive credentials on disconnect
      },
    });

    await this.auditService.log({
      organisationId: ctx.organisationId,
      connectionId,
      userId: ctx.userId,
      action: 'INTEGRATION_DISCONNECTED',
      resourceId: connectionId,
    });

    return this.mapToDto(updated);
  }

  /**
   * Reconnects an existing connection.
   */
  async reconnect(
    ctx: IntegrationAccessContext,
    connectionId: string,
    credentials?: Record<string, any>,
  ): Promise<IntegrationConnectionDto> {
    const connection = await this.prisma.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException(`Integration connection '${connectionId}' not found`);
    }

    this.permissionService.assertCanMutateScope(ctx, connection.scope as IntegrationScope, {
      outletId: connection.outletId || undefined,
      memberId: connection.memberId || undefined,
      staffId: connection.staffId || undefined,
    });

    const updateData: any = {
      status: 'CONNECTED',
      connectedAt: new Date(),
      disconnectedAt: null,
      healthStatus: 'HEALTHY',
      consecutiveFailures: 0,
    };

    if (credentials) {
      updateData.encryptedCredentials = this.credentialService.encrypt(credentials);
    }

    const updated = await this.prisma.integrationConnection.update({
      where: { id: connectionId },
      data: updateData,
    });

    await this.auditService.log({
      organisationId: ctx.organisationId,
      connectionId,
      userId: ctx.userId,
      action: 'INTEGRATION_REAUTHORIZED',
      resourceId: connectionId,
    });

    return this.mapToDto(updated);
  }

  /**
   * Maps Prisma record to DTO, strictly stripping encryptedCredentials.
   */
  mapToDto(entity: any): IntegrationConnectionDto {
    return {
      id: entity.id,
      organisationId: entity.organisationId,
      outletId: entity.outletId,
      memberId: entity.memberId,
      staffId: entity.staffId,
      integrationKey: entity.integrationKey,
      provider: entity.provider,
      category: entity.category,
      scope: entity.scope,
      status: entity.status,
      environment: entity.environment,
      externalAccountId: entity.externalAccountId,
      externalAccountName: entity.externalAccountName,
      hasCredentials: !!entity.encryptedCredentials,
      configuration: (entity.configuration as Record<string, any>) || {},
      connectedByUserId: entity.connectedByUserId,
      connectedAt: entity.connectedAt?.toISOString() || null,
      disconnectedAt: entity.disconnectedAt?.toISOString() || null,
      lastSuccessfulOperationAt: entity.lastSuccessfulOperationAt?.toISOString() || null,
      lastFailedOperationAt: entity.lastFailedOperationAt?.toISOString() || null,
      lastHealthCheckAt: entity.lastHealthCheckAt?.toISOString() || null,
      lastSyncAt: entity.lastSyncAt?.toISOString() || null,
      configurationVersion: entity.configurationVersion,
      healthStatus: entity.healthStatus,
      failureCount: entity.failureCount,
      consecutiveFailures: entity.consecutiveFailures,
      metadata: entity.metadata,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
