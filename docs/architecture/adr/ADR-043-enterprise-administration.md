# ADR-043: FitCore Enterprise Administration Architecture

## Status
Accepted

## Date
2026-09-12

## Context
As fitness chains, franchise networks, and multi-brand operators adopt FitCore, the system must scale from single-outlet administration to multi-brand, multi-region enterprise governance.

The platform requires:
1. Advanced enterprise roles with fine-grained spatial and organizational scopes.
2. Hierarchical policy engine with deterministic inheritance across organisations, brands, regions, and outlets.
3. Hard security ceilings preventing lower tiers from relaxing core security and compliance invariants.
4. Safe multi-outlet administration and brand transfers without historical data loss.
5. Custom domain foundation with DNS TXT verification and SSL certificate lifecycle tracking.
6. Zero duplication of core authentication, tenancy, payments, memberships, bookings, or AI platforms.

## Decisions

### 1. Multi-Brand & Multi-Tier Hierarchy
- Enterprises operate as legal parent organisations (`Organisation`) containing multiple trading brands (`OrganisationBrand`).
- Outlets (`Outlet`) can be grouped under brands or operate as independent corporate facilities.
- Regional classification is derived from geographic boundaries (states/provinces/territories).
- Outlets can be transferred between brands cleanly with automatic policy cache invalidation.
- Decommissioning outlets or brands sets status to `DELETED` or `ARCHIVED` with `deletedAt = now()`. Hard SQL deletes are strictly prohibited to protect historical ledgers, tax compliance records, and check-in logs.

### 2. Scoped Enterprise Roles & Privilege Escalation Defenses
- 6 Enterprise roles: `ENTERPRISE_ADMIN` (Level 90), `REGIONAL_MANAGER` (Level 75), `BRAND_MANAGER` (Level 70), `OPERATIONS_MANAGER` (Level 65), `COMPLIANCE_MANAGER` (Level 65), `ANALYTICS_MANAGER` (Level 65).
- Scoped delegations via `EnterpriseRoleAssignment` across scopes: `PLATFORM`, `ORGANISATION`, `BRAND`, `REGION`, `OUTLET`.
- Time-bounded validity supported via `validFrom` and `validTo`.
- Strict hierarchical rank invariant: `actorHighestLevel > targetLevel`. Actors cannot assign or revoke roles of equal or higher rank.
- Synchronization with core `UserRole` table preserves immediate compatibility with existing RBAC guards and permissions checks (`can()`).

### 3. Hierarchical Policy Engine with Hard Security Ceilings
- 15 Standardized Policy Categories: `FEATURE`, `SECURITY`, `BRANDING`, `COMMUNICATION`, `INTEGRATION`, `AI`, `MARKETPLACE`, `DEVELOPER_API`, `DATA_ACCESS`, `RETENTION`, `ACCESS_CONTROL`, `FINANCE`, `BILLING`, `COMPLIANCE`, `OPERATIONS`.
- Deterministic inheritance cascade: `ORGANISATION` -> `BRAND` -> `REGION` -> `OUTLET`.
- Immutable **Hard Security Ceilings** (`isHardCeiling: true`): Parent scopes can enforce immutable security invariants (e.g. `mfaRequired: true`, `allowExternalLlm: false`, `allowCustomWebhooks: false`). Child tiers attempting to loosen or override these settings are rejected with `HardCeilingViolationException` during creation, or clamped to the hard ceiling during policy resolution.
- Every policy modification increments `currentVersion` and creates an immutable snapshot in `EnterprisePolicyVersion`.
- Interactive Policy Simulator (`POST /api/v1/enterprise/policies/preview`) enables dry-run previews with field-level diffs and ceiling breach warnings before publishing.

### 4. Custom Domains & Tenant Ingress Foundation
- Full DNS challenge verification: generates unique cryptographically secure tokens (`fitcore-challenge-${hex}`), expected TXT challenge records (`_fitcore-challenge.${domain}`), and CNAME targets (`custom.domains.fitcore.io`).
- Tracks SSL certificate status lifecycle (`PENDING` -> `ISSUED` -> `EXPIRED`).
- Provides domain-to-tenant resolution foundation for multi-tenant HTTP ingress.

### 5. Multi-Outlet Staff Administration
- Staff profiles can be assigned across multiple outlets with explicit assignment types: `PRIMARY`, `SECONDARY`, `TEMPORARY`, `REGIONAL`.
- Inter-outlet staff transfers archive or end previous assignments, set new primary facilities, and record structured audit entries.

## Consequences
- Unlocks enterprise sales and franchise network deployments.
- Guarantees zero security degradation across decentralized franchise locations.
- Preserves absolute tenant isolation and financial audit integrity.
- Zero duplication of existing core engines.
