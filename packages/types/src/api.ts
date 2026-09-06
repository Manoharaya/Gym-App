/**
 * FitCore API Types & Response Contracts
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
  requestId?: string;
  timestamp?: string;
}

export interface ApiPaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  pagination: ApiPaginationMeta;
  message?: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | Array<unknown>;
    timestamp: string;
    path?: string;
  };
  requestId?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  skipTenantHeaders?: boolean;
}
