import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { TokenEncryptionService } from '../security/token-encryption.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { WearableCapabilitiesRegistry } from '../domain/wearable-capabilities.registry';
import { ConnectProviderDto, ReauthorizeProviderDto } from '../dto/connect-provider.dto';
import {
  WearableConnectionDto,
  WearableConnectionStatus,
  WearableProviderType,
} from '@fitcore/types';

@Injectable()
export class WearableConnectionService {
  private readonly logger = new Logger(WearableConnectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tokenEncryption: TokenEncryptionService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly capabilities: WearableCapabilitiesRegistry,
  ) {}

  /**
   * Asserts that member has an active, granted WEARABLE_DATA consent record (Day 4 compliance).
   */
  async assertWearableConsent(memberProfileId: string): Promise<void> {
    const consentType = await this.prisma.consentType.findUnique({
      where: { key: 'WEARABLE_DATA' },
      include: {
        records: {
          where: { memberProfileId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!consentType) {
      this.logger.warn('WEARABLE_DATA consent type not configured in database');
      return; // If consent type is not yet seeded, allow for development
    }

    const latestRecord = consentType.records[0];
    if (!latestRecord || latestRecord.status !== 'CONSENTED') {
      throw new ForbiddenException(
        'WEARABLE_CONSENT_REQUIRED: Explicit member consent for WEARABLE_DATA is required before connecting or synchronizing health devices.',
      );
    }
  }

  /**
   * Connects a wearable provider for a member.
   */
  async connect(
    dto: ConnectProviderDto,
    memberId: string,
    organisationId: string,
    actorUserId: string,
  ): Promise<WearableConnectionDto> {
    // 1. Validate provider support
    if (!this.capabilities.isProviderSupported(dto.provider)) {
      throw new BadRequestException(
        `Provider '${dto.provider}' is not enabled or belongs to Wave 2 future extensions.`,
      );
    }

    // 2. Enforce explicit WEARABLE_DATA consent
    await this.assertWearableConsent(memberId);

    // 3. Obtain provider adapter
    const providerAdapter = this.providerRegistry.getProvider(dto.provider);

    // 4. Authorize via provider adapter
    const authResult = await providerAdapter.authorize({
      memberId,
      organisationId,
      authCode: dto.authCode,
      redirectUri: dto.redirectUri,
      scopes: dto.scopes,
      nativeAccessToken: dto.nativeAccessToken,
      nativeRefreshToken: dto.nativeRefreshToken,
      tokenExpiresIn: dto.tokenExpiresIn,
    });

    // 5. Encrypt tokens if present
    const encryptedAccessToken = authResult.accessToken
      ? this.tokenEncryption.encrypt(authResult.accessToken)
      : undefined;
    const encryptedRefreshToken = authResult.refreshToken
      ? this.tokenEncryption.encrypt(authResult.refreshToken)
      : undefined;

    const tokenExpiresAt = authResult.expiresInSeconds
      ? new Date(Date.now() + authResult.expiresInSeconds * 1000)
      : undefined;

    // 6. Upsert connection (member can have 1 active connection per provider)
    const now = new Date();
    const connection = await this.prisma.wearableConnection.upsert({
      where: {
        memberId_provider: {
          memberId,
          provider: dto.provider,
        },
      },
      create: {
        organisationId,
        memberId,
        provider: dto.provider,
        status: 'CONNECTED',
        connectedAt: now,
        providerUserReference: authResult.providerUserReference || dto.providerUserReference,
        scopes: authResult.scopes || dto.scopes || [],
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
      },
      update: {
        organisationId, // Keeps connection aligned with member's current active organisation
        status: 'CONNECTED',
        connectedAt: now,
        lastErrorCode: null,
        lastErrorMessage: null,
        providerUserReference: authResult.providerUserReference || dto.providerUserReference,
        scopes: authResult.scopes || dto.scopes || [],
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        revokedAt: null,
      },
    });

    // 7. Audit log (strictly omitting tokens)
    await this.audit.log({
      userId: actorUserId,
      organisationId,
      action: 'WEARABLE_CONNECTED',
      resource: 'wearable_connections',
      resourceId: connection.id,
      metadata: {
        provider: dto.provider,
        scopes: connection.scopes,
      },
    });

    return this.mapToDto(connection);
  }

  /**
   * Reauthorizes an existing connection with fresh tokens.
   */
  async reauthorize(
    connectionId: string,
    dto: ReauthorizeProviderDto,
    memberId: string,
    organisationId: string,
    actorUserId: string,
  ): Promise<WearableConnectionDto> {
    const connection = await this.prisma.wearableConnection.findFirst({
      where: { id: connectionId, memberId, organisationId },
    });

    if (!connection) {
      throw new NotFoundException('Wearable connection not found');
    }

    const providerAdapter = this.providerRegistry.getProvider(
      connection.provider as WearableProviderType,
    );

    const authResult = await providerAdapter.authorize({
      memberId,
      organisationId,
      authCode: dto.authCode,
      nativeAccessToken: dto.nativeAccessToken,
      nativeRefreshToken: dto.nativeRefreshToken,
      tokenExpiresIn: dto.tokenExpiresIn,
    });

    const encryptedAccessToken = authResult.accessToken
      ? this.tokenEncryption.encrypt(authResult.accessToken)
      : undefined;
    const encryptedRefreshToken = authResult.refreshToken
      ? this.tokenEncryption.encrypt(authResult.refreshToken)
      : undefined;

    const tokenExpiresAt = authResult.expiresInSeconds
      ? new Date(Date.now() + authResult.expiresInSeconds * 1000)
      : undefined;

    const updated = await this.prisma.wearableConnection.update({
      where: { id: connectionId },
      data: {
        status: 'CONNECTED',
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        lastErrorCode: null,
        lastErrorMessage: null,
        revokedAt: null,
      },
    });

    await this.audit.log({
      userId: actorUserId,
      organisationId,
      action: 'WEARABLE_REAUTHORIZED',
      resource: 'wearable_connections',
      resourceId: connectionId,
      metadata: { provider: connection.provider },
    });

    return this.mapToDto(updated);
  }

  /**
   * Disconnects a wearable connection.
   */
  async disconnect(
    connectionId: string,
    memberId: string,
    organisationId: string,
    actorUserId: string,
  ): Promise<WearableConnectionDto> {
    const connection = await this.prisma.wearableConnection.findFirst({
      where: { id: connectionId, memberId, organisationId },
    });

    if (!connection) {
      throw new NotFoundException('Wearable connection not found');
    }

    try {
      const providerAdapter = this.providerRegistry.getProvider(
        connection.provider as WearableProviderType,
      );
      if (providerAdapter.revokeAuthorization) {
        await providerAdapter.revokeAuthorization({
          providerUserReference: connection.providerUserReference,
          encryptedAccessToken: connection.encryptedAccessToken,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Provider revoke call failed during disconnect: ${err.message}`);
    }

    const updated = await this.prisma.wearableConnection.update({
      where: { id: connectionId },
      data: {
        status: 'DISCONNECTED',
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        revokedAt: new Date(),
      },
    });

    await this.audit.log({
      userId: actorUserId,
      organisationId,
      action: 'WEARABLE_DISCONNECTED',
      resource: 'wearable_connections',
      resourceId: connectionId,
      metadata: { provider: connection.provider },
    });

    return this.mapToDto(updated);
  }

  /**
   * Lists all wearable connections for a member.
   */
  async getMemberConnections(memberId: string, organisationId: string): Promise<WearableConnectionDto[]> {
    const connections = await this.prisma.wearableConnection.findMany({
      where: { memberId, organisationId },
      orderBy: { createdAt: 'desc' },
    });

    return connections.map((c) => this.mapToDto(c));
  }

  /**
   * Retrieves single connection by ID.
   */
  async getConnectionById(
    connectionId: string,
    memberId: string,
    organisationId: string,
  ): Promise<WearableConnectionDto> {
    const connection = await this.prisma.wearableConnection.findFirst({
      where: { id: connectionId, memberId, organisationId },
    });

    if (!connection) {
      throw new NotFoundException('Wearable connection not found');
    }

    return this.mapToDto(connection);
  }

  /**
   * Strips all encryption keys and tokens before sending to client.
   */
  private mapToDto(conn: any): WearableConnectionDto {
    return {
      id: conn.id,
      organisationId: conn.organisationId,
      memberId: conn.memberId,
      provider: conn.provider as WearableProviderType,
      status: conn.status as WearableConnectionStatus,
      connectedAt: conn.connectedAt?.toISOString() || null,
      lastSyncAt: conn.lastSyncAt?.toISOString() || null,
      lastSuccessfulSyncAt: conn.lastSuccessfulSyncAt?.toISOString() || null,
      lastFailedSyncAt: conn.lastFailedSyncAt?.toISOString() || null,
      lastErrorCode: conn.lastErrorCode,
      lastErrorMessage: conn.lastErrorMessage,
      providerUserReference: conn.providerUserReference,
      scopes: conn.scopes || [],
      createdAt: conn.createdAt.toISOString(),
      updatedAt: conn.updatedAt.toISOString(),
      revokedAt: conn.revokedAt?.toISOString() || null,
    };
  }
}
