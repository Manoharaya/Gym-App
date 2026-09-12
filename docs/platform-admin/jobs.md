# Background Job Processing & Worker Queue Monitoring

## Worker Subsystems
Background workers execute asynchronous workloads across:
- **AI Processing**: Coach chat, prompt embeddings, daily check-in evaluations.
- **Communications**: Batch SMS, email digests, push notification dispatches.
- **Accounting Sync**: Nightly invoice syncing to Xero and QuickBooks.
- **Wearables Sync**: Biometric ingest from Apple Health and Health Connect.
- **Privacy Operations**: Data export archive generation, automated retention sweeps.
- **Billing**: Recurring membership renewals and dunning cycles.
- **Retention & Engagement**: Member inactivity detection, automated outreach.
- **Developer Webhooks**: Outbound event delivery with exponential backoff.

## Queue Telemetry
Operators monitor:
- Active vs Pending vs Delayed counts.
- Failed job rate.
- Dead-letter queue accumulation.
- Average processing duration and worker saturation.
