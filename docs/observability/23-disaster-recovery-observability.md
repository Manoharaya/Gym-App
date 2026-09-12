# 23 — Disaster Recovery & Observability

## Disaster Scenarios & Telemetry Signals

### 1. Primary Database Failover
- **Signals**: Spike in database connection errors (`ECONNREFUSED`), readiness probe returns `503`.
- **Automated Procedure**: Multi-AZ standby promotion. API reconnection pool backoff.
- **Verification**: Run live readiness probe until PostgreSQL latency drops below 10ms.

### 2. Redis Cluster Partitioning
- **Signals**: Queue worker processing rate drops to zero, session cache fallbacks triggered.
- **Fail-Open Action**: Application sessions fall back to signed JWT verification with database lookup.

### 3. Provider Outage (e.g. Stripe or Twilio)
- **Signals**: Provider health probe status transitions to `OUTAGE`, webhook signature error rate rises.
- **Action**: Alert triggered, offline fallback mode engaged, outgoing notifications queued with exponential backoff.
