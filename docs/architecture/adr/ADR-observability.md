# ADR-056: Centralized Observability, Platform Health & Fail-Open Telemetry Architecture

## Status
Accepted

## Context
FitCore operates as a mission-critical multi-tenant gym management cloud powering real-time gym operations: member access control turns, point-of-sale transactions, scheduled bookings, workout streaming, and background communications. Prior to Day 56, health monitoring was decentralized across disparate components. As platform scale and enterprise demands grow, engineering and platform operators require real-time visibility into system health, API latency percentiles, queue backlogs, external provider degradations, and operational incidents.

However, strict operational constraints govern this telemetry tier:
1. **Fail-Open Resilience**: Any failure in the logging pipeline, trace exporters, or metric buffers must never impede or degrade core gym business transactions (e.g. member door access, class bookings, or invoice payments).
2. **Zero Sensitive PII & Credential Leakage**: Medical PAR-Q answers, authentication tokens, payment card data, passwords, and user credentials must never be written to logs or telemetry payloads.
3. **Multi-Tenant Scoping & Zero Duplicate Business Truth**: Observability must observe without mutating or duplicating existing billing records, security audit trails, or usage meters. Platform superadmins require global cross-tenant visibility, whereas tenant admins receive isolated operational summaries and members/trainers receive zero infrastructure telemetry.

## Decisions

### 1. Unified Telemetry Pipeline (Logs, Metrics, Traces, Probes)
We implement a four-pillar observability framework in `@fitcore/api` under `src/observability/`:
- **Structured JSON Logging & Recursive Redaction (`LogRedactionService`, `StructuredLoggerService`)**: Standardized log format with severity levels, component tags, correlation IDs (`traceId`, `spanId`), and recursive deep sanitization against high-risk credential and PII regex patterns.
- **W3C Distributed Tracing (`TraceContextService`)**: Propagation of `traceparent` (`00-{traceId}-{spanId}-{flags}`) adhering to W3C standards across distributed API requests and background worker job invocations.
- **Bounded Metric Aggregation (`MetricRegistryService`)**: In-memory ring-buffer reservoir metrics providing exact counters, gauges, and statistical P50/P95/P99 latency calculations bounded to 1,000 samples per metric to prevent memory exhaustion.
- **Multi-Tier Health Probes (`ObservabilityHealthService`)**: Independent multi-stage probes covering Core (`API`, `DATABASE_POSTGRESQL`, `CACHE_REDIS`), Storage (`S3_OBJECT_STORAGE`), Workers (`BACKGROUND_WORKERS`), AI (`AI_PROVIDERS_GATEWAY`), Payments (`PAYMENT_GATEWAYS`), Communications (`COMMUNICATION_CHANNELS`), and Accounting (`ACCOUNTING_INTEGRATIONS`).

### 2. Deterministic Alert Engine & Deduplication
Alert rules (`ObservabilityAlertRule`) evaluate metric thresholds with configurable evaluation windows and cooldown periods. Firing alerts compute a SHA-256 fingerprint from `ruleId + service + severity + tenantId` to eliminate alert storms and deduplicate identical active alerts until resolved or acknowledged.

### 3. Operational Incident Management & Release Correlation
Platform operators can declare, progress, and resolve operational incidents (`ObservabilityIncident`) linked to active alerts. Each transition emits an immutable audit event (`ObservabilityIncidentEvent`). Releases are recorded (`ObservabilityDeployment`) with git commit, deployer, and changelog references to correlate anomalies directly with code deployments.

### 4. Strict RBAC & Tenant Defense
Access to `/api/v1/observability/*` routes is restricted to authenticated users with `Role.SUPERADMIN`. Public endpoints are strictly limited to unauthenticated container orchestrator health checks (`/api/v1/observability/health/live` and `/api/v1/observability/health/ready`). Regular gym organisation owners and staff are forbidden from viewing global infrastructure telemetry.

## Consequences

### Positive
- Unified, real-time platform health visibility across all 7 critical infrastructure and provider tiers.
- Rapid incident detection and mean-time-to-resolution (MTTR) with deterministic deduplicated alerts and release correlation.
- Absolute compliance with privacy and PCI standards via automated recursive redaction of credentials and medical data.
- Zero risk of telemetry pipelines causing gym operational downtime due to fail-open architecture.

### Negative / Trade-Offs
- In-memory metrics reservoir maintains a rolling window of recent samples rather than persistent multi-month time-series storage; long-term analytical metrics should be periodically flushed to cold storage (e.g. Prometheus/OpenTelemetry collector).
