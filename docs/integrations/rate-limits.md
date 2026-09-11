# Integration Rate Limiting & Throttling

## Overview
Every external provider imposes strict rate quotas (e.g. Stripe allows 100 req/sec in live mode, Xero allows 60 req/min and 5000 req/day per tenant, Twilio limits message concurrency). FitCore's Integration Platform proactively enforces sliding-window rate tracking and honors upstream throttling headers.

---

## Architecture

```text
Outgoing Request
       ↓
Check Rate Limit (Redis / Memory Sliding Window)
       ├─ Quota OK ───────────→ Execute Provider Request
       └─ Quota Exceeded ─────→ Throw ThrottlingException (with Retry-After)
                                      ↓
                                Exponential Backoff / Queue Delay
```

---

## Sliding Window Implementation

Rate limits are tracked per key:
`ratelimit:{provider}:{connectionId}:{operation}`

Each window stores Unix timestamps in Redis sorted sets (`ZADD` / `ZREMRANGEBYSCORE`).
When Redis is temporarily unavailable, an in-memory sliding window fallback maintains safety.

### Rate Limits by Provider Tier

| Provider | Window | Default Limit | Burst Allowance | Action on Exceeded |
|----------|--------|---------------|-----------------|--------------------|
| Stripe | 1s | 100 requests | 20 | Pause queue & retry |
| Xero | 60s | 60 requests | 5 | Queue job delay |
| QuickBooks | 60s | 500 requests | 10 | Job throttle |
| Twilio | 1s | 30 requests | 10 | Message rate backoff |
| Google Calendar | 60s | 250 requests | 20 | Batch query pacing |
| Kisi / Salto | 1s | 10 requests | 2 | Hardware queue deferral |

---

## HTTP 429 Handling

When an upstream provider responds with HTTP 429:
1. Parse the `Retry-After` header (seconds or RFC 1123 HTTP date).
2. If absent, fallback to exponential backoff ceiling.
3. Update rate-limiter reset timestamp for this connection.
4. Yield or delay downstream worker execution.
