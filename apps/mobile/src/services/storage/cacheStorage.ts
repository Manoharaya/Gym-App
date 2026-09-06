import { ICacheStorage } from './types';

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export class CacheStorageImpl implements ICacheStorage {
  async get<T>(key: string): Promise<T | null> {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    memoryCache.set(key, { value, expiresAt });
  }

  async invalidate(key: string): Promise<void> {
    memoryCache.delete(key);
  }

  async clear(): Promise<void> {
    memoryCache.clear();
  }
}

export const cacheStorage = new CacheStorageImpl();
