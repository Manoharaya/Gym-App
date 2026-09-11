# Integration Health & Availability Monitoring

## Overview
External APIs degrade, suffer outage windows, or revoke OAuth tokens. FitCore's Integration Health Subsystem proactively tracks connection vitality, measures round-trip latency, records consecutive failure spikes, and automatically transitions connection states (`HEALTHY` → `DEGRADED` → `UNHEALTHY`).

---

## Health Status State Machine

```text
[HEALTHY] ──(1-2 operation failures)──→ [DEGRADED] ──(>=3 consecutive failures)──→ [UNHEALTHY]
    ▲                                         │                                            │
    │                                         │                                            │
    └──────────────────(Successful Operation or Health Ping)───────────────────────────────┘
```

* **HEALTHY**: Connection credentials are valid, upstream endpoints respond within SLA (<1500ms), error rate is 0%.
* **DEGRADED**: Sporadic transient errors encountered (1-2 consecutive failures) or high latency detected (>2000ms). System continues attempting operations with backoff.
* **UNHEALTHY**: 3+ consecutive failures, expired refresh tokens, or repeated upstream HTTP 401/403/500 errors. Automatic sync jobs are suspended to prevent rate-limit bans or hammering degraded external systems.
* **UNKNOWN**: Newly provisioned connection awaiting initial operation or background ping.

---

## Proactive vs Passive Health Tracking

1. **Passive Health Updates**:
   - Every API invocation through the adapter calls `recordSuccess()` or `recordFailure()`.
   - Failure increments `failureCount` and `consecutiveFailures`.
   - Success resets `consecutiveFailures` to 0 and restores `HEALTHY` status.

2. **Active Diagnostic Checks (`POST /api/v1/integrations/connections/:id/health-check`)**:
   - Adapter executes a lightweight ping (e.g. `GET /userinfo`, `GET /v1/account`, or pinging controller status).
   - Measures exact round-trip response latency.
   - Generates actionable diagnostics strings (e.g. `"Token expired, refresh required"`, `"Upstream API latency 1850ms"`).
