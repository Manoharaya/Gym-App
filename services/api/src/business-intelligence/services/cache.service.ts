import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import * as crypto from 'crypto';

export interface CacheKeyParams {
  organisationId: string;
  outletId?: string;
  userRole: string;
  metric?: string;
  dateRange: string;
  comparisonRange?: string;
  currency?: string;
  dataVersion?: number;
  filters?: Record<string, any>;
}

@Injectable()
export class BusinessCacheService {
  private readonly logger = new Logger(BusinessCacheService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Builds a strictly partitioned, tenant-safe Redis cache key.
   */
  buildCacheKey(params: CacheKeyParams): string {
    const {
      organisationId,
      outletId = 'all',
      userRole,
      metric = 'overview',
      dateRange,
      comparisonRange = 'none',
      currency = 'all',
      dataVersion = 1,
      filters = {},
    } = params;

    const filterString = JSON.stringify(filters);
    const filterHash = crypto.createHash('md5').update(filterString).digest('hex').substring(0, 8);

    return `bi:${organisationId}:${outletId}:${userRole}:${metric}:${dateRange}:${comparisonRange}:${currency}:v${dataVersion}:${filterHash}`;
  }

  /**
   * Retrieves cached data if present.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err: any) {
      this.logger.warn(`Failed to read from BI cache: ${err.message}`);
      return null;
    }
  }

  /**
   * Stores data in cache with TTL (default 300 seconds).
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), ttlSeconds);
    } catch (err: any) {
      this.logger.warn(`Failed to write to BI cache: ${err.message}`);
    }
  }

  /**
   * Invalidates cached keys for an organisation.
   */
  async invalidateOrganisation(organisationId: string): Promise<void> {
    try {
      const pattern = `bi:${organisationId}:*`;
      await this.redis.del(pattern);
    } catch (err: any) {
      this.logger.warn(`Failed to invalidate BI cache: ${err.message}`);
    }
  }
}
