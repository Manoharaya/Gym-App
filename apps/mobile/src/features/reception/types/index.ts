/**
 * Reception & Front Desk Types
 * Staff portal for check-in verification, fast POS, and facility walk-ins.
 */

export interface ReceptionState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
