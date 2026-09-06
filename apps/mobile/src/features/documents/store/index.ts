/**
 * Documents & Waivers State Store
 */

import { create } from 'zustand';
import type { DocumentsState } from '../types';

export const useDocumentsStore = create<DocumentsState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
