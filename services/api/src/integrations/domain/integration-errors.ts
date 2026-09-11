/**
 * FitCore — Day 48: Integration Error Normalization
 *
 * Normalizes external provider-specific errors into standard FitCore IntegrationError categories.
 */

import { IntegrationErrorCategory } from '@fitcore/types';
import { HttpException, HttpStatus } from '@nestjs/common';

export class IntegrationError extends HttpException {
  public readonly category: IntegrationErrorCategory;
  public readonly provider: string;
  public readonly retryable: boolean;
  public readonly providerStatusCode?: number;
  public readonly providerErrorCode?: string;
  public readonly details?: Record<string, any>;

  constructor(options: {
    category: IntegrationErrorCategory;
    provider: string;
    message: string;
    retryable?: boolean;
    providerStatusCode?: number;
    providerErrorCode?: string;
    details?: Record<string, any>;
    httpStatus?: HttpStatus;
  }) {
    const status = options.httpStatus || IntegrationError.resolveHttpStatus(options.category);
    super(
      {
        statusCode: status,
        error: options.category,
        message: options.message,
        provider: options.provider,
        retryable: options.retryable ?? IntegrationError.isCategoryRetryable(options.category),
        providerStatusCode: options.providerStatusCode,
        providerErrorCode: options.providerErrorCode,
        timestamp: new Date().toISOString(),
      },
      status,
    );

    this.category = options.category;
    this.provider = options.provider;
    this.retryable = options.retryable ?? IntegrationError.isCategoryRetryable(options.category);
    this.providerStatusCode = options.providerStatusCode;
    this.providerErrorCode = options.providerErrorCode;
    this.details = options.details;
  }

  static isCategoryRetryable(category: IntegrationErrorCategory): boolean {
    switch (category) {
      case 'TRANSIENT':
      case 'RATE_LIMITED':
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
      case 'PROVIDER_UNAVAILABLE':
        return true;
      case 'AUTHENTICATION_FAILED':
      case 'AUTHORIZATION_FAILED':
      case 'INVALID_CONFIGURATION':
      case 'VALIDATION_FAILED':
      case 'RESOURCE_NOT_FOUND':
      case 'CONFLICT':
      case 'DUPLICATE':
      case 'UNSUPPORTED_OPERATION':
      case 'UNKNOWN':
      default:
        return false;
    }
  }

  static resolveHttpStatus(category: IntegrationErrorCategory): HttpStatus {
    switch (category) {
      case 'AUTHENTICATION_FAILED':
        return HttpStatus.UNAUTHORIZED;
      case 'AUTHORIZATION_FAILED':
        return HttpStatus.FORBIDDEN;
      case 'INVALID_CONFIGURATION':
      case 'VALIDATION_FAILED':
        return HttpStatus.BAD_REQUEST;
      case 'RESOURCE_NOT_FOUND':
        return HttpStatus.NOT_FOUND;
      case 'CONFLICT':
      case 'DUPLICATE':
        return HttpStatus.CONFLICT;
      case 'RATE_LIMITED':
        return HttpStatus.TOO_MANY_REQUESTS;
      case 'TIMEOUT':
        return HttpStatus.GATEWAY_TIMEOUT;
      case 'PROVIDER_UNAVAILABLE':
      case 'NETWORK_ERROR':
        return HttpStatus.BAD_GATEWAY;
      case 'UNSUPPORTED_OPERATION':
        return HttpStatus.NOT_IMPLEMENTED;
      case 'UNKNOWN':
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  static fromGenericError(provider: string, err: any): IntegrationError {
    if (err instanceof IntegrationError) return err;

    const message = err?.message || 'An unexpected integration error occurred';
    const status = err?.status || err?.statusCode || 500;

    let category: IntegrationErrorCategory = 'UNKNOWN';
    if (status === 401) category = 'AUTHENTICATION_FAILED';
    else if (status === 403) category = 'AUTHORIZATION_FAILED';
    else if (status === 404) category = 'RESOURCE_NOT_FOUND';
    else if (status === 409) category = 'CONFLICT';
    else if (status === 429) category = 'RATE_LIMITED';
    else if (status === 504 || err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') category = 'TIMEOUT';
    else if (status >= 500) category = 'PROVIDER_UNAVAILABLE';
    else if (status >= 400 && status < 500) category = 'VALIDATION_FAILED';

    return new IntegrationError({
      category,
      provider,
      message,
      providerStatusCode: status,
      details: { originalName: err?.name, code: err?.code },
    });
  }
}
