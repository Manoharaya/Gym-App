# Platform Health Architecture & Dependency Probes

## Probe Separation
The health system separates health checks into three tiers:
1. **Liveness**: `/health/live` — Verifies HTTP server is responding.
2. **Readiness**: `/health/ready` — Verifies PostgreSQL and Redis can service queries.
3. **Dependency Health**: Comprehensive subsystem evaluation across internal and third-party components.

## Monitored Subsystems
- `API_GATEWAY`: Gateway latency and request queue depth.
- `DATABASE_POSTGRESQL`: Active connections, query response time.
- `CACHE_REDIS`: Cache latency, cluster connectivity, memory consumption.
- `BACKGROUND_WORKERS`: BullMQ/Redis worker job processing and dead-letter queues.
- `AI_PROVIDERS_GATEWAY`: OpenAI, Anthropic, Google API connectivity.
- `COMMUNICATION_CHANNELS`: Twilio SMS, WhatsApp, Sendgrid, APNs push.
- `PAYMENT_PROCESSORS`: Stripe webhook and intent processing status.
- `ACCOUNTING_GATEWAY`: Xero and QuickBooks sync adapters.
- `WEARABLE_PROVIDERS`: Apple Health and Health Connect connectors.
- `DEVELOPER_WEBHOOKS`: Outbound developer webhook dispatchers.

## Status Levels
- **HEALTHY**: Operating within normal latency and zero error spikes.
- **DEGRADED**: Elevated latency or transient retryable failures.
- **WARNING**: One or more non-critical providers experiencing partial outages.
- **DOWN**: Core dependencies (DB, Cache) unreachable.
- **UNKNOWN**: Health signal stale or unverified.
