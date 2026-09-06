/**
 * Club & App Settings Custom Hooks
 */

import { useSettingsStore } from '../store';

export function useSettings() {
  const store = useSettingsStore();
  return {
    ...store,
  };
}
