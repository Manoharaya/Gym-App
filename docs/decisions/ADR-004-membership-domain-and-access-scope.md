# ADR-004: Membership Domain Architecture, Commercial Term Snapshotting & Facility Access Scoping

## Status
**ACCEPTED**

## Context
FitCore is expanding beyond member profiles, onboarding, and medical clearances into core commercial operations: memberships, pricing plans, subscriptions, and facility access authorization.

Key architectural questions that needed resolution:
1. **Plan Ownership Level**: Does a membership plan belong to an individual `Outlet` or directly to an `Organisation`?
2. **Access Authorization Source**: Is access authorization derived from `MemberOutlet` (the member-outlet relationship table) or directly from `MemberMembership`?
3. **Plan Price & Term Mutability**: When club managers adjust pricing or terms on a plan catalog template, how do we prevent historical subscriptions and financial reporting from mutating?
4. **Multi-Outlet Access Strategy**: How can members seamlessly access a single home gym, multiple regional branches, or all outlets belonging to an athletic club brand?

---

## Decision

### 1. Organisation-Level Plan Ownership
`MembershipPlan` belongs directly to `Organisation` rather than `Outlet`.
- Large fitness chains (such as Second Wind Athletic Club) centralize commercial offerings, pricing tiers, and marketing promotions at the brand/organisation level.
- Multi-outlet and organisation-wide plans naturally require organisation-level ownership.
- Plans can optionally restrict their applicability to specific facilities via the `MembershipPlanOutlet` join table.

### 2. Independent MemberOutlet vs. Membership Access Authorization
- `MemberOutlet` remains purely an administrative and sociological record representing the member's relationship with a club (e.g., primary home outlet, transferring history, administrative home club).
- Facility access authorization is derived exclusively and dynamically from `MemberMembership` via its `accessScope` (`SINGLE_OUTLET`, `MULTI_OUTLET`, `ALL_ORGANISATION_OUTLETS`) and the `MemberMembershipOutlet` join table.
- A member may have a home outlet at "South Melbourne", but hold an "All-Access" membership permitting entry at any Second Wind facility.

### 3. Immutable Commercial Term Snapshotting
When a `MemberMembership` is instantiated, all commercial terms are snapshotted onto the membership row:
- `planNameAtPurchase`
- `priceAtPurchase`
- `currencyAtPurchase`
- `billingTypeAtPurchase`
- `durationValueAtPurchase`
- `durationUnitAtPurchase`

This guarantees:
- Club managers can update prices, duration, or titles on the catalog template without altering existing member contracts.
- Accurate historical audit trails for financial, tax, and recurring billing compliance.

### 4. Granular Lifecycle State Machine
A deterministic state machine (`PENDING`, `ACTIVE`, `TRIAL`, `PAUSED`, `SUSPENDED`, `EXPIRED`, `CANCELLED`) enforces valid state transitions and records every change in `MemberMembershipHistory` with `changedById`, `reason`, and metadata.

---

## Consequences

### Positive
- Strict financial and contract integrity via snapshotting.
- Flexible access models supporting single-club boutique gyms up to national multi-branch chains.
- Auditable state transitions with full zero-trust multi-tenant isolation.
- Decoupled physical access logic ready for future turnstile/QR hardware integration without schema modifications.

### Negative / Tradeoffs
- Requires duplicate storage of plan terms on each membership row (justified by regulatory and audit necessity).
- Access check evaluation requires querying active memberships and join tables (optimized via database composite indexes).
