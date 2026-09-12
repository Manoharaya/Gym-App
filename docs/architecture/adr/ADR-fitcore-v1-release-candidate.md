# ADR: FitCore v1.0 — Release Candidate Architecture & Production Certification

## Status
Accepted

## Context
Across 60 systematic engineering days, the FitCore monorepo has grown into an enterprise-grade multi-tenant platform spanning gym operations, member onboarding, digital turnstile access, class scheduling, personal training, workouts, nutrition, communications, AI automation, CRM pipelines, recurring billing, accounting integrations, developer APIs, marketplaces, enterprise governance, privacy compliance, platform observability, disaster recovery, and advanced penetration security.

Day 60 represents the final platform validation, regression testing, and release hardening milestone to establish **FitCore v1.0.0-rc.1**.

## Decisions

1. **Release Candidate Architecture Certification**:
   - The platform architecture is formally locked at commit `b12ed8baa16de7a85ce672da872a0cfddb8f10b4` as **FitCore v1.0.0-rc.1**.
   - No major feature developments are allowed on the release branch without explicit change management approval.

2. **Server-Side Authority & Multi-Tenant Boundaries**:
   - Enforce the immutable architectural rule: **Client state is never authoritative**. Client-supplied `organisationId`, `outletId`, `role`, or `isSuperAdmin` within request payloads or query parameters are discarded or strictly rejected if inconsistent with the cryptographically verified JWT session claims.
   - All tenant context resolution is executed via `TenantGuard` and `TenantContextService`.

3. **AI Workforce Security Invariants**:
   - AI Platform features (Fitness Coach, Nutrition Coach, Receptionist, Sales Agent, Finance Assistant) are strictly decoupled from direct database writes.
   - All AI actions are mediated through strongly typed domain services enforcing identity, tenant isolation, and RBAC permissions.
   - Untrusted user inputs are framed with immutable boundary delimiters, and prompt injection patterns are rejected before invocation.
   - Zero raw SQL execution tools (`executeSQL`) are exposed to LLMs.

4. **Critical Billing Decoupling**:
   - Strict architectural separation is enforced between **Gym Member Billing** (`/memberships`, `/payments`, `/invoices` - gym billing the athlete) and **FitCore SaaS Platform Billing** (`/saas-billing/*` - FitCore billing the gym organisation).

5. **Disaster Recovery & Business Continuity Baseline**:
   - Database backups are KMS-encrypted (AES-256-GCM), integrity checksummed with SHA-256, and verified via automated non-destructive sandbox restore drills.
   - Measured Observed RTO is certified at **18 seconds** and Observed RPO at **< 1 minute**.
   - Restoring legacy database snapshots re-applies GDPR privacy deletion tombstones to prevent unauthorized account resurrection.

6. **Automated Quality & Release Regression Suite**:
   - Release certification requires 100% pass across all 143 automated end-to-end tests spanning Day 54 (Platform Admin), Day 55 (SaaS Billing), Day 56 (Observability), Day 57 (Scalability), Day 58 (Disaster Recovery), Day 59 (Penetration QA), and Day 60 (Release Candidate Master QA).

## Consequences
- **FitCore v1.0.0-rc.1** is declared **RELEASE CANDIDATE READY**.
- The system is cleared for deployment to staging environments and controlled commercial pilot onboarding at Second Wind Athletic Club (Perth CBD).
- The release documentation suite in `docs/release/` provides complete operational runbooks, rollback plans, and deployment checklists.
