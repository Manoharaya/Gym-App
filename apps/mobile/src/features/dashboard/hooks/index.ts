/**
 * Role Dashboards Custom Hooks
 */

import { useDashboardStore } from '../store';

export function useDashboard() {
  const store = useDashboardStore();
  return {
    ...store,
  };
}
