# 09 — Queue Monitoring

## Architecture
Background processing in FitCore is handled via BullMQ backed by Redis. `QueueTelemetryService` provides real-time visibility into queue states.

## Monitored Queues
1. `notifications`: SMS, push, and transactional emails.
2. `billing`: SaaS metering sync, invoice finalization, and payment retries.
3. `ai-jobs`: Long-running workout plan generation and audio transcription.
4. `integrations`: Xero ledger sync, Stripe webhook replays.
5. `audit-events`: Asynchronous security and platform audit logging.

## Monitored Metrics
- **Waiting Jobs**: Count of pending jobs awaiting worker thread allocation.
- **Active Jobs**: Number of jobs currently executing.
- **Completed Jobs (1h)**: Throughput velocity.
- **Failed Jobs (1h)**: Exceptions caught during worker execution.
- **Delayed Jobs**: Scheduled jobs waiting for activation window.
- **Dead Letter Queue (DLQ)**: Jobs that exhausted maximum retry attempts (e.g. 5 attempts with exponential backoff).

## Health Status Calculation
- **HEALTHY**: Waiting < 500, Failed < 10, DLQ = 0.
- **DEGRADED**: Waiting > 500 OR Failed > 10.
- **UNHEALTHY**: Waiting > 2,000 OR DLQ > 5.
