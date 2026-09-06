import { ILocalStorage } from './types';

const localStore = new Map<string, string>();

export class LocalStorageImpl implements ILocalStorage {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = localStore.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      localStore.set(key, JSON.stringify(value));
    } catch {
      // safe fallback
    }
  }

  async removeItem(key: string): Promise<void> {
    localStore.delete(key);
  }

  async clear(): Promise<void> {
    localStore.clear();
  }
}

export const localStorage = new LocalStorageImpl();
