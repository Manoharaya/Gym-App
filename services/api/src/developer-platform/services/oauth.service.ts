/**
 * FitCore — Day 49: OAuth 2.0 Authorization Server Service (with PKCE)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeveloperSecurityService } from './developer-security.service';
import { ApiAuditService } from './api-audit.service';
import { ApiScopeService } from './api-scope.service';
import {
  OAuthAuthorizeQueryDto,
  OAuthConsentRequestDto,
  OAuthRevokeDto,
  OAuthTokenRequestDto,
  OAuthTokenResponseDto,
  ApiScope,
} from '@fitcore/types';
import { DeveloperError } from '../domain/developer-errors';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly security: DeveloperSecurityService,
    private readonly audit: ApiAuditService,
    private readonly scopeService: ApiScopeService,
  ) {}

  /**
   * Validates client and parameters before rendering consent screen.
   */
  async validateAuthorizeRequest(query: OAuthAuthorizeQueryDto): Promise<{
    application: any;
    requestedScopes: ApiScope[];
  }> {
    const app = await this.prisma.developerApplication.findUnique({
      where: { clientId: query.client_id },
    });
    if (!app) {
      throw new DeveloperError('INVALID_CLIENT', 'Unknown client_id');
    }
    if (app.status !== 'ACTIVE') {
      throw new DeveloperError('UNAUTHORIZED_CLIENT', `Application is ${app.status}`);
    }

    // Exact matching for pre-registered redirect URIs
    if (!app.redirectUris.includes(query.redirect_uri)) {
      throw new DeveloperError(
        'INVALID_REDIRECT_URI',
        'The provided redirect_uri is not pre-registered for this application',
      );
    }

    // Validate scopes
    let requestedScopes: ApiScope[] = (app.allowedScopes as ApiScope[]) || [];
    if (query.scope) {
      const parsed = query.scope.split(' ').filter(Boolean);
      requestedScopes = this.scopeService.validateScopes(parsed);
      // Ensure application has permission to request these scopes
      const unauthorizedScopes = requestedScopes.filter(
        (s) => !app.allowedScopes.includes(s),
      );
      if (unauthorizedScopes.length > 0) {
        throw new DeveloperError(
          'INSUFFICIENT_SCOPE',
          `Application is not permitted to request: ${unauthorizedScopes.join(', ')}`,
        );
      }
    }

    return { application: app, requestedScopes };
  }

  /**
   * Processes user consent decision, generating authorization code if approved.
   */
  async handleConsentDecision(
    userId: string,
    organisationId: string,
    dto: OAuthConsentRequestDto,
  ): Promise<{ redirectUrl: string; code?: string }> {
    const { application, requestedScopes } = await this.validateAuthorizeRequest({
      client_id: dto.client_id,
      redirect_uri: dto.redirect_uri,
      response_type: 'code',
      scope: dto.scopes?.join(' '),
      state: dto.state,
      code_challenge: dto.code_challenge,
      code_challenge_method: dto.code_challenge_method,
    });

    if (!dto.approved) {
      await this.audit.log({
        organisationId,
        applicationId: application.id,
        userId,
        action: 'OAUTH_CONSENT_REVOKED',
        resource: 'OAuthAuthorization',
        resourceId: application.id,
      });

      const redirectUrl = new URL(dto.redirect_uri);
      redirectUrl.searchParams.set('error', 'access_denied');
      if (dto.state) redirectUrl.searchParams.set('state', dto.state);
      return { redirectUrl: redirectUrl.toString() };
    }

    // Generate single-use authorization code with 10-minute TTL
    const code = this.security.generateAuthCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const auth = await this.prisma.oAuthAuthorization.create({
      data: {
        code,
        applicationId: application.id,
        organisationId: application.organisationId || organisationId,
        userId,
        redirectUri: dto.redirect_uri,
        scopes: requestedScopes,
        codeChallenge: dto.code_challenge || null,
        codeChallengeMethod: dto.code_challenge_method || 'S256',
        expiresAt,
      },
    });

    await this.audit.log({
      organisationId,
      applicationId: application.id,
      userId,
      action: 'OAUTH_CONSENT_GRANTED',
      resource: 'OAuthAuthorization',
      resourceId: auth.id,
      metadata: { scopes: requestedScopes },
    });

    const redirectUrl = new URL(dto.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (dto.state) redirectUrl.searchParams.set('state', dto.state);

    return { redirectUrl: redirectUrl.toString(), code };
  }

  /**
   * Exchanges authorization code or refresh token for Access & Refresh Tokens.
   */
  async exchangeToken(dto: OAuthTokenRequestDto): Promise<OAuthTokenResponseDto> {
    const app = await this.prisma.developerApplication.findUnique({
      where: { clientId: dto.client_id },
    });
    if (!app) {
      throw new DeveloperError('INVALID_CLIENT', 'Client not found');
    }

    // Verify client secret if configured
    if (app.clientSecretHash) {
      if (!dto.client_secret) {
        throw new DeveloperError('INVALID_CLIENT', 'client_secret is required');
      }
      const secretHash = this.security.hashSecret(dto.client_secret);
      if (!this.security.timingSafeEqual(secretHash, app.clientSecretHash)) {
        throw new DeveloperError('INVALID_CLIENT', 'Invalid client_secret');
      }
    }

    if (dto.grant_type === 'authorization_code') {
      return this.handleCodeExchange(app, dto);
    } else if (dto.grant_type === 'refresh_token') {
      return this.handleRefreshTokenExchange(app, dto);
    }

    throw new DeveloperError('UNSUPPORTED_GRANT_TYPE', 'Unsupported grant_type');
  }

  private async handleCodeExchange(
    app: any,
    dto: OAuthTokenRequestDto,
  ): Promise<OAuthTokenResponseDto> {
    if (!dto.code) {
      throw new DeveloperError('INVALID_REQUEST', 'code is required');
    }

    const auth = await this.prisma.oAuthAuthorization.findUnique({
      where: { code: dto.code },
    });
    if (!auth) {
      throw new DeveloperError('INVALID_GRANT', 'Invalid authorization code');
    }

    // Replay defense: single-use code
    if (auth.consumed) {
      throw new DeveloperError('INVALID_GRANT', 'Authorization code has already been consumed');
    }

    // Expiry check
    if (auth.expiresAt < new Date()) {
      throw new DeveloperError('INVALID_GRANT', 'Authorization code has expired');
    }

    // Redirect URI matching
    if (auth.redirectUri !== dto.redirect_uri) {
      throw new DeveloperError('INVALID_GRANT', 'redirect_uri does not match original authorization');
    }

    // PKCE verification
    if (auth.codeChallenge) {
      if (!dto.code_verifier) {
        throw new DeveloperError('INVALID_GRANT', 'code_verifier is required for PKCE client');
      }
      const isValidPkce = this.security.verifyPkceChallenge(
        dto.code_verifier,
        auth.codeChallenge,
        auth.codeChallengeMethod || 'S256',
      );
      if (!isValidPkce) {
        throw new DeveloperError('INVALID_GRANT', 'PKCE code_verifier verification failed');
      }
    }

    // Mark code as consumed immediately
    await this.prisma.oAuthAuthorization.update({
      where: { id: auth.id },
      data: { consumed: true },
    });

    // Generate tokens
    const rawAccessToken = this.security.generateAccessToken();
    const rawRefreshToken = this.security.generateRefreshToken();

    const accessTokenHash = this.security.hashSecret(rawAccessToken);
    const refreshTokenHash = this.security.hashSecret(rawRefreshToken);

    const accessExpiry = new Date();
    accessExpiry.setHours(accessExpiry.getHours() + 1); // 1 hour TTL

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30); // 30 days TTL

    await this.prisma.oAuthToken.create({
      data: {
        applicationId: app.id,
        organisationId: auth.organisationId,
        userId: auth.userId,
        accessTokenHash,
        refreshTokenHash,
        tokenType: 'Bearer',
        scopes: auth.scopes,
        environment: app.environment,
        status: 'ACTIVE',
        expiresAt: accessExpiry,
        refreshExpiresAt: refreshExpiry,
      },
    });

    await this.audit.log({
      organisationId: auth.organisationId,
      applicationId: app.id,
      userId: auth.userId,
      action: 'OAUTH_TOKEN_ISSUED',
      resource: 'OAuthToken',
      resourceId: app.id,
      metadata: { scopes: auth.scopes },
    });

    return {
      access_token: rawAccessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: rawRefreshToken,
      scope: auth.scopes.join(' '),
    };
  }

  private async handleRefreshTokenExchange(
    app: any,
    dto: OAuthTokenRequestDto,
  ): Promise<OAuthTokenResponseDto> {
    if (!dto.refresh_token) {
      throw new DeveloperError('INVALID_REQUEST', 'refresh_token is required');
    }

    const refreshHash = this.security.hashSecret(dto.refresh_token);
    const existingToken = await this.prisma.oAuthToken.findUnique({
      where: { refreshTokenHash: refreshHash },
    });

    if (!existingToken) {
      throw new DeveloperError('INVALID_GRANT', 'Invalid refresh token');
    }

    // Reuse detection
    if (existingToken.status !== 'ACTIVE') {
      await this.prisma.oAuthToken.updateMany({
        where: { applicationId: app.id, userId: existingToken.userId },
        data: { status: 'REVOKED' },
      });
      throw new DeveloperError('INVALID_GRANT', 'Suspicious refresh token reuse detected');
    }

    if (existingToken.refreshExpiresAt && existingToken.refreshExpiresAt < new Date()) {
      throw new DeveloperError('INVALID_GRANT', 'Refresh token has expired');
    }

    // Revoke old token
    await this.prisma.oAuthToken.update({
      where: { id: existingToken.id },
      data: { status: 'REVOKED' },
    });

    // Issue new pair
    const rawAccessToken = this.security.generateAccessToken();
    const rawRefreshToken = this.security.generateRefreshToken();

    const accessExpiry = new Date();
    accessExpiry.setHours(accessExpiry.getHours() + 1);

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);

    await this.prisma.oAuthToken.create({
      data: {
        applicationId: app.id,
        organisationId: existingToken.organisationId,
        userId: existingToken.userId,
        accessTokenHash: this.security.hashSecret(rawAccessToken),
        refreshTokenHash: this.security.hashSecret(rawRefreshToken),
        tokenType: 'Bearer',
        scopes: existingToken.scopes,
        environment: existingToken.environment,
        status: 'ACTIVE',
        expiresAt: accessExpiry,
        refreshExpiresAt: refreshExpiry,
      },
    });

    return {
      access_token: rawAccessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: rawRefreshToken,
      scope: existingToken.scopes.join(' '),
    };
  }

  /**
   * Revokes an access or refresh token
   */
  async revokeToken(dto: OAuthRevokeDto): Promise<{ success: boolean }> {
    const tokenHash = this.security.hashSecret(dto.token);

    await this.prisma.oAuthToken.updateMany({
      where: {
        OR: [{ accessTokenHash: tokenHash }, { refreshTokenHash: tokenHash }],
      },
      data: { status: 'REVOKED' },
    });

    return { success: true };
  }
}
