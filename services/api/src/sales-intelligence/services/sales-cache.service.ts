import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { DEFAULT_CACHE_TTL_MS } from '../domain/sales-intelligence.constants';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  organisationId: string;
  outletId?: string;
  roleScope: string;
}

@Injectable()
export class SalesCacheService {
  private readonly logger = new Logger(SalesCacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();

  /**
   * Generates a strictly isolated, multi-tenant composite cache key.
   */
  generateKey(params: {
    organisationId: string;
    outletId?: string;
    roleScope: string;
    endpoint: string;
    filters: Record<string, any>;
  }): string {
    const { organisationId, outletId, roleScope, endpoint, filters } = params;
    const filterHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(filters || {}))
      .digest('hex')
      .substring(0, 16);

    return `sales_cache:${organisationId}:${outletId || 'all'}:${roleScope}:${endpoint}:${filterHash}`;
  }

  /**
   * Retrieves cached data if active and strictly matches requesting tenant.
   */
  get<T>(key: string, organisationId: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Strict multi-tenant verification: never allow cross-tenant data leakage
    if (entry.organisationId !== organisationId) {
      this.logger.warn(`Tenant mismatch in cache key ${key}. Evicting.`);
      this.cache.delete(key);
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Stores data in cache with tenant binding and TTL.
   */
  set<T>(params: {
    key: string;
    data: T;
    organisationId: string;
    outletId?: string;
    roleScope: string;
    ttlMs?: number;
  }): void {
    const { key, data, organisationId, outletId, roleScope, ttlMs = DEFAULT_CACHE_TTL_MS } = params;

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      organisationId,
      outletId,
      roleScope,
    });
  }

  /**
   * Invalidates all cache entries belonging to an organisation.
   */
  invalidateOrganisation(organisationId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.organisationId === organisationId) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears the entire cache (e.g. for testing).
   */
  clear(): void {
    this.cache.clear();
  }
}
