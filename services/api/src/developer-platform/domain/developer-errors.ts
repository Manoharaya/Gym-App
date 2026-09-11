/**
 * FitCore — Day 49: Developer Platform Standard Errors
 */

import { HttpException, HttpStatus } from '@nestjs/common';

export type DeveloperErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHENTICATED'
  | 'INVALID_API_KEY'
  | 'KEY_EXPIRED'
  | 'KEY_REVOKED'
  | 'INSUFFICIENT_SCOPE'
  | 'RESOURCE_FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'PROVIDER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'INVALID_REDIRECT_URI'
  | 'INVALID_GRANT'
  | 'UNAUTHORIZED_CLIENT'
  | 'UNSUPPORTED_GRANT_TYPE'
  | 'INVALID_CLIENT'
  | 'SSRF_ATTEMPT_DETECTED';

export class DeveloperError extends HttpException {
  readonly code: DeveloperErrorCode;
  readonly meta?: Record<string, any>;

  constructor(
    code: DeveloperErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    meta?: Record<string, any>,
  ) {
    super(
      {
        code,
        message,
        error: {
          code,
          message,
        },
        meta: {
          timestamp: new Date().toISOString(),
          ...meta,
        },
      },
      status,
    );
    this.code = code;
    this.meta = meta;
  }

  static unauthenticated(message = 'Missing or invalid API credentials'): DeveloperError {
    return new DeveloperError('UNAUTHENTICATED', message, HttpStatus.UNAUTHORIZED);
  }

  static invalidApiKey(message = 'Invalid API key or key hash mismatch'): DeveloperError {
    return new DeveloperError('INVALID_API_KEY', message, HttpStatus.UNAUTHORIZED);
  }

  static keyRevoked(message = 'The provided API key has been revoked'): DeveloperError {
    return new DeveloperError('KEY_REVOKED', message, HttpStatus.UNAUTHORIZED);
  }

  static keyExpired(message = 'The provided API key has expired'): DeveloperError {
    return new DeveloperError('KEY_EXPIRED', message, HttpStatus.UNAUTHORIZED);
  }

  static insufficientScope(requiredScopes: string[], grantedScopes: string[]): DeveloperError {
    return new DeveloperError(
      'INSUFFICIENT_SCOPE',
      `Application requires scope(s): ${requiredScopes.join(', ')}. Granted: ${grantedScopes.join(', ')}`,
      HttpStatus.FORBIDDEN,
      { requiredScopes, grantedScopes },
    );
  }

  static resourceForbidden(message = 'Access to the requested resource is denied'): DeveloperError {
    return new DeveloperError('RESOURCE_FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }

  static rateLimited(retryAfterSeconds: number): DeveloperError {
    return new DeveloperError(
      'RATE_LIMITED',
      `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`,
      HttpStatus.TOO_MANY_REQUESTS,
      { retryAfterSeconds },
    );
  }

  static notFound(resource: string, id?: string): DeveloperError {
    return new DeveloperError(
      'NOT_FOUND',
      `${resource}${id ? ` with ID ${id}` : ''} not found`,
      HttpStatus.NOT_FOUND,
    );
  }

  static ssrfBlocked(url: string): DeveloperError {
    return new DeveloperError(
      'SSRF_ATTEMPT_DETECTED',
      'The destination URL targets a private IP, loopback, or unauthorized network resource.',
      HttpStatus.BAD_REQUEST,
      { blockedUrl: url },
    );
  }
}
