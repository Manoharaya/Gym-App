import { HTTP_HEADERS } from '@fitcore/constants';
import type { ApiResponse, RequestConfig } from '@fitcore/types';
import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  ServerError,
  UnknownError,
  ValidationError,
} from './errors';

export interface ApiClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  getAuthToken?: () => Promise<string | null> | string | null;
  getTenantContext?: () => { organisationId?: string; outletId?: string } | null;
  onRefreshToken?: () => Promise<string | null>;
}

export class FitCoreApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly getAuthToken?: () => Promise<string | null> | string | null;
  private readonly getTenantContext?: () => { organisationId?: string; outletId?: string } | null;
  private readonly onRefreshToken?: () => Promise<string | null>;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.getAuthToken = options.getAuthToken;
    this.getTenantContext = options.getTenantContext;
    this.onRefreshToken = options.onRefreshToken;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async prepareHeaders(
    config?: RequestConfig,
    requestId?: string
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      [HTTP_HEADERS.CONTENT_TYPE]: 'application/json',
      [HTTP_HEADERS.ACCEPT]: 'application/json',
      [HTTP_HEADERS.REQUEST_ID]: requestId ?? this.generateRequestId(),
      ...(config?.headers ?? {}),
    };

    if (!config?.skipTenantHeaders && this.getTenantContext) {
      const tenant = this.getTenantContext();
      if (tenant?.organisationId) {
        headers[HTTP_HEADERS.ORGANISATION_ID] = tenant.organisationId;
      }
      if (tenant?.outletId) {
        headers[HTTP_HEADERS.OUTLET_ID] = tenant.outletId;
      }
    }

    if (!config?.skipAuth && this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) {
        headers[HTTP_HEADERS.AUTHORIZATION] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private normalizeError(error: unknown, status: number, requestId?: string): never {
    if (error instanceof ApiError) {
      throw error;
    }

    if (status === 401) {
      throw new AuthenticationError(undefined, requestId);
    }
    if (status === 403) {
      throw new AuthorizationError(undefined, requestId);
    }
    if (status === 400 || status === 422) {
      const details =
        typeof error === 'object' && error !== null
          ? (error as { details?: unknown }).details
          : undefined;
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Validation failed';
      throw new ValidationError(message, details, requestId);
    }
    if (status >= 500) {
      throw new ServerError(undefined, requestId);
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError(undefined, requestId);
    }

    throw new UnknownError(
      error instanceof Error ? error.message : 'Unexpected error',
      error,
      requestId
    );
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    config?: RequestConfig,
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const headers = await this.prepareHeaders(config, requestId);
    const url = this.buildUrl(path, config?.params);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config?.timeout ?? this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle 401 token refresh once
      if (response.status === 401 && !isRetry && this.onRefreshToken) {
        const refreshedToken = await this.onRefreshToken();
        if (refreshedToken) {
          return this.request<T>(method, path, body, config, true);
        }
      }

      if (!response.ok) {
        let errorData: unknown;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }
        this.normalizeError(errorData, response.status, requestId);
      }

      // 204 No Content
      if (response.status === 204) {
        return { data: {} as T, requestId };
      }

      const json = await response.json();
      return {
        data: (json && 'data' in json ? json.data : json) as T,
        message: json?.message,
        requestId: json?.requestId ?? requestId,
        timestamp: json?.timestamp,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof ApiError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new NetworkError('Request timed out. Please try again.', requestId);
      }
      this.normalizeError(err, 0, requestId);
    }
  }

  public get<T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, config);
  }

  public post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, config);
  }

  public put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body, config);
  }

  public patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body, config);
  }

  public delete<T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, config);
  }
}
