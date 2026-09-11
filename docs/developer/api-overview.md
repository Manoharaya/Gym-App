# FitCore Developer Platform — API Overview

## Introduction
The **FitCore API & Developer Platform** enables authorized third-party developers, integration partners, agencies, and future marketplace extensions (Day 50) to securely build on FitCore’s core fitness and gym management engine.

FitCore adheres strictly to a clean separation of concerns:
```text
DEVELOPER APP → API GATEWAY → AUTH / SCOPE VALIDATION → RATE LIMIT → FITCORE DOMAIN SERVICE → USAGE / AUDIT
```

---

## Key Capabilities

1. **Versioned Public APIs (`/api/v1/public/*`)**:
   - Safe, high-value endpoints for Members, Classes, Bookings, Memberships, Trainers, and Attendance.
   - Strict data privacy boundaries (e.g. `GET /members` explicitly omits PAR-Q, medical history, and wearable health telemetry).
   - Direct integration with authoritative FitCore domain services (no shadow scheduling or booking logic).

2. **API Keys Authentication**:
   - Distinct prefixes for environments (`fc_live_...` for Production, `fc_test_...` for Sandbox).
   - Only secure SHA-256 hashes are persisted at rest. Plaintext keys are shown only once upon creation.
   - Zero-downtime rotation with configurable overlap grace periods.

3. **OAuth 2.0 with PKCE**:
   - Authorization Code grant with mandatory PKCE (S256 code challenges).
   - Single-use, short-lived authorization codes (10m TTL) with strict replay defense.
   - Scoped access tokens (1h TTL) and rotating refresh tokens with token family reuse detection.

4. **Webhooks Engine**:
   - Cryptographic payload signing using HMAC-SHA256 (`X-FitCore-Signature: t=...,v1=...`).
   - Anti-replay and drift tolerance validation.
   - Strict SSRF network protections prohibiting `localhost`, private subnets (RFC 1918), and cloud metadata endpoints (`169.254.169.254`).
   - Safe test event delivery (`test: true`) without leaking real customer PII.

5. **Sliding-Window Rate Limiting & Backpressure**:
   - Sliding-window enforcement per tier (`STANDARD`, `PARTNER`, `ENTERPRISE`, `SANDBOX`).
   - Returns standard headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) and `Retry-After` on HTTP 429.

6. **Developer Sandbox**:
   - Completely isolated test environment with synthetic datasets (150 members, 25 classes, 8 trainers) for rapid verification without risk to live production records.
