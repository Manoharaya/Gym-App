import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import * as crypto from 'crypto';

export interface MultiOutletCacheKeyParams {
  organisationId: string;
  outletScope: string;
  userRole: string;
  metric?: string;
  dateRange: string;
  currency?: string;
  normalisation?: string;
  filters?: Record<string, any>;
}

@Injectable()
export class OutletCacheService {
  private readonly logger = new Logger(OutletCacheService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Builds tenant-partitioned cache key for multi-outlet intelligence.
   */
  buildKey(params: MultiOutletCacheKeyParams): string {
    const {
      organisationId,
      outletScope,
      userRole,
      metric = 'all',
      dateRange,
      currency = 'all',
      normalisation = 'default',
      filters = {},
    } = params;

    const filterString = JSON.stringify(filters);
    const filterHash = crypto.createHash('md5').update(filterString).digest('hex').substring(0, 8);

    return `bi:multi-outlet:${organisationId}:${outletScope}:${userRole}:${metric}:${dateRange}:${currency}:${normalisation}:${filterHash}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err: any) {
      this.logger.warn(`Failed to read from multi-outlet cache: ${err.message}`);
      return null;
    }
  }

  async set(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(data), ttlSeconds);
    } catch (err: any) {
      this.logger.warn(`Failed to write to multi-outlet cache: ${err.message}`);
    }
  }
}
