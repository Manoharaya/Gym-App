# 08 — Incident Management

## Incident Lifecycle
FitCore manages operational incidents through formal status transitions:

```text
[OPEN] ──► [INVESTIGATING] ──► [MITIGATED] ──► [RESOLVED] ──► [CLOSED]
```

## Schema & Audit Trail
- **`ObservabilityIncident`**: Core incident entity tracking `incidentNumber` (`INC-2026-XXXX`), `severity`, `status`, `affectedServices`, `detectedAt`, `mitigatedAt`, `resolvedAt`, and `mitigationNotes`.
- **`ObservabilityIncidentEvent`**: Append-only event log recording every state transition, operator note, or diagnostic update with `actorUserId` and timestamps.
- **Linked Alerts**: Active alerts can be linked to an incident, automatically setting their status to `INVESTIGATING`.

## Incident Severity Matrix
- **CRITICAL**: Outage affecting member physical access, payment checkouts, or complete API downtime. Page on-call immediately.
- **HIGH**: Degradation in background workers, AI gateway timeouts, or external provider webhooks. Response target: < 15 mins.
- **MEDIUM**: Non-blocking feature failure (e.g. analytics report delay). Response target: < 1 hour.
- **LOW**: Minor cosmetic or latency anomaly within acceptable SLO margins.
