import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../../redis/redis.service';
import {
  ENGAGEMENT_CACHE_PREFIX,
  ENGAGEMENT_CACHE_TTL_SECONDS,
} from '../engagement-intelligence.constants';

@Injectable()
export class EngagementIntelligenceCacheService {
  private readonly logger = new Logger(EngagementIntelligenceCacheService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Generates a strictly tenant- and member-isolated cache key.
   * Format: fitcore:ai:engagement:{orgId}:{memberId}:{dateRange}:{dataVersion}
   */
  private buildKey(
    organisationId: string,
    memberId: string,
    segment: string,
    dateRange: string = '28d',
    dataVersion: number = 1,
  ): string {
    return `${ENGAGEMENT_CACHE_PREFIX}${organisationId}:${memberId}:${segment}:${dateRange}:v${dataVersion}`;
  }

  async get<T>(
    organisationId: string,
    memberId: string,
    segment: string,
    dateRange: string = '28d',
    dataVersion: number = 1,
  ): Promise<T | null> {
    try {
      const key = this.buildKey(organisationId, memberId, segment, dateRange, dataVersion);
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      this.logger.warn(`Redis get error for engagement cache: ${err.message}`);
      return null;
    }
  }

  async set<T>(
    organisationId: string,
    memberId: string,
    segment: string,
    value: T,
    dateRange: string = '28d',
    dataVersion: number = 1,
    ttlSeconds: number = ENGAGEMENT_CACHE_TTL_SECONDS,
  ): Promise<void> {
    try {
      const key = this.buildKey(organisationId, memberId, segment, dateRange, dataVersion);
      await this.redis.set(key, JSON.stringify(value), ttlSeconds);
    } catch (err: any) {
      this.logger.warn(`Redis set error for engagement cache: ${err.message}`);
    }
  }

  async invalidate(organisationId: string, memberId: string): Promise<void> {
    try {
      const segments = ['summary', 'trends', 'risk'];
      for (const seg of segments) {
        const key = this.buildKey(organisationId, memberId, seg);
        await this.redis.del(key);
      }
    } catch (err: any) {
      this.logger.warn(`Redis invalidate error for engagement cache: ${err.message}`);
    }
  }
}
