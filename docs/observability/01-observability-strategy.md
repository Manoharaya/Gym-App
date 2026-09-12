# 01 — Observability Strategy

## Mission & Purpose
FitCore's Observability Platform delivers end-to-end visibility into all operational dimensions of the multi-tenant fitness cloud. Designed to support high-throughput operations across gyms globally, the observability architecture guarantees that platform operators can detect, diagnose, and resolve degradations before they impact gym members or staff.

## Core Tenets

### 1. Fail-Open Telemetry
Telemetry collection must never impede business execution. If the telemetry pipeline encounters errors, memory saturation, or network partitioning, the system fails open:
- Core operations (member door access, class bookings, POS checkouts, card payments) continue without interruption.
- Logging, metric, or trace emission degrades gracefully with internal warnings.

### 2. Zero Sensitive PII & Credential Leakage
Observability channels are protected against data contamination:
- Passwords, authorization headers, Bearer tokens, MFA secrets, and payment credentials are automatically stripped or masked.
- Member health and PAR-Q questionnaire responses are redacted at the logging boundary.

### 3. Separation of Concerns
The observability system observes business domains without becoming the system of record for them:
- Telemetry does not duplicate SaaS usage metering (Day 55).
- Telemetry does not duplicate security audit trails (Day 52).
- Telemetry does not mutate gym operational state.

### 4. Deterministic Noise Reduction
- High-cardinality metrics are bounded to prevent resource exhaustion.
- Alert rules calculate deterministic fingerprints (SHA-256) to eliminate duplicate notifications during cascade failures.
- Cooldown windows prevent notification thrashing.

### 5. Multi-Tenant Scoping
- Global platform telemetry is reserved for Superadmins (`Role.SUPERADMIN`).
- Tenant operators receive isolated status summaries for their own organisation only.
- Unauthenticated access is strictly confined to standard orchestrator probes (`/health/live`, `/health/ready`).
