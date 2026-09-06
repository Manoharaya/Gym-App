/**
 * Documents & Waivers Custom Hooks
 */

import { useDocumentsStore } from '../store';

export function useDocuments() {
  const store = useDocumentsStore();
  return {
    ...store,
  };
}
