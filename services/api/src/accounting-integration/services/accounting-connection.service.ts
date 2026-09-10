/**
 * FitCore — Day 43: Accounting Connection Service
 *
 * Manages accounting provider connections, OAuth 2.0 lifecycle,
 * encrypted token storage, and disconnections.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AccountingProviderRegistry } from '../providers/accounting-provider.registry';
import { AccountingCredentialService } from '../security/accounting-credential.service';
import { OAuthStateService } from '../security/oauth-state.service';
import {
  AccountingConnectionDto,
  AccountingProviderType,
  AccountingCapability,
} from '@fitcore/types';
import { AccountingCapabilitiesHelper } from '../domain/accounting-capabilities';
import { ACCOUNTING_AUDIT_ACTIONS } from '../domain/accounting.constants';

@Injectable()
export class AccountingConnectionService {
  private readonly logger = new Logger(AccountingConnectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly registry: AccountingProviderRegistry,
    private readonly credentialService: AccountingCredentialService,
    private readonly oauthStateService: OAuthStateService,
  ) {}

  /**
   * Initiates the OAuth flow by generating a tenant/user bound CSRF state and authorization URL.
   */
  async initiateConnect(
    organisationId: string,
    userId: string,
    providerType: AccountingProviderType,
    redirectUri: string,
  ): Promise<{ authorizationUrl: string; stateToken: string }> {
    const provider = this.registry.getProvider(providerType);
    const stateToken = await this.oauthStateService.generateState(
      organisationId,
      userId,
      providerType,
      redirectUri,
    );

    const authorizationUrl = await provider.getAuthorizationUrl(stateToken, redirectUri);
    return { authorizationUrl, stateToken };
  }

  /**
   * Processes OAuth callback: validates state, exchanges code for tokens, encrypts tokens,
   * and saves or updates the AccountingConnection.
   */
  async handleOAuthCallback(
    code: string,
    stateToken: string,
  ): Promise<AccountingConnectionDto> {
    const statePayload = await this.oauthStateService.consumeState(stateToken);
    const provider = this.registry.getProvider(statePayload.provider as AccountingProviderType);

    const tokenData = await provider.exchangeCodeForTokens(code, statePayload.redirectUri);

    const encryptedAccessToken = this.credentialService.encryptToken(tokenData.accessToken);
    const encryptedRefreshToken = this.credentialService.encryptToken(tokenData.refreshToken);
    const tokenExpiresAt = new Date(Date.now() + tokenData.expiresInSeconds * 1000);

    const connection = await this.prisma.accountingConnection.upsert({
      where: {
        organisationId_provider: {
          organisationId: statePayload.organisationId,
          provider: statePayload.provider,
        },
      },
      create: {
        organisationId: statePayload.organisationId,
        provider: statePayload.provider,
        status: 'CONNECTED',
        externalOrganisationId: tokenData.externalOrganisationId,
        externalOrganisationName: tokenData.externalOrganisationName,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scope: tokenData.scope,
        connectedAt: new Date(),
      },
      update: {
        status: 'CONNECTED',
        externalOrganisationId: tokenData.externalOrganisationId,
        externalOrganisationName: tokenData.externalOrganisationName,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scope: tokenData.scope,
        connectedAt: new Date(),
        disconnectedAt: null,
      },
    });

    await this.auditService.log({
      userId: statePayload.userId,
      organisationId: statePayload.organisationId,
      action: ACCOUNTING_AUDIT_ACTIONS.CONNECTION_CREATED,
      resource: 'AccountingConnection',
      resourceId: connection.id,
      metadata: { provider: statePayload.provider },
    });

    return this.mapToDto(connection);
  }

  /**
   * Retrieves active connection for organisation.
   */
  async getConnection(organisationId: string): Promise<AccountingConnectionDto | null> {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: {
        organisationId,
        status: { in: ['CONNECTED', 'AUTHENTICATION_REQUIRED', 'SYNCING', 'ERROR'] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!connection) return null;
    return this.mapToDto(connection);
  }

  /**
   * Retrieves a valid decrypted access token, automatically refreshing if expired.
   */
  async getValidAccessToken(organisationId: string): Promise<{
    accessToken: string;
    connection: any;
    provider: any;
  }> {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: {
        organisationId,
        status: { in: ['CONNECTED', 'SYNCING'] },
      },
    });

    if (!connection || !connection.encryptedAccessToken) {
      throw new BadRequestException('No active connected accounting provider found');
    }

    const provider = this.registry.getProvider(connection.provider as AccountingProviderType);
    const now = new Date();

    // Check if token needs refresh (within 5 minutes of expiry)
    if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() - now.getTime() < 300000) {
      this.logger.log(`Refreshing expiring token for connection: ${connection.id}`);
      const refreshTokenPlain = this.credentialService.decryptToken(connection.encryptedRefreshToken || '');

      try {
        const refreshed = await provider.refreshToken(refreshTokenPlain);
        const encryptedAccessToken = this.credentialService.encryptToken(refreshed.accessToken);
        const encryptedRefreshToken = this.credentialService.encryptToken(refreshed.refreshToken);
        const tokenExpiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);

        const updated = await this.prisma.accountingConnection.update({
          where: { id: connection.id },
          data: {
            encryptedAccessToken,
            encryptedRefreshToken,
            tokenExpiresAt,
          },
        });

        return {
          accessToken: refreshed.accessToken,
          connection: updated,
          provider,
        };
      } catch (err: any) {
        this.logger.error(`Token refresh failed: ${err.message}`);
        await this.prisma.accountingConnection.update({
          where: { id: connection.id },
          data: { status: 'AUTHENTICATION_REQUIRED' },
        });
        throw new BadRequestException('Accounting authorization has expired. Reconnection required.');
      }
    }

    const accessToken = this.credentialService.decryptToken(connection.encryptedAccessToken);
    return {
      accessToken,
      connection,
      provider,
    };
  }

  /**
   * Disconnects an active accounting connection.
   */
  async disconnect(organisationId: string, userId?: string): Promise<AccountingConnectionDto> {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: {
        organisationId,
        status: { in: ['CONNECTED', 'AUTHENTICATION_REQUIRED', 'SYNCING', 'ERROR'] },
      },
    });

    if (!connection) {
      throw new NotFoundException('No active accounting connection to disconnect');
    }

    const updated = await this.prisma.accountingConnection.update({
      where: { id: connection.id },
      data: {
        status: 'DISCONNECTED',
        disconnectedAt: new Date(),
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
      },
    });

    await this.auditService.log({
      userId,
      organisationId,
      action: ACCOUNTING_AUDIT_ACTIONS.CONNECTION_DISCONNECTED,
      resource: 'AccountingConnection',
      resourceId: connection.id,
      metadata: { provider: connection.provider },
    });

    return this.mapToDto(updated);
  }

  /**
   * Lists supported providers and capabilities.
   */
  getSupportedProviders(): {
    providers: AccountingProviderType[];
    capabilities: Record<AccountingProviderType, AccountingCapability[]>;
  } {
    const providers = this.registry.getSupportedProviders();
    const capabilities: any = {};
    for (const p of providers) {
      capabilities[p] = AccountingCapabilitiesHelper.getCapabilitiesForProvider(p);
    }
    return { providers, capabilities };
  }

  private mapToDto(entity: any): AccountingConnectionDto {
    return {
      id: entity.id,
      organisationId: entity.organisationId,
      provider: entity.provider as AccountingProviderType,
      status: entity.status,
      externalOrganisationId: entity.externalOrganisationId,
      externalOrganisationName: entity.externalOrganisationName,
      connectedAt: entity.connectedAt?.toISOString() || null,
      disconnectedAt: entity.disconnectedAt?.toISOString() || null,
      lastSuccessfulSyncAt: entity.lastSuccessfulSyncAt?.toISOString() || null,
      lastFailedSyncAt: entity.lastFailedSyncAt?.toISOString() || null,
      tokenExpiresAt: entity.tokenExpiresAt?.toISOString() || null,
      syncVersion: entity.syncVersion,
      capabilities: AccountingCapabilitiesHelper.getCapabilitiesForProvider(
        entity.provider as AccountingProviderType,
      ),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
