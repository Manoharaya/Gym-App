import { secureStorage } from '../services/storage/secureStorage';
import { localStorage } from '../services/storage/localStorage';
import { SECURE_STORAGE_KEYS } from '@fitcore/constants';

describe('Storage Abstraction Contracts', () => {
  it('stores and retrieves access tokens via SecureStorage abstraction', async () => {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token_payload';
    await secureStorage.setItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN, testToken);

    const retrieved = await secureStorage.getItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN);
    expect(retrieved).toBe(testToken);

    await secureStorage.removeItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN);
    const afterRemoval = await secureStorage.getItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN);
    expect(afterRemoval).toBeNull();
  });

  it('stores and retrieves serialized objects via LocalStorage abstraction', async () => {
    const preferences = { darkTheme: true, notificationsEnabled: false };
    await localStorage.setItem('user_prefs', preferences);

    const retrieved = await localStorage.getItem<typeof preferences>('user_prefs');
    expect(retrieved).toEqual(preferences);

    await localStorage.removeItem('user_prefs');
    const afterRemoval = await localStorage.getItem('user_prefs');
    expect(afterRemoval).toBeNull();
  });
});
