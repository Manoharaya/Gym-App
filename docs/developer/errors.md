# FitCore API Error Handling & Codes

## 1. Error Response Envelope
All FitCore API errors return a standard JSON envelope with HTTP status codes in the 4xx/5xx range:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_SCOPE",
    "message": "Missing required scope: members:read",
    "details": {
      "requiredScopes": ["members:read"],
      "grantedScopes": ["classes:read"]
    }
  },
  "requestId": "req_1726054890_839201"
}
```

## 2. Standard Error Codes Catalog

| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `UNAUTHENTICATED` | 401 | Missing or invalid API key or Bearer token |
| `INVALID_API_KEY` | 401 | The API key is malformed, unrecognized, or corrupted |
| `KEY_EXPIRED` | 401 | The API key has passed its expiration timestamp |
| `KEY_REVOKED` | 401 | The API key was revoked and cannot be used |
| `INSUFFICIENT_SCOPE` | 403 | The API key or token lacks required scopes for the endpoint |
| `RESOURCE_FORBIDDEN` | 403 | The application or entity is inactive, suspended, or prohibited |
| `NOT_FOUND` | 404 | The requested gym resource (member, class, booking) does not exist |
| `CONFLICT` | 409 | Conflicting resource state (e.g. email or code already registered) |
| `IDEMPOTENCY_CONFLICT`| 409 | Concurrent request with same Idempotency-Key already processing |
| `VALIDATION_ERROR` | 400 | Request body failed DTO structural or semantic validation |
| `INVALID_GRANT` | 400 | Expired or already consumed OAuth authorization code |
| `INVALID_REDIRECT_URI` | 400 | OAuth callback does not match registered redirect URIs |
| `SSRF_ATTEMPT_DETECTED`| 400 | Webhook URL targets private IP or loopback address |
| `RATE_LIMITED` | 429 | Sliding-window request threshold exceeded |
| `INTERNAL_ERROR` | 500 | Unhandled server error. Traceable via `requestId` |
| `SERVICE_UNAVAILABLE` | 503 | Upstream database or cache maintenance in progress |
