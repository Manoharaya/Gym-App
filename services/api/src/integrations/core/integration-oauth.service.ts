/**
 * FitCore — Day 48: Integration OAuth State Service
 *
 * Provides cryptographically secure, single-use, tenant-bound, and user-bound
 * OAuth CSRF state handling to defend against replay and CSRF injection attacks.
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { IntegrationCacheService } from './integration-cache.service';
import * as crypto from 'crypto';

export interface OAuthStatePayload {
  stateToken: string;
  organisationId: string;
  userId: string;
  provider: string;
  redirectUri: string;
  scope?: string;
  createdAt: number;
}

@Injectable()
export class IntegrationOAuthService {
  private readonly logger = new Logger(IntegrationOAuthService.name);
  private readonly STATE_TTL_SECONDS = 600; // 10 minutes

  constructor(private readonly cacheService: IntegrationCacheService) {}

  /**
   * Generates a single-use, tenant/user/provider-bound state token.
   */
  async generateState(
    organisationId: string,
    userId: string,
    provider: string,
    redirectUri: string,
    scope?: string,
  ): Promise<string> {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const stateToken = `fc_state_${randomBytes}`;

    const payload: OAuthStatePayload = {
      stateToken,
      organisationId,
      userId,
      provider,
      redirectUri,
      scope,
      createdAt: Date.now(),
    };

    const cacheKey = `oauth:state:${stateToken}`;
    await this.cacheService.set(cacheKey, JSON.stringify(payload), this.STATE_TTL_SECONDS);

    return stateToken;
  }

  /**
   * Validates and consumes the state token (single-use).
   * Throws BadRequestException if missing, expired, or previously consumed.
   */
  async consumeState(stateToken: string): Promise<OAuthStatePayload> {
    if (!stateToken || !stateToken.startsWith('fc_state_')) {
      throw new BadRequestException('Invalid OAuth state parameter format');
    }

    const cacheKey = `oauth:state:${stateToken}`;
    const rawData = await this.cacheService.get(cacheKey);

    if (!rawData) {
      throw new BadRequestException('OAuth state has expired, is invalid, or was already consumed');
    }

    // Single-use: delete immediately
    await this.cacheService.del(cacheKey);

    try {
      const payload = JSON.parse(rawData) as OAuthStatePayload;
      return payload;
    } catch {
      throw new BadRequestException('Malformed OAuth state data');
    }
  }
}
