/**
 * Direct & Club Messaging State Store
 */

import { create } from 'zustand';
import type { CommunicationState } from '../types';

export const useCommunicationStore = create<CommunicationState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
