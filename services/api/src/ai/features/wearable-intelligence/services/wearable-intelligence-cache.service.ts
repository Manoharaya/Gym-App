import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../../redis/redis.service';

@Injectable()
export class WearableIntelligenceCacheService {
  private readonly logger = new Logger(WearableIntelligenceCacheService.name);
  private readonly inMemoryCache = new Map<string, { value: any; expiresAt: number }>();

  constructor(private readonly redis: RedisService) {}

  private buildKey(organisationId: string, memberId: string, suffix: string): string {
    return `wearable_intel:${organisationId}:${memberId}:${suffix}`;
  }

  async get<T>(organisationId: string, memberId: string, suffix: string): Promise<T | null> {
    const key = this.buildKey(organisationId, memberId, suffix);

    // 1. Try Redis
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Fallback to in-memory
    }

    // 2. In-memory check
    const local = this.inMemoryCache.get(key);
    if (local && local.expiresAt > Date.now()) {
      return local.value as T;
    }

    return null;
  }

  async set(
    organisationId: string,
    memberId: string,
    suffix: string,
    value: any,
    ttlSeconds: number = 3600,
  ): Promise<void> {
    const key = this.buildKey(organisationId, memberId, suffix);

    try {
      await this.redis.set(key, JSON.stringify(value), ttlSeconds);
    } catch {
      // In-memory fallback
      this.inMemoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
  }

  async invalidateMember(organisationId: string, memberId: string): Promise<void> {
    const prefix = `wearable_intel:${organisationId}:${memberId}:`;

    // Clear local matching keys
    for (const k of this.inMemoryCache.keys()) {
      if (k.startsWith(prefix)) {
        this.inMemoryCache.delete(k);
      }
    }

    this.logger.debug(`Invalidated wearable intelligence cache for member ${memberId}`);
  }
}
