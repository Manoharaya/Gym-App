/**
 * FitCore — Day 49: Developer API Authorization & Context Service
 */

import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';
import { DeveloperSecurityService } from './developer-security.service';
import { PrismaService } from '../../database/prisma.service';
import { ApiScope, DeveloperEnvironment } from '@fitcore/types';
import { DeveloperError } from '../domain/developer-errors';

export interface DeveloperSecurityContext {
  applicationId: string;
  applicationName: string;
  organisationId: string;
  outletId?: string;
  environment: DeveloperEnvironment;
  scopes: ApiScope[];
  authType: 'API_KEY' | 'OAUTH';
  apiKeyId?: string;
  userId?: string;
}

@Injectable()
export class ApiAuthorizationService {
  private readonly logger = new Logger(ApiAuthorizationService.name);

  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly security: DeveloperSecurityService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Resolves and authorizes a developer request from HTTP headers.
   */
  async resolveContext(req: Request): Promise<DeveloperSecurityContext> {
    // 1. Check X-Api-Key header
    let apiKeyHeader = req.header('X-Api-Key') || req.header('x-api-key');

    // 2. Check Authorization header
    const authHeader = req.header('Authorization') || req.header('authorization');
    if (!apiKeyHeader && authHeader?.startsWith('Bearer ')) {
      const tokenCandidate = authHeader.substring(7).trim();
      if (tokenCandidate.startsWith('fc_live_') || tokenCandidate.startsWith('fc_test_')) {
        apiKeyHeader = tokenCandidate;
      } else if (tokenCandidate.startsWith('fc_tok_')) {
        return this.resolveOAuthContext(tokenCandidate, req);
      }
    }

    if (apiKeyHeader) {
      return this.resolveApiKeyContext(apiKeyHeader, req);
    }

    throw DeveloperError.unauthenticated('Missing X-Api-Key or Authorization Bearer token');
  }

  private async resolveApiKeyContext(rawKey: string, req: Request): Promise<DeveloperSecurityContext> {
    const { apiKey, application } = await this.apiKeyService.validateApiKey(rawKey);

    // Resolve target organisation ID (from application or header if multi-tenant platform app)
    let targetOrgId = application.organisationId;
    if (!targetOrgId) {
      const headerOrg = req.header('X-Organisation-Id') || req.header('x-organisation-id');
      if (headerOrg) {
        targetOrgId = headerOrg;
      } else {
        throw new DeveloperError(
          'INVALID_REQUEST',
          'Platform-level applications must specify X-Organisation-Id header',
        );
      }
    }

    // Resolve optional outlet ID
    const outletId = (req.header('X-Outlet-Id') || req.header('x-outlet-id')) as string | undefined;

    return {
      applicationId: application.id,
      applicationName: application.name,
      organisationId: targetOrgId,
      outletId,
      environment: apiKey.environment,
      scopes: apiKey.scopes,
      authType: 'API_KEY',
      apiKeyId: apiKey.id,
    };
  }

  private async resolveOAuthContext(rawToken: string, req: Request): Promise<DeveloperSecurityContext> {
    const tokenHash = this.security.hashSecret(rawToken);

    const token = await this.prisma.oAuthToken.findUnique({
      where: { accessTokenHash: tokenHash },
      include: { application: true },
    });

    if (!token) {
      throw DeveloperError.unauthenticated('Invalid or expired OAuth access token');
    }

    if (token.status !== 'ACTIVE') {
      throw DeveloperError.unauthenticated(`OAuth token is ${token.status}`);
    }

    if (token.expiresAt < new Date()) {
      await this.prisma.oAuthToken.update({
        where: { id: token.id },
        data: { status: 'EXPIRED' },
      });
      throw DeveloperError.unauthenticated('OAuth access token has expired');
    }

    if (token.application.status !== 'ACTIVE') {
      throw new DeveloperError(
        'RESOURCE_FORBIDDEN',
        `The application is ${token.application.status}`,
      );
    }

    // Update lastUsedAt asynchronously
    this.prisma.oAuthToken
      .update({
        where: { id: token.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((e) => this.logger.warn(`Failed to update oAuthToken lastUsedAt: ${e.message}`));

    const outletId = (req.header('X-Outlet-Id') || req.header('x-outlet-id')) as string | undefined;

    return {
      applicationId: token.applicationId,
      applicationName: token.application.name,
      organisationId: token.organisationId,
      outletId,
      environment: token.environment as DeveloperEnvironment,
      scopes: token.scopes as ApiScope[],
      authType: 'OAUTH',
      userId: token.userId,
    };
  }
}
