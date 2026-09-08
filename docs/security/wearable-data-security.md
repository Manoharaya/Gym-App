# Wearable Data Security & Privacy Controls

## Security Model Overview
Wearable health telemetry constitutes sensitive personal biometric data. FitCore implements multiple defense-in-depth security layers to ensure data privacy, confidentiality, and integrity.

## 1. Day 4 Compliance & Consent Enforcement
- Connecting any wearable platform or processing wearable sync batches strictly requires an active, accepted `WEARABLE_DATA` consent record (`ConsentRecord.status === 'CONSENTED'`).
- If consent is withdrawn or declined, connections are marked `REVOKED` and sync endpoints reject requests with `403 Forbidden`.

## 2. AES-256-GCM Token Encryption (`TokenEncryptionService`)
- All OAuth access tokens, refresh tokens, and raw debug payloads are encrypted at rest using AES-256-GCM authenticated encryption.
- A cryptographically secure 16-byte initialization vector (IV) is uniquely generated per token.
- Format: `iv_hex:auth_tag_hex:ciphertext_hex`.
- Tampered ciphertext or invalidated tags cause decryption to throw immediately.
- Tokens are never exposed in plaintext across database queries, application logs, or REST API payloads.

## 3. Scoped Trainer Visibility
- Gym staff and trainers have **zero access to raw sensor telemetry**, second-by-second timestamps, continuous heart rate streams, or GPS routes.
- Personal trainers assigned to a member via `TrainerClientAssignment` can view only high-level activity summaries (e.g. daily step count, weekly workouts, average resting heart rate).
- Unassigned staff querying a member's wearable data receive `403 Forbidden`.

## 4. Multi-Tenant Isolation & IDOR Protection
- All queries and mutations validate both `memberId` and `organisationId`.
- Connection IDs and health record IDs belonging to Member A in Organization A cannot be accessed or manipulated by Member B in Organization B.

## 5. Rate Limiting & Cooldown Protection
- `WearableRateLimiterService` enforces provider-specific sliding-window rate limits (e.g. Fitbit 150 requests/hour).
- Outgoing requests respect HTTP 429 `Retry-After` headers and maintain backoff cooldowns to protect member credentials from being locked out.

## 6. Self-Service Data Deletion (Day 49 Privacy Centre Foundation)
- Members retain the right to delete all wearable health data at any time via `DELETE /api/v1/wearables/data`.
- Supports single-connection removal, provider purge, and full member data deletion.
