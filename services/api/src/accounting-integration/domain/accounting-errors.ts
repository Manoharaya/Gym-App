/**
 * FitCore — Day 43: Accounting Error Normalization
 *
 * Normalizes vendor-specific error codes into canonical FitCore categories.
 */

import { AccountingErrorCode } from '@fitcore/types';

export class AccountingIntegrationException extends Error {
  constructor(
    public readonly errorCode: AccountingErrorCode,
    message: string,
    public readonly isRetryable: boolean = false,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'AccountingIntegrationException';
  }
}

export class AccountingErrorNormalizer {
  static normalize(error: any): {
    code: AccountingErrorCode;
    message: string;
    isRetryable: boolean;
  } {
    if (error instanceof AccountingIntegrationException) {
      return {
        code: error.errorCode,
        message: error.message,
        isRetryable: error.isRetryable,
      };
    }

    const message = error?.message || String(error);
    const status = error?.status || error?.statusCode || error?.response?.status;

    if (status === 401 || message.includes('unauthorized') || message.includes('invalid_grant')) {
      return {
        code: 'AUTHENTICATION_ERROR',
        message: 'Accounting provider authentication failed or token expired.',
        isRetryable: false,
      };
    }

    if (status === 403 || message.includes('forbidden') || message.includes('scope')) {
      return {
        code: 'AUTHORIZATION_ERROR',
        message: 'Insufficient permissions on external accounting tenant.',
        isRetryable: false,
      };
    }

    if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return {
        code: 'RATE_LIMITED',
        message: 'External accounting platform rate limit encountered.',
        isRetryable: true,
      };
    }

    if (status === 404 || message.includes('not found')) {
      return {
        code: 'NOT_FOUND',
        message: 'Referenced external entity does not exist.',
        isRetryable: false,
      };
    }

    if (status === 409 || message.includes('duplicate') || message.includes('already exists')) {
      return {
        code: 'DUPLICATE',
        message: 'Entity already exists in external accounting system.',
        isRetryable: false,
      };
    }

    if (status >= 500 || message.includes('timeout') || message.includes('network') || message.includes('econnrefused')) {
      return {
        code: 'PROVIDER_UNAVAILABLE',
        message: 'External accounting platform is temporarily unavailable.',
        isRetryable: true,
      };
    }

    if (message.includes('mapping') || message.includes('account not found') || message.includes('tax not configured')) {
      return {
        code: 'MAPPING_ERROR',
        message: 'Missing or invalid account/tax mapping.',
        isRetryable: false,
      };
    }

    return {
      code: 'UNKNOWN',
      message: message || 'Unknown accounting integration error',
      isRetryable: false,
    };
  }
}
