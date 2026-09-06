/**
 * Direct & Club Messaging Custom Hooks
 */

import { useCommunicationStore } from '../store';

export function useCommunication() {
  const store = useCommunicationStore();
  return {
    ...store,
  };
}
