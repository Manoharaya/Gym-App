# FitCore Integrations Platform

## Production-Grade External Integration Architecture

The **FitCore Integrations Platform** establishes a unified, provider-neutral architecture that allows FitCore to securely connect, authenticate, synchronize, and operate with external third-party systems without domain services implementing provider-specific logic.

---

## 1. Architectural Philosophy

Prior to Day 48, domain modules risked directly coupling to specific external vendor SDKs or APIs:
```text
Bad Pattern (Direct Coupling):
BookingService        -> Twilio API
MembershipService     -> Stripe API
FinanceService        -> Xero API
```

Under the Day 48 architecture, all external operations are decoupled via the **FitCore Integrations Platform**:
```text
Clean Decoupled Architecture:
BookingService        -> CommunicationOrchestrator -> IntegrationPlatform -> TwilioAdapter
MembershipService     -> PaymentService           -> IntegrationPlatform -> StripeAdapter
FinanceService        -> AccountingIntegration    -> IntegrationPlatform -> XeroAdapter
```

### Key Architectural Tenets
1. **Domain Services Remain Authoritative Source of Truth**: External systems never mutate FitCore state directly without internal domain validation.
2. **Standard Provider Abstraction**: External systems implement consistent interfaces for metadata, capabilities, connection lifecycle, and health checks.
3. **Multi-Scope Scenarios**: First-class support for `ORGANISATION`, `OUTLET`, `MEMBER`, and `STAFF` connection scopes.
4. **Defense-in-Depth Credential Security**: Credentials are encrypted at rest using AES-256-GCM, never returned in API payloads, never logged, and never included in AI context.
5. **Idempotent Webhooks & Sync**: Inbound webhooks and outbound sync operations track external IDs to prevent duplicate charges, duplicate sync records, and repeated side-effects.

---

## 2. Inbound & Outbound Data Flows

### Outbound Operational Flow
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

### Inbound Webhook Pipeline
```text
EXTERNAL PROVIDER
      ↓
POST /api/v1/integrations/webhooks/:provider
      ↓
SIGNATURE VERIFICATION (HMAC SHA-256)
      ↓
RAW EVENT ACCEPTANCE
      ↓
EVENT ID EXTRACTION
      ↓
IDEMPOTENCY CHECK (Unique provider + externalEventId)
      ↓
NORMALIZATION (PAYMENT_SUCCEEDED, INVOICE_PAID, etc.)
      ↓
PERSIST EVENT (IntegrationWebhookEvent with status PROCESSED / DUPLICATE)
      ↓
DOMAIN HANDLER / OUTBOX
      ↓
RESULT
```

---

## 3. Directory Layout

The module resides under `services/api/src/integrations/`:

```text
services/api/src/integrations/
├── integrations.module.ts
├── integrations.controller.ts
├── integrations.service.ts
│
├── core/
│   ├── integration-registry.service.ts       # Provider catalog, capabilities & scopes
│   ├── integration-connection.service.ts     # CRUD & multi-scope connection lifecycle
│   ├── integration-credential.service.ts     # AES-256-GCM authenticated encryption at rest
│   ├── integration-oauth.service.ts          # State generation, verification & token exchange
│   ├── integration-health.service.ts         # Health monitoring & consecutive failure tracking
│   ├── integration-webhook.service.ts        # Signature verification & idempotency pipeline
│   ├── integration-sync.service.ts           # Initial, incremental, full & reconciliation sync
│   ├── integration-retry.service.ts          # Exponential backoff with full jitter
│   ├── integration-rate-limit.service.ts     # Sliding window / token bucket rate limiter
│   ├── integration-permission.service.ts     # Multi-tenant RBAC & IDOR guard
│   ├── integration-audit.service.ts          # Security audit trail logging
│   └── integration-cache.service.ts          # Redis & in-memory TTL cache
│
├── adapters/
│   ├── base-integration.adapter.ts          # Common IntegrationProvider contract
│   ├── payment-integration.adapter.ts        # Bridges Day 6 IPaymentProvider
│   ├── accounting-integration.adapter.ts     # Bridges Day 43 AccountingProvider
│   ├── communication-integration.adapter.ts  # Bridges Day 28 CommunicationProvider
│   ├── wearable-integration.adapter.ts       # Bridges Day 23 IWearableProvider
│   ├── access-integration.adapter.ts         # Bridges Day 7 IAccessDeviceProvider
│   └── calendar-integration.adapter.ts       # Foundation for Google/Microsoft Calendar
│
├── dto/
│   ├── create-connection.dto.ts
│   ├── update-connection.dto.ts
│   ├── trigger-sync.dto.ts
│   ├── connection-filter.dto.ts
│   └── webhook-query.dto.ts
│
└── domain/
    ├── integration-errors.ts                 # Normalized IntegrationError classification
    └── integration-events.ts                 # Normalized domain events
```

---

## 4. Operational Readiness for Day 49 & Day 50

Day 48 provides the foundational internal abstractions that will be directly consumed by:
- **Day 49 (API & Developer Platform)**: Public API keys, OAuth applications, external developer webhooks, and rate limiting.
- **Day 50 (Marketplace & Third-Party Apps)**: App packaging, third-party capability declarations, and partner app installations.
