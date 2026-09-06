import { ERROR_CODES, type ErrorCode } from '@fitcore/constants';

export class ApiError extends Error {
  public readonly code: ErrorCode | string;
  public readonly status: number;
  public readonly details?: unknown;
  public readonly requestId?: string;

  constructor(
    message: string,
    code: ErrorCode | string = ERROR_CODES.UNKNOWN_ERROR,
    status = 500,
    details?: unknown,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NetworkError extends ApiError {
  constructor(
    message = 'Network connection unavailable. Please check your internet connection.',
    requestId?: string
  ) {
    super(message, ERROR_CODES.NETWORK_UNAVAILABLE, 0, undefined, requestId);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required. Please log in again.', requestId?: string) {
    super(message, ERROR_CODES.AUTH_UNAUTHORIZED, 401, undefined, requestId);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = 'You do not have permission to access this resource.', requestId?: string) {
    super(message, ERROR_CODES.FORBIDDEN, 403, undefined, requestId);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'The submitted data was invalid.', details?: unknown, requestId?: string) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 422, details, requestId);
    this.name = 'ValidationError';
  }
}

export class ServerError extends ApiError {
  constructor(
    message = 'Internal server error occurred. Please try again later.',
    requestId?: string
  ) {
    super(message, ERROR_CODES.SERVER_ERROR, 500, undefined, requestId);
    this.name = 'ServerError';
  }
}

export class UnknownError extends ApiError {
  constructor(message = 'An unexpected error occurred.', details?: unknown, requestId?: string) {
    super(message, ERROR_CODES.UNKNOWN_ERROR, 500, details, requestId);
    this.name = 'UnknownError';
  }
}
