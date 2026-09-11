/**
 * FitCore — Day 48: Integration Cache Service
 *
 * Provides tenant-isolated TTL caching for rate limits, health metrics, and OAuth states.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class IntegrationCacheService {
  private readonly logger = new Logger(IntegrationCacheService.name);
  private readonly memoryCache = new Map<string, { value: string; expiresAt: number }>();

  constructor(@Optional() private readonly redisService?: RedisService) {}

  async get(key: string): Promise<string | null> {
    try {
      if (this.redisService) {
        const client = (this.redisService as any).getClient?.();
        if (client) {
          return await client.get(key);
        }
      }
    } catch {
      // Fallback to memory
    }

    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      if (this.redisService) {
        const client = (this.redisService as any).getClient?.();
        if (client) {
          await client.set(key, value, 'EX', ttlSeconds);
          return;
        }
      }
    } catch {
      // Fallback to memory
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    try {
      if (this.redisService) {
        const client = (this.redisService as any).getClient?.();
        if (client) {
          await client.del(key);
          return;
        }
      }
    } catch {
      // Fallback to memory
    }

    this.memoryCache.delete(key);
  }
}
