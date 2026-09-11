# ADR-040: Production Integrations Platform Architecture

## Status
Accepted

## Context
FitCore has evolved numerous external integrations across multiple functional milestones:
* Day 6: Payments (Stripe, Esewa, Khalti).
* Day 7: Access Control (Kisi, Salto, Turnstiles).
* Day 23: Wearables & IoT (Apple Health, Google Fit, Fitbit, Garmin, Whoop).
* Day 28: Communications (Twilio SMS/WhatsApp, SendGrid Email, FCM/APNs Push).
* Day 43: Accounting (Xero, QuickBooks Online).
* Foundation for Calendar synchronization (Google Calendar, Outlook).

Previously, each domain feature handled its own connection lifecycle, credentials storage, rate limits, retry policies, and webhook ingestion paths. This resulted in duplicated code, fragmented credential security, inconsistent error recovery, and lack of central observability for integration health.

Furthermore, upcoming Day 49 (Developer Platform) and Day 50 (Marketplace) require a unified integration architecture.

## Decision
We established a centralized, production-grade **FitCore Integrations Platform** following the layered pipeline:

```text
FITCORE DOMAIN
      ↓
INTEGRATION SERVICE
      ↓
PROVIDER ABSTRACTION
      ↓
PROVIDER ADAPTER
      ↓
EXTERNAL SYSTEM
```

And for inbound event streams:

```text
EXTERNAL PROVIDER
      ↓
WEBHOOK
      ↓
SIGNATURE VERIFICATION
      ↓
NORMALIZATION
      ↓
IDEMPOTENCY
      ↓
INTEGRATION EVENT
      ↓
FITCORE DOMAIN SERVICE
```

### Key Architectural Pillars
1. **Multi-Scope Connection Lifecycle**:
   Connections are first-class entities with explicit ownership across 4 scopes:
   - `ORGANISATION`: Central accounting (Xero, QuickBooks), payment processors (Stripe), email/SMS providers.
   - `OUTLET`: Physical access control hardware (Kisi, Salto), branch-specific POS.
   - `MEMBER`: Personal wearables (Apple Health, Fitbit) and member health consent.
   - `STAFF`: Trainer calendar scheduling (Google Calendar, Outlook).

2. **Zero Plaintext Credentials at Rest (AES-256-GCM)**:
   All secrets, API keys, and OAuth access/refresh tokens are sealed with AES-256-GCM authenticated encryption. DTOs and audit logs never expose plaintext secrets. When a connection is severed, credentials are cryptographically wiped.

3. **Single-Use Tenant-Bound CSRF OAuth 2.0**:
   OAuth state tokens are cryptographically generated, bound to tenant/user/provider, and expire after 10 minutes. A state token is consumed exactly once, mitigating replay and cross-site authorization attacks.

4. **Inbound Webhook Verification, Deduplication & Normalization**:
   Inbound payloads pass through signature verification (HMAC-SHA256, ECDSA, nonces). Deduplication hashes payloads and drops repeated deliveries idempotently. Payloads are transformed into internal normalized domain events before dispatching to business services.

5. **Resilient Retry with Full Jitter & Sliding-Window Rate Limiter**:
   Transient upstream errors (HTTP 429, 502, 503, 504, network timeouts) undergo exponential backoff with full jitter to eliminate thundering herds. Rate quotas are tracked per connection and provider via sliding-window Redis counters, honoring upstream `Retry-After` directives.

6. **Automatic Health Degradation & Proactive Pings**:
   Repeated operational failures automatically transition connection status (`HEALTHY` → `DEGRADED` → `UNHEALTHY`). Proactive diagnostic pings measure external latency and report actionable recovery diagnostics.

7. **Multi-Tenant RBAC, IDOR & SSRF Defenses**:
   All endpoints enforce strict role boundaries. Cross-tenant or cross-outlet manipulation is blocked. Outbound redirect and webhook URLs reject private CIDRs, loopbacks, and cloud metadata services (`169.254.169.254`).

## Consequences
### Positive
* Unified operational visibility across all third-party dependencies in one management dashboard.
* Standardized adapter interface simplifies onboarding future providers.
* High security posture protecting sensitive tenant credentials.
* Zero downtime impact from third-party outages due to degraded status transitions and resilient backoff.
* Seamless preparation for Day 49 (Developer Platform) and Day 50 (Marketplace).

### Negative / Trade-offs
* All domain services must interact through integration interfaces rather than calling upstream APIs directly.
* Webhook ingestion requires storing and pruning event logs over time to manage storage growth.
