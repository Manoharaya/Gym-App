# Queue & Background Worker Performance Guide

## 1. Asynchronous Architecture & Queue Topology

FitCore uses **BullMQ** on Redis for background job execution, event-driven decoupling, and asynchronous side-effects.

```
[ NestJS API Gateway ]
        │
        ├── Enqueue Job ──► [ Redis / BullMQ ]
        │                          │
        ▼ (200 OK)                 ├── Job Pop (Worker Pool)
[ HTTP Client ]                    ▼
                           [ FitCore Background Worker ]
                             ├── Payment Webhooks
                             ├── Email / SMS Notifications
                             ├── Metric Telemetry Rollups
                             └── AI Summary Generation
```

---

## 2. Queue Concurrency & Worker Tuning

| Queue Name | Concurrency Limit | Rate Limit / Throttling | Retry Backoff Strategy | Dead-Letter Handling |
| :--- | :--- | :--- | :--- | :--- |
| `payments` | 10 workers / node | 50 req / sec per gateway | Exponential backoff (initial: 2s, factor: 2, max: 5 retries) | Route to DLQ on failure, trigger P1 incident alert |
| `notifications` | 25 workers / node | 100 req / sec (provider limit) | Fixed backoff (10s, max 3 retries) | Route to DLQ, log recipient and failure code |
| `metrics-rollup`| 5 workers / node | Bounded batch execution | Linear backoff (5s, max 3 retries) | Discard non-critical rollups after max retries |
| `ai-processing` | 5 workers / node | 20 RPM per tenant quota | Exponential backoff (initial: 5s, factor: 2, max 3 retries) | Graceful fallback to static template |

---

## 3. Backpressure & Poison Pill Protection

1. **Backpressure Throttling**:
   - If queue depth exceeds 5,000 pending jobs, new non-essential jobs (e.g. non-urgent notifications) are rejected with a 429 backpressure warning or delayed.
2. **Poison Pill Elimination**:
   - Every job payload is validated with Zod/class-validator schemas prior to processing.
   - Unhandled runtime exceptions increment job attempt counters immediately; malformed payloads with structural errors are purged to DLQ rather than endlessly re-attempted.
3. **Queue Health Telemetry**:
   - Monitored continuously via `QueueTelemetryService` exposing `active`, `waiting`, `failed`, and `delayed` counters per queue.
