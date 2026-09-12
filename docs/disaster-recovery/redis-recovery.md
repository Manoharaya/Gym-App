# Redis & Queue Recovery Guide

## 1. Redis Dataset Classification

| Dataset | Nature | Persistence Requirement | Recovery Strategy |
| :--- | :--- | :--- | :--- |
| **BullMQ Jobs** | Authoritative | AOF (everysec) + RDB snapshots (hourly) | Reload latest RDB/AOF. Jobs resume with idempotency. |
| **Active Locks (Redlock)** | Ephemeral | Disposable | TTL expiration (max 30s). Re-acquired on demand. |
| **Rate Limit Counters** | Ephemeral | Disposable | Reset to zero upon restore. No business impact. |
| **Turnstile Fast Cache** | Reconstructable | Disposable | Lazy cache warm-up or pre-warm on container start. |

---

## 2. Queue Backpressure & Poison Pill Recovery

1. **Dead-Letter Queue (DLQ) Drain**:
   - Jobs that fail max attempts (3 retries) are routed to DLQ (`{queue}:failed`).
   - Post-disaster, workers do not blindly retry all failed jobs.
   - Operators inspect payloads using `QueueTelemetryService` to purge structural errors ("poison pills") before re-enqueuing.
2. **Backpressure Throttling**:
   - When queue depth exceeds 5,000 jobs post-restore, worker concurrency scales up while API ingress temporarily throttles non-urgent background triggers.
