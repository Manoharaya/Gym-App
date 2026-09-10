import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { DEFAULT_FINANCIAL_CACHE_TTL_MS } from '../domain/financial-intelligence.constants';

interface FinancialCacheEntry<T> {
  data: T;
  expiresAt: number;
  organisationId: string;
  outletId?: string;
  currency?: string;
  roleScope: string;
}

@Injectable()
export class FinancialCacheService {
  private readonly logger = new Logger(FinancialCacheService.name);
  private readonly cache = new Map<string, FinancialCacheEntry<any>>();

  /**
   * Generates a strictly isolated, multi-tenant composite cache key.
   */
  generateKey(params: {
    organisationId: string;
    outletId?: string;
    currency?: string;
    roleScope: string;
    endpoint: string;
    filters: Record<string, any>;
  }): string {
    const { organisationId, outletId, currency, roleScope, endpoint, filters } = params;
    const filterHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(filters || {}))
      .digest('hex')
      .substring(0, 16);

    return `fitcore:finance:${organisationId}:${outletId || 'all'}:${currency || 'all'}:${roleScope}:${endpoint}:${filterHash}`;
  }

  /**
   * Retrieves cached data if active and strictly matches requesting tenant.
   */
  get<T>(key: string, organisationId: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Strict multi-tenant verification: never allow cross-tenant data leakage
    if (entry.organisationId !== organisationId) {
      this.logger.warn(`Tenant mismatch in financial cache key ${key}. Evicting.`);
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
    currency?: string;
    roleScope: string;
    ttlMs?: number;
  }): void {
    const {
      key,
      data,
      organisationId,
      outletId,
      currency,
      roleScope,
      ttlMs = DEFAULT_FINANCIAL_CACHE_TTL_MS,
    } = params;

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      organisationId,
      outletId,
      currency,
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
   * Clears the entire cache (useful for tests).
   */
  clear(): void {
    this.cache.clear();
  }
}
