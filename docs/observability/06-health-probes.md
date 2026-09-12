# 06 — Health Probes

## Multi-Tier Probe Architecture
FitCore segregates health verification into distinct operational tiers executed by `ObservabilityHealthService`:

### 1. Public Container Probes
- **`/api/v1/observability/health/live`**: Kubernetes / ECS liveness probe verifying that the Node process event loop is responsive. Status: `200 OK`.
- **`/api/v1/observability/health/ready`**: Readiness probe executing `SELECT 1` on PostgreSQL and verifying cache readiness. Status: `200 OK` (or `503 Service Unavailable` if core DB is down).

### 2. Multi-Tier Deep Health Probes (`/api/v1/observability/health/overview`)
Secured for platform operators (`Role.SUPERADMIN`), this probe runs diagnostic checks across 7 critical tiers:

| Tier | Subsystems Probed | Diagnostic Check |
|:---|:---|:---|
| **Core** | `API`, `DATABASE_POSTGRESQL`, `CACHE_REDIS` | SQL ping, Redis ping, event loop latency |
| **Storage** | `S3_OBJECT_STORAGE` | S3 bucket reachability & permission check |
| **Workers** | `BACKGROUND_WORKERS` | BullMQ worker ping and job concurrency check |
| **AI** | `AI_PROVIDERS_GATEWAY` | OpenAI, Anthropic endpoint latency check |
| **Payments** | `PAYMENT_GATEWAYS` | Stripe API ping & webhook endpoint validation |
| **Communications** | `COMMUNICATION_CHANNELS` | Twilio SMS/Voice, Sendgrid email gateway ping |
| **Accounting** | `ACCOUNTING_INTEGRATIONS` | Xero API connectivity & token validity check |
