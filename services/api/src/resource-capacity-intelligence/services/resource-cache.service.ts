import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ResourceCacheService {
  private readonly logger = new Logger(ResourceCacheService.name);
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

  generateKey(params: {
    organisationId: string;
    roleScope: string;
    outletScope?: string;
    resourceType?: string;
    metricKey?: string;
    dateRange?: string;
    bucket?: string;
    filterHash?: string;
  }): string {
    const {
      organisationId,
      roleScope,
      outletScope = 'all',
      resourceType = 'all',
      metricKey = 'all',
      dateRange = '30d',
      bucket = '60m',
      filterHash = 'none',
    } = params;

    return `resource-intelligence:${organisationId}:${roleScope}:${outletScope}:${resourceType}:${metricKey}:${dateRange}:${bucket}:${filterHash}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs || this.DEFAULT_TTL_MS);
    this.cache.set(key, { data, expiresAt });
  }

  invalidate(pattern: string): void {
    let purged = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        purged++;
      }
    }
    this.logger.debug(`[CACHE] Purged ${purged} keys matching pattern: ${pattern}`);
  }

  clear(): void {
    this.cache.clear();
  }
}
