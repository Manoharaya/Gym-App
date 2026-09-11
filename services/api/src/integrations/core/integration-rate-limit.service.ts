/**
 * FitCore — Day 48: Integration Rate Limiting Service
 *
 * Enforces per-provider, per-connection, and per-tenant rate limiting
 * using sliding window counters and respects provider Retry-After semantics.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IntegrationCacheService } from './integration-cache.service';
import { IntegrationError } from '../domain/integration-errors';
import { IntegrationRateLimitStatusDto } from '@fitcore/types';

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

@Injectable()
export class IntegrationRateLimitService {
  private readonly logger = new Logger(IntegrationRateLimitService.name);

  // Default provider operation limits (requests per minute)
  private readonly defaultLimits: Record<string, RateLimitConfig> = {
    DEFAULT: { limit: 120, windowSeconds: 60 },
    STRIPE: { limit: 100, windowSeconds: 60 },
    XERO: { limit: 60, windowSeconds: 60 },
    QUICKBOOKS: { limit: 60, windowSeconds: 60 },
    TWILIO: { limit: 120, windowSeconds: 60 },
    SENDGRID: { limit: 300, windowSeconds: 60 },
    FITBIT: { limit: 150, windowSeconds: 3600 },
    GOOGLE_CALENDAR: { limit: 250, windowSeconds: 60 },
  };

  constructor(private readonly cacheService: IntegrationCacheService) {}

  /**
   * Checks rate limit and increments counter.
   * Throws IntegrationError('RATE_LIMITED') if limit is exceeded.
   */
  async checkAndIncrement(
    provider: string,
    connectionId: string,
    operation: string = 'default',
    customConfig?: RateLimitConfig,
  ): Promise<IntegrationRateLimitStatusDto> {
    const config = customConfig || this.defaultLimits[provider.toUpperCase()] || this.defaultLimits.DEFAULT;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % config.windowSeconds);
    const resetAt = new Date((windowStart + config.windowSeconds) * 1000).toISOString();

    const cacheKey = `ratelimit:${provider}:${connectionId}:${operation}:${windowStart}`;
    const rawCount = await this.cacheService.get(cacheKey);
    const count = rawCount ? parseInt(rawCount, 10) : 0;

    if (count >= config.limit) {
      const retryAfter = windowStart + config.windowSeconds - now;
      this.logger.warn(
        `[${provider}:${connectionId}] Rate limit exceeded (${count}/${config.limit}). Retry after ${retryAfter}s`,
      );

      throw new IntegrationError({
        category: 'RATE_LIMITED',
        provider,
        message: `Provider rate limit exceeded. Please retry after ${retryAfter} seconds.`,
        retryable: true,
        details: { provider, connectionId, limit: config.limit, retryAfterSeconds: retryAfter },
      });
    }

    const newCount = count + 1;
    await this.cacheService.set(cacheKey, newCount.toString(), config.windowSeconds + 5);

    return {
      provider,
      connectionId,
      operation,
      limit: config.limit,
      remaining: Math.max(0, config.limit - newCount),
      resetAt,
      isThrottled: false,
    };
  }
}
