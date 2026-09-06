import { FitCoreApiClient } from '@fitcore/api-client';
import { HTTP_HEADERS } from '@fitcore/constants';

describe('FitCoreApiClient & Multi-Tenant Header Injection', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('automatically injects tenant context and request ID headers into outgoing requests', async () => {
    let capturedHeaders: Record<string, string> = {};

    global.fetch = jest.fn().mockImplementation((_url, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { status: 'healthy' } }),
      });
    });

    const client = new FitCoreApiClient({
      baseUrl: 'https://api.fitcore.io/v1',
      getAuthToken: () => 'mock_access_token_xyz',
      getTenantContext: () => ({
        organisationId: 'org_test_123',
        outletId: 'outlet_test_456',
      }),
    });

    const response = await client.get<{ status: string }>('/health');

    expect(response.data.status).toBe('healthy');
    expect(capturedHeaders[HTTP_HEADERS.ORGANISATION_ID]).toBe('org_test_123');
    expect(capturedHeaders[HTTP_HEADERS.OUTLET_ID]).toBe('outlet_test_456');
    expect(capturedHeaders[HTTP_HEADERS.AUTHORIZATION]).toBe('Bearer mock_access_token_xyz');
    expect(capturedHeaders[HTTP_HEADERS.REQUEST_ID]).toMatch(/^req_\d+_/);
  });
});
