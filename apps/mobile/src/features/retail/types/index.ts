/**
 * Retail & POS Store Types
 * Facilitates front-desk and in-app purchases for supplements and club merchandise.
 */

export interface RetailState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
