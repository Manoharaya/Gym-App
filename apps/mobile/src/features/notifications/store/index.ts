/**
 * Notification Center State Store
 */

import { create } from 'zustand';
import type { NotificationsState } from '../types';

export const useNotificationsStore = create<NotificationsState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
