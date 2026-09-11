/**
 * FitCore — Day 49: Developer Platform Sliding-Window Rate Limiting Service
 */

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { DeveloperError } from '../domain/developer-errors';
import { RateLimitTier } from '@fitcore/types';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

@Injectable()
export class ApiRateLimitService {
  private readonly logger = new Logger(ApiRateLimitService.name);

  // In-memory sliding window fallback
  private readonly memoryBuckets = new Map<string, number[]>();

  // Tiers (requests per 60s window)
  private readonly TIER_LIMITS: Record<RateLimitTier, number> = {
    SANDBOX: 60,
    STANDARD: 120,
    PARTNER: 500,
    ENTERPRISE: 2000,
    INTERNAL: 5000,
  };

  constructor(private readonly redis: RedisService) {}

  /**
   * Evaluates rate limit for a developer application or key.
   * Throws DeveloperError.rateLimited() if limit is exhausted.
   */
  async checkRateLimit(
    identifier: string,
    tier: RateLimitTier = 'STANDARD',
    windowSeconds = 60,
  ): Promise<RateLimitResult> {
    const limit = this.TIER_LIMITS[tier] || 120;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const key = `ratelimit:developer:${identifier}`;

    let currentCount = 0;

    try {
      if (this.redis) {
        const val = await this.redis.get(key);
        currentCount = val ? parseInt(val, 10) + 1 : 1;
        await this.redis.set(key, currentCount.toString(), windowSeconds);
      } else {
        currentCount = this.checkMemoryRateLimit(key, now, windowStart);
      }
    } catch (err: any) {
      this.logger.warn(`Redis rate limit error, using memory fallback: ${err.message}`);
      currentCount = this.checkMemoryRateLimit(key, now, windowStart);
    }

    const remaining = Math.max(0, limit - currentCount);
    const resetSeconds = windowSeconds;

    if (currentCount > limit) {
      throw DeveloperError.rateLimited(resetSeconds);
    }

    return {
      allowed: true,
      limit,
      remaining,
      resetSeconds,
    };
  }

  private checkMemoryRateLimit(key: string, now: number, windowStart: number): number {
    let timestamps = this.memoryBuckets.get(key) || [];
    timestamps = timestamps.filter((ts) => ts > windowStart);
    timestamps.push(now);
    this.memoryBuckets.set(key, timestamps);
    return timestamps.length;
  }
}
