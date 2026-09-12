# Performance Architecture & Request Flow — Day 57

## 1. Authoritative Request Path

```text
CLIENT (Mobile App / Turnstile / Web)
  │
  ├──► [API Gateway / Rate Limiter] (Redis-backed token bucket, < 2ms)
  │
  ├──► [Authentication & Tenant Context] (JWT verify, < 3ms)
  │
  ├──► [Fast Cache Lookup] (Redis / Memory, < 2ms)
  │      └── Cache HIT: Returns cached immutable entity
  │
  ├──► [Service Execution]
  │      ├── Booking: Acquires PostgreSQL Row Lock (`FOR UPDATE`)
  │      ├── Access: Evaluates Policy & Membership (< 15ms)
  │      └── Analytics: Executes Indexed Projection
  │
  └──► [Telemetry Emission] (Fail-open, < 1ms)
```

## 2. Database Connection Architecture
- Connection Pool: Prisma client configured with 24 active / 100 max connections.
- Query Timeout: 10,000 ms global statement timeout.
- Slow Query Logging: Automatically captured for statements exceeding 250 ms.

## 3. Backpressure & Queue Control
- Exponential backoff with random jitter on external provider retries.
- Workers poll queues with bounded concurrency (4 threads per worker pod).
- Telemetry buffer overflow drops metrics rather than blocking business workflows.
