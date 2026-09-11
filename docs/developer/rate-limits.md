# FitCore API Rate Limiting & Quotas

## 1. Sliding-Window Rate Limiting Architecture
FitCore employs high-throughput sliding-window rate limiting to ensure fair platform availability, prevent denial-of-service, and protect core gym tenant operations from traffic spikes.

## 2. Rate Limit Tiers

| Tier | Environment / Plan | Requests / Minute | Burst Allowance |
| :--- | :--- | :--- | :--- |
| **`SANDBOX`** | Development & Testing | 60 req/min | 10 |
| **`STANDARD`** | Standard Third-Party App | 120 req/min | 20 |
| **`PARTNER`** | Certified Ecosystem Partner | 600 req/min | 50 |
| **`ENTERPRISE`**| Enterprise Franchise Multi-tenant | 2,400 req/min | 100 |

## 3. Standard HTTP Headers
Every Public API response contains standard rate limiting headers conforming to IETF draft specifications:

- `X-RateLimit-Limit`: Maximum allowed requests within the current 60-second window.
- `X-RateLimit-Remaining`: Number of requests remaining in the current window.
- `X-RateLimit-Reset`: Number of seconds until the current sliding window resets.

## 4. HTTP 429 Rate Limit Exceeded
When an application exceeds its allotted rate limit, the FitCore API immediately rejects the request with HTTP `429 Too Many Requests`:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 42
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 42

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Please retry in 42 seconds.",
    "details": {
      "retryAfter": 42
    }
  },
  "requestId": "req_1726054890_abc123"
}
```

### Best Practices for Clients:
1. **Honor `Retry-After`**: Never hammer the API with tight retry loops. Sleep for at least the seconds indicated in `Retry-After`.
2. **Exponential Backoff with Jitter**: Implement full jitter exponential backoff on retries.
3. **Cache Static Endpoints**: Cache class timetables and membership plans locally rather than fetching on every user action.
