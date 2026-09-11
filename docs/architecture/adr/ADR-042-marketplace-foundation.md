# ADR-042: FitCore Marketplace Foundation Architecture

## Status
Accepted

## Date
2026-09-12

## Context
FitCore requires an ecosystem layer where organisations can discover, evaluate, install, configure, enable, disable, and manage third-party applications, hardware integrations, AI agents, training programs, and fitness/wellness services. This marketplace layer must sit on top of Day 48 (Hardware & Platform Integrations) and Day 49 (Developer Platform), while strictly preserving multi-tenant isolation, data privacy boundaries (specifically member biometric Health PII), and zero domain duplication with core billing, memberships, bookings, or payments.

## Decisions

### 1. Unified Listing Abstraction Across 6 Product Archetypes
- Single extensible listing engine supporting:
  - `APP`: Third-party SaaS web/mobile applications.
  - `INTEGRATION`: Hardware turnstiles, IoT readers, accounting sync bridges.
  - `AI_AGENT`: Autonomous receptionists, co-pilots, churn agents.
  - `TRAINER`: Certified personal trainers and nutrition coaches.
  - `PROGRAM`: Periodised strength templates, hypertrophy blueprints.
  - `SERVICE`: Mobile DXA clinics, physiotherapy, wellness services.
- Decoupled from proprietary execution logic: The marketplace handles discovery, metadata, permissions, and lifecycle; underlying execution is delegated to existing Day 19, Day 48, Day 49, and Core engines.

### 2. Multi-Tenant Installation & Scope Model
- Idempotent installations enforced via database unique constraints: `@@unique([organisationId, listingId, outletId])`.
- Two installation scopes:
  - `ORGANISATION`: Accessible across the entire tenant organization.
  - `OUTLET`: Bound strictly to a specific physical gym outlet.
- Installation lifecycle: `PENDING` → `ACTIVE` ⇄ `PAUSED` → `UPGRADING` → `UNINSTALLED`.
- Uninstallation guarantees immediate revocation of all associated permission grants and credentials.

### 3. Strict Health PII Consent Isolation
- Member biometrics, PAR-Q medical histories, and wearable streams (`health:parq:read`, `health:biometrics:read`, `health:wearables:read`) cannot be bypassed by an organisation-level marketplace install.
- If a listing requires Health PII, explicit isolated consent (`consentHealthPii: true`) must be acknowledged, and actual data flows require per-member authorization.

### 4. Verified Installation Reviews & Rating Integrity
- Reviews are strictly gated to verified customers: an organisation can ONLY review an application if they have an active or past installation (`isVerifiedInstallation: true`).
- Enforces single review per tenant per listing (`@@unique([listingId, organisationId])`).
- Automatic real-time recalculation of `ratingAverage` and `reviewCount` on `MarketplaceListing`.
- Superadmin moderation workflow (`PUBLISHED`, `FLAGGED`, `HIDDEN`, `REMOVED`).

### 5. Dependency Resolution & Conflict Detection
- Listings declare versioned dependencies (`{ slug, minVersion, optional }`) and mutual conflicts (`conflicts: string[]`).
- Pre-flight installation checks validate the tenant's active app graph, preventing conflicting software from running concurrently.

### 6. Commercial Billing Boundary (Day 55 Alignment)
- Marketplace listings declare pricing metadata (`FREE`, `PAID`, `SUBSCRIPTION`, `USAGE_BASED`, `CONTACT_SALES`).
- Marketplace does NOT implement custom checkout forms, commission splits, or invoice generation; commercial billing reconciliation is strictly deferred to Day 55.

## Consequences
- Transforms FitCore into an extensible ecosystem platform.
- Zero risk of cross-tenant data leakage or biometric Health PII exposure.
- Safe, audited, reproducible installation and upgrade lifecycle across all gym locations.
