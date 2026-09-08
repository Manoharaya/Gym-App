import { Injectable, Logger } from '@nestjs/common';
import { DEFAULT_RETRY_CONFIG } from '../communications.constants';

@Injectable()
export class RetryPolicyService {
  private readonly logger = new Logger(RetryPolicyService.name);

  // Permanent failure error codes that should NOT trigger retries
  private readonly PERMANENT_ERROR_CODES = [
    'INVALID_RECIPIENT',
    'INVALID_PHONE',
    'INVALID_EMAIL',
    'INVALID_PHONE_NUMBER',
    'INVALID_WHATSAPP_PHONE',
    'MISSING_CONSENT',
    'OPTED_OUT',
    'UNSUBSCRIBED',
    'BLOCKED_RECIPIENT',
    'INVALID_TEMPLATE',
    'PERMANENT_ERROR',
  ];

  /**
   * Determines if a failed communication attempt should be retried.
   */
  shouldRetry(attemptCount: number, errorCode?: string, maxAttempts: number = DEFAULT_RETRY_CONFIG.MAX_ATTEMPTS): boolean {
    if (errorCode && this.PERMANENT_ERROR_CODES.includes(errorCode.toUpperCase())) {
      return false;
    }
    return attemptCount < maxAttempts;
  }

  /**
   * Calculates exponential backoff delay in milliseconds.
   */
  getBackoffDelay(attemptCount: number): number {
    const { INITIAL_BACKOFF_MS, BACKOFF_FACTOR, MAX_BACKOFF_MS } = DEFAULT_RETRY_CONFIG;
    const delay = INITIAL_BACKOFF_MS * Math.pow(BACKOFF_FACTOR, attemptCount);
    return Math.min(delay, MAX_BACKOFF_MS);
  }
}
