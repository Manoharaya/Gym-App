/**
 * Legal Consent & Terms Custom Hooks
 */

import { useConsentStore } from '../store';

export function useConsent() {
  const store = useConsentStore();
  return {
    ...store,
  };
}
