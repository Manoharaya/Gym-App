/**
 * FitCore — Day 49: Developer API Key Service
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeveloperSecurityService } from './developer-security.service';
import { ApiAuditService } from './api-audit.service';
import {
  ApiKeyCreatedResponseDto,
  CreateApiKeyDto,
  DeveloperApiKeyDto,
  DeveloperEnvironment,
  RotateApiKeyDto,
} from '@fitcore/types';
import { DeveloperError } from '../domain/developer-errors';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly security: DeveloperSecurityService,
    private readonly audit: ApiAuditService,
  ) {}

  /**
   * Generates and stores a new API key for an application.
   * Returns plainKey ONLY ONCE in the response.
   */
  async createApiKey(
    applicationId: string,
    dto: CreateApiKeyDto,
    userId?: string,
  ): Promise<ApiKeyCreatedResponseDto> {
    const app = await this.prisma.developerApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) {
      throw DeveloperError.notFound('DeveloperApplication', applicationId);
    }
    if (app.status !== 'ACTIVE') {
      throw new DeveloperError(
        'INVALID_REQUEST',
        `Cannot create API keys for an application in ${app.status} state`,
      );
    }

    const env: DeveloperEnvironment = dto.environment || (app.environment as DeveloperEnvironment);
    const { fullKey, keyPrefix, keyHash } = this.security.generateApiKey(env);

    let expiresAt: Date | null = null;
    if (dto.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + dto.expiresInDays);
    }

    // Default scopes to application's allowed scopes if not explicitly specified
    const scopes = dto.scopes && dto.scopes.length > 0 ? dto.scopes : app.allowedScopes;

    const apiKey = await this.prisma.developerApiKey.create({
      data: {
        applicationId: app.id,
        organisationId: app.organisationId,
        name: dto.name || `${env} API Key`,
        keyPrefix,
        keyHash,
        environment: env,
        scopes,
        status: 'ACTIVE',
        expiresAt,
      },
    });

    await this.audit.log({
      organisationId: app.organisationId,
      applicationId: app.id,
      userId,
      action: 'API_KEY_CREATED',
      resource: 'DeveloperApiKey',
      resourceId: apiKey.id,
      metadata: { keyPrefix, environment: env, scopes },
    });

    return {
      apiKey: this.mapToDto(apiKey),
      plainKey: fullKey,
    };
  }

  /**
   * Validates an incoming raw API key string.
   */
  async validateApiKey(rawKey: string): Promise<{
    apiKey: DeveloperApiKeyDto;
    application: any;
  }> {
    if (!rawKey || !rawKey.startsWith('fc_')) {
      throw DeveloperError.invalidApiKey('API key must start with fc_live_ or fc_test_');
    }

    const keyHash = this.security.hashSecret(rawKey);

    const apiKey = await this.prisma.developerApiKey.findUnique({
      where: { keyHash },
      include: { application: true },
    });

    if (!apiKey) {
      throw DeveloperError.invalidApiKey();
    }

    if (apiKey.status === 'REVOKED') {
      throw DeveloperError.keyRevoked();
    }

    if (apiKey.status !== 'ACTIVE') {
      throw DeveloperError.unauthenticated(`API key is ${apiKey.status}`);
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      // Auto-expire
      await this.prisma.developerApiKey.update({
        where: { id: apiKey.id },
        data: { status: 'EXPIRED' },
      });
      throw DeveloperError.keyExpired();
    }

    if (apiKey.application.status !== 'ACTIVE') {
      throw new DeveloperError(
        'RESOURCE_FORBIDDEN',
        `The application associated with this API key is ${apiKey.application.status}`,
      );
    }

    // Update lastUsedAt asynchronously
    this.prisma.developerApiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((e) => this.logger.warn(`Failed to update apiKey lastUsedAt: ${e.message}`));

    return {
      apiKey: this.mapToDto(apiKey),
      application: apiKey.application,
    };
  }

  /**
   * Rotates an existing API key: generates a new key and schedules/applies revocation of the old key.
   */
  async rotateApiKey(
    keyId: string,
    dto: RotateApiKeyDto = {},
    userId?: string,
  ): Promise<ApiKeyCreatedResponseDto> {
    const existing = await this.prisma.developerApiKey.findUnique({
      where: { id: keyId },
      include: { application: true },
    });

    if (!existing) {
      throw DeveloperError.notFound('DeveloperApiKey', keyId);
    }

    // Generate new key
    const env = existing.environment as DeveloperEnvironment;
    const { fullKey, keyPrefix, keyHash } = this.security.generateApiKey(env);

    const newApiKey = await this.prisma.developerApiKey.create({
      data: {
        applicationId: existing.applicationId,
        organisationId: existing.organisationId,
        name: existing.name ? `${existing.name} (Rotated)` : `Rotated ${env} Key`,
        keyPrefix,
        keyHash,
        environment: env,
        scopes: existing.scopes,
        status: 'ACTIVE',
        rotatedFromId: existing.id,
      },
    });

    // Handle old key grace period
    const graceHours = dto.gracePeriodHours ?? 24;
    if (graceHours <= 0) {
      await this.prisma.developerApiKey.update({
        where: { id: existing.id },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
    } else {
      const graceExpiry = new Date();
      graceExpiry.setHours(graceExpiry.getHours() + graceHours);
      await this.prisma.developerApiKey.update({
        where: { id: existing.id },
        data: { expiresAt: graceExpiry },
      });
    }

    await this.audit.log({
      organisationId: existing.organisationId,
      applicationId: existing.applicationId,
      userId,
      action: 'API_KEY_ROTATED',
      resource: 'DeveloperApiKey',
      resourceId: newApiKey.id,
      metadata: { rotatedFromId: existing.id, gracePeriodHours: graceHours },
    });

    return {
      apiKey: this.mapToDto(newApiKey),
      plainKey: fullKey,
    };
  }

  /**
   * Revokes an API key immediately.
   */
  async revokeApiKey(keyId: string, userId?: string): Promise<DeveloperApiKeyDto> {
    const existing = await this.prisma.developerApiKey.findUnique({
      where: { id: keyId },
    });
    if (!existing) {
      throw DeveloperError.notFound('DeveloperApiKey', keyId);
    }

    const updated = await this.prisma.developerApiKey.update({
      where: { id: keyId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    await this.audit.log({
      organisationId: existing.organisationId,
      applicationId: existing.applicationId,
      userId,
      action: 'API_KEY_REVOKED',
      resource: 'DeveloperApiKey',
      resourceId: keyId,
      metadata: { keyPrefix: existing.keyPrefix },
    });

    return this.mapToDto(updated);
  }

  /**
   * Lists API keys for an application.
   */
  async listApiKeys(applicationId: string): Promise<DeveloperApiKeyDto[]> {
    const keys = await this.prisma.developerApiKey.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => this.mapToDto(k));
  }

  private mapToDto(k: any): DeveloperApiKeyDto {
    return {
      id: k.id,
      applicationId: k.applicationId,
      organisationId: k.organisationId,
      name: k.name,
      keyPrefix: k.keyPrefix,
      environment: k.environment as DeveloperEnvironment,
      scopes: k.scopes as any[],
      status: k.status as any,
      expiresAt: k.expiresAt?.toISOString() || null,
      lastUsedAt: k.lastUsedAt?.toISOString() || null,
      revokedAt: k.revokedAt?.toISOString() || null,
      rotatedFromId: k.rotatedFromId,
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
    };
  }
}
