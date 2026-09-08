import { Injectable, Logger } from '@nestjs/common';
import { WearableProviderType } from '@fitcore/types';

export interface RateLimitStatus {
  isAllowed: boolean;
  remainingCalls: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

@Injectable()
export class WearableRateLimiterService {
  private readonly logger = new Logger(WearableRateLimiterService.name);

  // In-memory sliding window tracker: Map<key, { count: number, windowStart: number }>
  private readonly callHistory = new Map<string, { count: number; windowStart: number }>();
  // Cooldown / 429 Retry-After tracker: Map<key, number (timestamp ms)>
  private readonly cooldowns = new Map<string, number>();

  // Configured limits: requests per 1 hour window
  private readonly providerLimits: Record<WearableProviderType, number> = {
    APPLE_HEALTH: 1000,
    GOOGLE_HEALTH_CONNECT: 1000,
    FITBIT: 150, // Fitbit API enforces 150 calls/hour per user
    GARMIN: 120,
    WHOOP: 100,
    OURA: 100,
  };

  /**
   * Checks if an outgoing provider call is permitted under rate limits.
   */
  checkRateLimit(connectionId: string, provider: WearableProviderType): RateLimitStatus {
    const now = Date.now();
    const key = `${provider}:${connectionId}`;

    // 1. Check if in explicit 429 Retry-After cooldown
    const cooldownUntil = this.cooldowns.get(key);
    if (cooldownUntil && cooldownUntil > now) {
      const retryAfterSeconds = Math.ceil((cooldownUntil - now) / 1000);
      return {
        isAllowed: false,
        remainingCalls: 0,
        resetAt: new Date(cooldownUntil),
        retryAfterSeconds,
      };
    }

    // 2. Sliding window check (1 hour = 3,600,000 ms)
    const windowMs = 3600000;
    const limit = this.providerLimits[provider] || 150;
    const record = this.callHistory.get(key);

    if (!record || now - record.windowStart >= windowMs) {
      return {
        isAllowed: true,
        remainingCalls: limit,
        resetAt: new Date(now + windowMs),
      };
    }

    const remaining = Math.max(0, limit - record.count);
    const resetAt = new Date(record.windowStart + windowMs);

    if (remaining <= 0) {
      return {
        isAllowed: false,
        remainingCalls: 0,
        resetAt,
        retryAfterSeconds: Math.ceil((record.windowStart + windowMs - now) / 1000),
      };
    }

    return {
      isAllowed: true,
      remainingCalls: remaining,
      resetAt,
    };
  }

  /**
   * Increments the call count when a request is dispatched.
   */
  recordCall(connectionId: string, provider: WearableProviderType): void {
    const now = Date.now();
    const key = `${provider}:${connectionId}`;
    const windowMs = 3600000;
    const record = this.callHistory.get(key);

    if (!record || now - record.windowStart >= windowMs) {
      this.callHistory.set(key, { count: 1, windowStart: now });
    } else {
      record.count += 1;
    }
  }

  /**
   * Registers a provider 429 Retry-After response.
   */
  recordRetryAfter(connectionId: string, provider: WearableProviderType, retryAfterSeconds: number): void {
    const key = `${provider}:${connectionId}`;
    const cooldownUntil = Date.now() + Math.max(1, retryAfterSeconds) * 1000;
    this.cooldowns.set(key, cooldownUntil);
    this.logger.warn(`Provider ${provider} applied rate limit for connection ${connectionId}. Backing off for ${retryAfterSeconds}s`);
  }
}
