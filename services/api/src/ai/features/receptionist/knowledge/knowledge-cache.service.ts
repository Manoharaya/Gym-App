/**
 * Day 31 — Knowledge Cache Service
 * Provides high-performance in-memory caching for frequently queried knowledge articles.
 */

import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class KnowledgeCacheService {
  private readonly logger = new Logger(KnowledgeCacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTtlMs = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}
