import * as ExpoSecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ISecureStorage } from './types';

// In-memory fallback for unit tests and unsupported web platforms
const memoryStore = new Map<string, string>();

export class SecureStorageImpl implements ISecureStorage {
  private isSupported(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  async getItem(key: string): Promise<string | null> {
    if (!this.isSupported()) {
      return memoryStore.get(key) ?? null;
    }
    try {
      return await ExpoSecureStore.getItemAsync(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.isSupported()) {
      memoryStore.set(key, value);
      return;
    }
    try {
      await ExpoSecureStore.setItemAsync(key, value, {
        keychainAccessible: ExpoSecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      memoryStore.set(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.isSupported()) {
      memoryStore.delete(key);
      return;
    }
    try {
      await ExpoSecureStore.deleteItemAsync(key);
    } catch {
      memoryStore.delete(key);
    }
  }
}

export const secureStorage = new SecureStorageImpl();
