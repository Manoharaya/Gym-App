# Webhook Replay & Ingestion Recovery Guide

## 1. Missed Inbound Webhooks (Stripe, Twilio, GoCardless)
During an API outage, external webhook delivery attempts fail or buffer at provider edge servers.

1. **Provider Automatic Retries**:
   - Stripe retries webhooks for up to 72 hours with exponential backoff.
2. **Deterministic Deduplication**:
   - All inbound webhooks are recorded in `payment_webhook_events` keyed on `providerEventId` with a unique database constraint.
   - Replayed webhooks that were already processed are immediately acknowledged (`HTTP 200`) without re-running business logic.
3. **Manual Gateway Event Reconciliation**:
   - If webhook loss is suspected, operators invoke gateway polling to sync event logs from `created_gte = [outage_start_timestamp]`.
