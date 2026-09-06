/**
 * Membership & Subscriptions State Store
 */

import { create } from 'zustand';
import type { MembershipState } from '../types';

export const useMembershipStore = create<MembershipState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
