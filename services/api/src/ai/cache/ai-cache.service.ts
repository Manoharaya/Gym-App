import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import * as crypto from 'crypto';

@Injectable()
export class AICacheService {
  private readonly logger = new Logger(AICacheService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Generates a tenant-scoped cache key for non-personal prompts.
   */
  generateCacheKey(organisationId: string, feature: string, promptContent: string): string {
    const hash = crypto.createHash('sha256').update(promptContent).digest('hex').substring(0, 16);
    return `aicache:${organisationId}:${feature}:${hash}`;
  }

  /**
   * Retrieves cached response if safe (only non-member queries).
   */
  async getCachedResponse(
    organisationId: string,
    feature: string,
    promptContent: string,
    memberId?: string | null,
  ): Promise<any | null> {
    // Critical security rule: NEVER cache member-specific context without explicit authorization
    if (memberId) {
      return null;
    }

    const key = this.generateCacheKey(organisationId, feature, promptContent);
    const cached = await this.redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return cached;
      }
    }
    return null;
  }

  /**
   * Stores response in cache with TTL.
   */
  async setCachedResponse(
    organisationId: string,
    feature: string,
    promptContent: string,
    response: any,
    memberId?: string | null,
    ttlSeconds: number = 3600,
  ): Promise<void> {
    if (memberId) {
      return; // Do not cache member personal responses
    }

    const key = this.generateCacheKey(organisationId, feature, promptContent);
    const serialized = typeof response === 'string' ? response : JSON.stringify(response);
    await this.redis.set(key, serialized, ttlSeconds);
  }
}
