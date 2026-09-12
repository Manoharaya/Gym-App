# 19 — Compliance & Log Retention

## Data Retention Guidelines
Observability logs and telemetry data are subject to strict compliance lifecycles:

| Data Type | Active Storage (Hot) | Cold Archive | Disposal Policy |
|:---|:---|:---|:---|
| **Debug & Trace Logs** | 14 Days | 30 Days | Cryptographically shredded |
| **Operational Health Logs** | 30 Days | 90 Days | Compressed S3 glacier |
| **Security & Audit Logs** | 90 Days | 7 Years | Immutable WORM storage |
| **SLO / SLI Historical Metrics** | 90 Days | 3 Years | Aggregated rolling averages |
| **Incident Reports** | 1 Year | Permanent | Internal compliance archive |

## GDPR & Privacy Invariants
Because `LogRedactionService` scrubs personal identifying information and sensitive credentials prior to log persistence, telemetry stores are protected against GDPR Right to Erasure cascade requirements.
