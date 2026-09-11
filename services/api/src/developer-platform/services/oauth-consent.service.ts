/**
 * FitCore — Day 49: OAuth Consent Screen Service
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApiScopeService } from './api-scope.service';
import { API_SCOPE_REGISTRY } from '../domain/developer-scopes';
import { ApiScope } from '@fitcore/types';
import { DeveloperError } from '../domain/developer-errors';

export interface ConsentScreenDetailsDto {
  applicationId: string;
  applicationName: string;
  applicationDescription?: string | null;
  organisationName: string;
  requestedScopes: {
    scope: ApiScope;
    displayName: string;
    description: string;
    sensitivity: string;
  }[];
  requiresOwnerApproval: boolean;
}

@Injectable()
export class OAuthConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ApiScopeService,
  ) {}

  async getConsentDetails(
    clientId: string,
    organisationId: string,
    scopeString?: string,
  ): Promise<ConsentScreenDetailsDto> {
    const app = await this.prisma.developerApplication.findUnique({
      where: { clientId },
    });
    if (!app) {
      throw DeveloperError.notFound('DeveloperApplication', clientId);
    }

    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
    });
    if (!org) {
      throw DeveloperError.notFound('Organisation', organisationId);
    }

    let scopes: ApiScope[] = (app.allowedScopes as ApiScope[]) || [];
    if (scopeString) {
      scopes = this.scopeService.validateScopes(scopeString.split(' ').filter(Boolean));
    }

    const detailedScopes = scopes.map((s) => {
      const def = API_SCOPE_REGISTRY[s];
      return {
        scope: s,
        displayName: def?.displayName || s,
        description: def?.description || '',
        sensitivity: def?.sensitivity || 'STANDARD',
      };
    });

    const requiresOwnerApproval = this.scopeService.hasSensitiveScopes(scopes);

    return {
      applicationId: app.id,
      applicationName: app.name,
      applicationDescription: app.description,
      organisationName: org.name,
      requestedScopes: detailedScopes,
      requiresOwnerApproval,
    };
  }
}
