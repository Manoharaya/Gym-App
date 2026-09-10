/**
 * FitCore — Day 44: AI Finance Cache Service
 *
 * Provides multi-tenant isolated caching for read-only financial intelligence summaries.
 */

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../../redis/redis.service';
import { FINANCE_ASSISTANT_CONSTANTS } from '../domain/finance-assistant.constants';

@Injectable()
export class FinanceCacheService {
  private readonly logger = new Logger(FinanceCacheService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Generates a deterministic, tenant-isolated cache key.
   */
  buildKey(params: {
    organisationId: string;
    outletId?: string;
    metric?: string;
    dateRange?: string;
    currency?: string;
    scopeRole?: string;
  }): string {
    const {
      organisationId,
      outletId = 'all',
      metric = 'summary',
      dateRange = 'current',
      currency = 'AUD',
      scopeRole = 'owner',
    } = params;
    return `finance_ai:${organisationId}:${outletId}:${metric}:${dateRange}:${currency}:${scopeRole}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      this.logger.warn(`Failed to read from finance AI cache: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = FINANCE_ASSISTANT_CONSTANTS.CACHE_TTL_SECONDS): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), ttlSeconds);
    } catch (err: any) {
      this.logger.warn(`Failed to write to finance AI cache: ${err.message}`);
    }
  }

  async invalidateOrgCache(organisationId: string): Promise<void> {
    try {
      // Invalidate keys starting with finance_ai:${organisationId}
      const pattern = `finance_ai:${organisationId}:*`;
      await this.redis.delByPattern(pattern);
    } catch (err: any) {
      this.logger.warn(`Failed to invalidate finance AI cache for org ${organisationId}: ${err.message}`);
    }
  }
}
