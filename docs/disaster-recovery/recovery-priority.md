# Recovery Priority Matrix

When responding to an incident involving multi-system failure, restoration must proceed according to strict business criticality tiers to ensure financial, physical safety, and compliance invariants are preserved.

| Tier | Subsystem | Max Acceptable Downtime | Recovery Method | Validation Gate |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 0** | **PostgreSQL Primary** | 60 minutes | Restore encrypted backup + replay WAL archives | `DataIntegrityValidatorService` zero foreign-key errors |
| **Tier 0** | **Physical Turnstile Access** | 15 minutes | Local offline credential cache & fast policy fallback | Turnstile reader response `< 50ms`, fail-secure check |
| **Tier 0** | **Payment Transactions** | 60 minutes | Restore DB + run idempotency reconciliation | Zero duplicate charges, provider reference reconciliation |
| **Tier 0** | **Class Bookings & Capacity** | 30 minutes | Restore DB + verify row-level locks | Zero sessions with confirmed bookings exceeding capacity |
| **Tier 1** | **BullMQ Queues & Workers** | 30 minutes | Redis snapshot reload + background worker restart | `QueueTelemetryService` zero dead-letter accumulation |
| **Tier 1** | **SaaS Billing & Subscriptions** | 60 minutes | Restore DB + subscription quota validation | Active organisations have positive limits & valid plans |
| **Tier 1** | **AI Gateway Telemetry** | 15 minutes | Fallback to static templates + circuit breaker probe | Zero raw prompt or PII leakage in observability |
| **Tier 2** | **External Accounting Outbox** | 120 minutes | Defer sync; store in FitCore DB outbox | Idempotent ledger replay via transaction ID matching |
| **Tier 2** | **Object Storage (Media/Docs)**| 120 minutes | S3 cross-region sync + version restore | Signed URL verification & checksum checks |
| **Tier 3** | **Non-Critical Telemetry** | 240 minutes | In-memory ring buffer lazy hydration | Prometheus / metric catalog ping |
