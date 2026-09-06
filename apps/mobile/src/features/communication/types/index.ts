/**
 * Direct & Club Messaging Types
 * Enables 1-on-1 trainer chat and broadcast announcements.
 */

export interface CommunicationState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
