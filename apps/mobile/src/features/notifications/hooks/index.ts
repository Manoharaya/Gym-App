/**
 * Notification Center Custom Hooks
 */

import { useNotificationsStore } from '../store';

export function useNotifications() {
  const store = useNotificationsStore();
  return {
    ...store,
  };
}
