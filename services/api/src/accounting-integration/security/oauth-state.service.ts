/**
 * FitCore — Day 43: OAuth State Service
 *
 * Generates, securely stores, and single-use validates CSRF state tokens
 * bound to tenant and user context.
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { ACCOUNTING_DEFAULTS } from '../domain/accounting.constants';
import * as crypto from 'crypto';

export interface OAuthStatePayload {
  organisationId: string;
  userId: string;
  provider: string;
  redirectUri: string;
  createdAt: number;
}

@Injectable()
export class OAuthStateService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Generates a cryptographically random, single-use state token.
   */
  async generateState(
    organisationId: string,
    userId: string,
    provider: string,
    redirectUri: string,
  ): Promise<string> {
    const stateToken = `fc_oauth_${crypto.randomBytes(24).toString('hex')}`;
    const payload: OAuthStatePayload = {
      organisationId,
      userId,
      provider,
      redirectUri,
      createdAt: Date.now(),
    };

    const cacheKey = `accounting:oauth:state:${stateToken}`;
    await this.redisService.set(
      cacheKey,
      JSON.stringify(payload),
      ACCOUNTING_DEFAULTS.OAUTH_STATE_TTL_SECONDS,
    );

    return stateToken;
  }

  /**
   * Validates and immediately consumes (deletes) the state token.
   */
  async consumeState(stateToken: string): Promise<OAuthStatePayload> {
    if (!stateToken) {
      throw new BadRequestException('Missing OAuth state token');
    }

    const cacheKey = `accounting:oauth:state:${stateToken}`;
    const raw = await this.redisService.get(cacheKey);

    if (!raw) {
      throw new BadRequestException('Invalid or expired OAuth state token');
    }

    // Immediately delete to enforce single-use
    await this.redisService.del(cacheKey);

    try {
      return JSON.parse(raw) as OAuthStatePayload;
    } catch {
      throw new BadRequestException('Malformed OAuth state token');
    }
  }
}
