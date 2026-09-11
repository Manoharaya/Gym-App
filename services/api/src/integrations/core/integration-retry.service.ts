/**
 * FitCore — Day 48: Integration Retry Engine
 *
 * Implements exponential backoff with full jitter for resilient external operations.
 *
 * Rules:
 * - Only retry retryable errors (network, timeouts, 429 rate-limits, 502/503/504 outages)
 * - NEVER blindly retry authentication failures or validation errors
 */

import { Injectable, Logger } from '@nestjs/common';
import { IntegrationError } from '../domain/integration-errors';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  provider?: string;
  operation?: string;
}

@Injectable()
export class IntegrationRetryService {
  private readonly logger = new Logger(IntegrationRetryService.name);

  /**
   * Executes an asynchronous operation with exponential backoff and jitter.
   */
  async executeWithRetry<T>(
    fn: (attempt: number) => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const maxAttempts = options.maxAttempts ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 500;
    const maxDelayMs = options.maxDelayMs ?? 8000;
    const provider = options.provider ?? 'UNKNOWN';
    const operation = options.operation ?? 'operation';

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(attempt);
      } catch (err: any) {
        lastError = err;
        const normalized = IntegrationError.fromGenericError(provider, err);

        if (!normalized.retryable || attempt === maxAttempts) {
          throw normalized;
        }

        const delay = this.calculateDelay(attempt, baseDelayMs, maxDelayMs);
        this.logger.warn(
          `[${provider}:${operation}] Attempt ${attempt}/${maxAttempts} failed: ${normalized.message}. Retrying in ${delay}ms...`,
        );

        await this.sleep(delay);
      }
    }

    throw IntegrationError.fromGenericError(provider, lastError);
  }

  /**
   * Exponential backoff with full jitter:
   * temp = min(maxDelay, baseDelay * 2^(attempt - 1))
   * sleep = uniform(0, temp)
   */
  calculateDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
    const exponential = baseDelayMs * Math.pow(2, attempt - 1);
    const capped = Math.min(maxDelayMs, exponential);
    // Full jitter
    return Math.floor(Math.random() * capped);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
