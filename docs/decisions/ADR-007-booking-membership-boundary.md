# ADR-007: Booking & Scheduling Domain Boundaries and Capacity Control

## Status
Accepted

## Context
FitCore is an enterprise multi-tenant fitness SaaS supporting multi-outlet gym networks.
As the platform expands into class scheduling, trainer management, and member bookings (Day 8), clear architectural boundaries must be enforced between:
1. Commercial rights and entitlements (`MemberMembership`, `MembershipPlan`, `MembershipEntitlement`, `MembershipAccessScope`)
2. Relational onboarding associations (`MemberOutlet`)
3. Physical facility entry (`AccessDecisionService`, `CheckIn`)
4. Session scheduling and capacity booking (`ClassSession`, `Booking`, `WaitlistEntry`)

Without explicit invariants, systems tend to couple booking eligibility to home gyms (`MemberOutlet`) or conflate booking with physical door unlock rights. Furthermore, booking systems suffer from race conditions, overbooking, deadlocks, and stale waitlist promotions under high concurrency.

## Decisions

### 1. Invariant: `MemberOutlet ≠ Booking Eligibility`
- `MemberOutlet` reflects administrative joining/onboarding assignment only. It NEVER grants booking eligibility or physical access.
- Booking eligibility is strictly derived via:
  `Member -> Active MemberMembership -> MembershipPlan -> Entitlements (GROUP_CLASSES) -> MembershipAccessScope -> Target Outlet`.
- A member whose active membership only covers Outlet A cannot book a class at Outlet B, even if they have an administrative `MemberOutlet` link to Outlet B.
- If a member has multiple active memberships, eligibility is evaluated across all active plans (at least one plan must provide valid entitlement and outlet scope).

### 2. Multi-Tenancy & Resource Ownership Hierarchy
- **Organisation Ownership**:
  - `Organisation` owns `ClassType`, `ClassTemplate`, `BookingPolicy`, and `RecurringSchedule`.
  - Class definitions, cancellation policies, and standard templates are shared across all outlets within an organisation.
- **Outlet Ownership**:
  - `Outlet` owns physical `Resource` (studios, rooms, lanes, cages, courts) and scheduled `ClassSession`.
  - A class session belongs to exactly one outlet and takes place in an outlet-owned physical resource.
- **Cross-Tenant Isolation**:
  - Queries and mutations strictly enforce `organisationId` and `outletId` bounds.
  - Cross-tenant session lookups or booking attempts return `404 Not Found` or `403 Forbidden`.

### 3. Separation of Concerns: Booking vs. Physical Access
- **Booking is NOT Door Access**:
  - A confirmed `Booking` confirms a reserved spot in a class session; it does NOT automatically unlock turnstiles or doors.
  - Physical turnstile or studio door access remains governed exclusively by `AccessDecisionService`.
- **Door Access is NOT Booking**:
  - Physical check-in at reception or turnstile does not automatically create or complete a class booking unless staff explicitly mark class attendance.

### 4. Strict Concurrency, Capacity Locking & FIFO Waitlist
- **Pessimistic Row Locking (`SELECT ... FOR UPDATE`)**:
  - To eliminate race conditions and overbooking during high-traffic drop times, booking creation uses PostgreSQL transaction-level locking on the `ClassSession` row:
    ```sql
    SELECT * FROM "ClassSession" WHERE "id" = $1 FOR UPDATE;
    ```
  - Spots remaining is calculated inside the locked transaction: `capacity - confirmedBookingCount`.
- **Automatic Overflow to Waitlist**:
  - If `spotsRemaining > 0`, the booking is confirmed (`BookingStatus.CONFIRMED`).
  - If `spotsRemaining <= 0` and waitlist is enabled and below `waitlistCapacity`, the member is placed on the waitlist (`BookingStatus.WAITLISTED`) with a monotonically increasing FIFO `position`.
  - If waitlist is full or disabled, the booking request is rejected with `SESSION_FULL`.
- **FIFO Waitlist Promotion with Re-Verification**:
  - When a confirmed booking is cancelled, the system selects candidate #1 (`position: 1`, `status: PENDING`) inside an exclusive transaction.
  - The candidate's eligibility is re-verified (`BookingEligibilityService.checkEligibility`).
  - If the candidate's membership expired, was frozen, or lost entitlement while waiting, their waitlist entry is marked `EXPIRED`, and the system evaluates candidate #2.
  - Eligible candidates are promoted to `CONFIRMED`, their waitlist entry marked `PROMOTED`, and subsequent waitlist positions are decremented.

### 5. Idempotency & Anti-Duplication
- Booking creation supports an `Idempotency-Key` HTTP header.
- A unique database index `(memberProfileId, classSessionId)` prevents duplicate active bookings for the same member in the same session.
- Submitting an identical idempotency key returns the existing booking record with HTTP 200/201 without consuming additional capacity.

### 6. Anti-IDOR & Security Isolation
- Members can only view and cancel their own bookings (`memberProfileId == current_user.memberProfile.id`).
- Staff booking operations (`manual-booking`, `check-in`, `no-show`, `cancel`) require explicit RBAC permissions (`bookings:manage`, `bookings:check_in`).
- Staff actions record `bookedByStaffId` for complete auditability.

## Consequences

### Positive
- Zero risk of overbooking even under thousands of concurrent requests.
- Complete multi-tenant isolation with clear inheritance (Org -> Outlet -> Resource/Session).
- Clean decoupling between commercial membership rules and physical door access.
- Resilient FIFO waitlist lifecycle with automated invalidation of stale candidates.
- Idempotent API prevents double-booking due to mobile network retries.

### Negative / Trade-offs
- Pessimistic locking on `ClassSession` serializes booking requests for the same session. However, session row locks are short-lived (<20ms) and granular per session, preserving high throughput across the system.
- Waitlist promotion requires synchronous or near-synchronous transaction execution upon cancellation.
