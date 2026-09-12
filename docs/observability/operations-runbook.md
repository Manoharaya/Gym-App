# Platform Operations Runbook

## Rapid Response Procedures

### Runbook 1: High API Latency Alert (p95 > 250ms)
1. **Inspect Metrics Explorer**: Check `http.server.duration` and identify affected route pattern.
2. **Examine Database Pool**: Check `db.connection.active` and `db.query.duration`.
3. **Correlate Deployments**: Query recent releases via `GET /api/v1/observability/deployments`.
4. **Action**:
   - If release related: Initiate immediate canary rollback.
   - If database lock contention: Kill long-running unindexed queries.

---

### Runbook 2: Background Queue Backlog (> 1,000 jobs)
1. **Check Queue Telemetry**: Query `GET /api/v1/observability/queues`.
2. **Inspect Failed Jobs**: Review error breakdown in Dead Letter Queue (DLQ).
3. **Action**:
   - Scale worker replicas if concurrency exhausted.
   - Replay DLQ jobs post-fix via management CLI.

---

### Runbook 3: External Provider Outage (Stripe / Twilio)
1. **Declare Operational Incident**: Call `POST /api/v1/observability/incidents` with severity `HIGH`.
2. **Enable Provider Fallback**: Switch active provider or buffer webhooks.
3. **Status Page Update**: Broadcast degradation to affected organisations.
4. **Post-Resolution**: Transition incident to `RESOLVED` and file mitigation notes.
