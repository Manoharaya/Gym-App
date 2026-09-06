# FitCore API Versioning & Response Contract Standards

## Versioning Strategy

All FitCore backend API routes are prefixed by URI versioning:

```text
/api/v1/<resource>
```

- System health and container liveness probes are excluded from version prefixes (`/health`, `/health/live`, `/health/ready`) to support standard Kubernetes/orchestrator health probes.
- Interactive OpenAPI documentation is hosted at `/api/docs`.

---

## Response Envelope Contract

The backend and frontend clients (`@fitcore/mobile`, `@fitcore/api-client`, `@fitcore/types`) adhere to a strict envelope structure.

### 1. Success Envelope (`ApiResponse<T>`)
```json
{
  "success": true,
  "data": {
    "id": "org_dev_secondwind_001",
    "name": "Second Wind Athletic Club",
    "slug": "second-wind"
  },
  "requestId": "f83b1602-a89c-4ec1-91a6-b51f04eb202a"
}
```

### 2. Error Envelope (`ApiErrorResponse`)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Cross-tenant access forbidden: User cannot access organisation org_dev_apex_002",
    "details": null
  },
  "requestId": "f83b1602-a89c-4ec1-91a6-b51f04eb202a"
}
```

### 3. Correlation Tracking
Every response includes the `x-request-id` header matching the `requestId` in the JSON body, enabling distributed trace correlation across mobile clients, backend logs, and audit trails.
