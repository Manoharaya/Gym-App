/**
 * FitCore — Day 49: OAuth 2.0 Authorization Server Controller
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OAuthService } from '../services/oauth.service';
import { OAuthConsentService } from '../services/oauth-consent.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import {
  OAuthAuthorizeQueryInputDto,
  OAuthConsentDecisionInputDto,
} from '../dto/oauth-authorize.dto';
import {
  OAuthRevokeTokenInputDto,
  OAuthTokenRequestInputDto,
} from '../dto/oauth-token.dto';

@Controller('api/v1/oauth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly consentService: OAuthConsentService,
  ) {}

  /**
   * Authorize endpoint (GET): Checks client and scopes, returns consent screen details.
   * Requires active user session (JwtAuthGuard).
   */
  @Get('authorize')
  @UseGuards(JwtAuthGuard)
  async getAuthorizeConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OAuthAuthorizeQueryInputDto,
  ) {
    const orgId = user.primaryOrganisationId || user.roles[0]?.organisationId || '';
    // Validate request
    await this.oauthService.validateAuthorizeRequest({
      client_id: query.client_id,
      redirect_uri: query.redirect_uri,
      response_type: query.response_type,
      scope: query.scope,
      state: query.state,
      code_challenge: query.code_challenge,
      code_challenge_method: query.code_challenge_method,
    });

    return this.consentService.getConsentDetails(query.client_id, orgId, query.scope);
  }

  /**
   * Authorize endpoint (POST): User confirms or denies consent.
   * Requires active user session (JwtAuthGuard).
   */
  @Post('authorize')
  @UseGuards(JwtAuthGuard)
  async submitConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OAuthConsentDecisionInputDto,
  ) {
    const orgId = user.primaryOrganisationId || user.roles[0]?.organisationId || '';
    return this.oauthService.handleConsentDecision(user.id, orgId, {
      client_id: dto.client_id,
      redirect_uri: dto.redirect_uri,
      scopes: dto.scopes,
      state: dto.state,
      code_challenge: dto.code_challenge,
      code_challenge_method: dto.code_challenge_method,
      approved: dto.approved,
    });
  }

  /**
   * Token endpoint (POST): Public OAuth token exchange (auth code / refresh token + PKCE).
   */
  @Post('token')
  async exchangeToken(@Body() dto: OAuthTokenRequestInputDto) {
    return this.oauthService.exchangeToken({
      grant_type: dto.grant_type,
      client_id: dto.client_id,
      client_secret: dto.client_secret,
      code: dto.code,
      redirect_uri: dto.redirect_uri,
      code_verifier: dto.code_verifier,
      refresh_token: dto.refresh_token,
    });
  }

  /**
   * Revoke endpoint (POST): Revokes an access or refresh token.
   */
  @Post('revoke')
  async revokeToken(@Body() dto: OAuthRevokeTokenInputDto) {
    return this.oauthService.revokeToken({
      token: dto.token,
      token_type_hint: dto.token_type_hint,
      client_id: dto.client_id,
      client_secret: dto.client_secret,
    });
  }
}
