/**
 * Role Dashboards State Store
 */

import { create } from 'zustand';
import type { DashboardState } from '../types';

export const useDashboardStore = create<DashboardState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
