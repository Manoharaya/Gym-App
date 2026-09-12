# Usage Metering & Source Aggregation

Authoritative, idempotent metering across platform domains.

## Reliable Meter Sources
1. **AI Usage**: `AIUsageRecord` from Day 19 tracks inputTokens, outputTokens, and latency.
2. **Communications**: `Communication` from Day 28 tracks SMS, Email, and WhatsApp channel messages.
3. **Voice Sessions**: `VoiceSession` from Day 34 tracks completed receptionist call duration seconds.
4. **Developer APIs**: `DeveloperApiUsage` from Day 49 tracks public API requests.

## Idempotency Protocol
Every raw usage event ingested via `POST /api/v1/saas-billing/usage/events` requires a unique `idempotencyKey` formatted deterministically:
`{organisationId}:{meterKey}:{sourceReferenceId}`.
Replayed events return `{ duplicate: true }` without incrementing billable aggregates.
