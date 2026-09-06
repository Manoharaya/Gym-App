# FitCore Booking & Scheduling Security Specification (Day 8)

## 1. Security Architecture & Threat Model

The booking system introduces high-concurrency mutation endpoints, member identity checks, and staff override surfaces. The security architecture addresses the following threat vectors:
- **Overbooking Race Conditions**: Concurrent booking requests exploiting network latency to exceed physical capacity.
- **Insecure Direct Object Reference (IDOR)**: Malicious actors attempting to cancel, inspect, or modify another member's booking or waitlist entry.
- **Tenant & Outlet Boundary Escapes**: Users from Organisation A attempting to view or book sessions in Organisation B, or staff from Outlet A modifying Outlet B schedules.
- **Entitlement Forgery / Circumvention**: Ineligible members attempting to bypass commercial plan restrictions or outlet scopes via front-desk or mobile APIs.
- **Replay & Double Booking**: Repeated network calls resulting in duplicate bookings and wasted capacity.

---

## 2. RBAC Permissions Matrix

| Permission | Description | Assigned Default Roles |
|---|---|---|
| `classes:view` | View class types, templates, and sessions | `ORG_ADMIN`, `OUTLET_MANAGER`, `TRAINER`, `RECEPTIONIST`, `MEMBER` |
| `classes:create` | Create new class types and templates | `ORG_ADMIN`, `OUTLET_MANAGER` |
| `classes:update` | Update class types and templates | `ORG_ADMIN`, `OUTLET_MANAGER` |
| `classes:delete` | Delete or deactivate class types | `ORG_ADMIN` |
| `class_sessions:view` | View scheduled sessions | All authenticated users |
| `class_sessions:create` | Schedule new class sessions | `ORG_ADMIN`, `OUTLET_MANAGER` |
| `class_sessions:update` | Update session details, rooms, times | `ORG_ADMIN`, `OUTLET_MANAGER` |
| `class_sessions:cancel` | Cancel an entire session | `ORG_ADMIN`, `OUTLET_MANAGER` |
| `bookings:view` | View session bookings roster | `ORG_ADMIN`, `OUTLET_MANAGER`, `TRAINER`, `RECEPTIONIST` |
| `bookings:create` | Book a spot in a class | `MEMBER`, `RECEPTIONIST`, `OUTLET_MANAGER`, `ORG_ADMIN` |
| `bookings:cancel` | Cancel own booking | `MEMBER` (self), `RECEPTIONIST`, `OUTLET_MANAGER`, `ORG_ADMIN` |
| `bookings:check_in` | Mark attendee as present/attended | `RECEPTIONIST`, `TRAINER`, `OUTLET_MANAGER`, `ORG_ADMIN` |
| `bookings:manage` | Front-desk manual booking, no-show marking | `RECEPTIONIST`, `OUTLET_MANAGER`, `ORG_ADMIN` |
| `schedules:view` | View staff and outlet timetables | `ORG_ADMIN`, `OUTLET_MANAGER`, `TRAINER`, `RECEPTIONIST` |
| `schedules:manage` | Manage trainer availability and recurring rules | `ORG_ADMIN`, `OUTLET_MANAGER` |

---

## 3. Anti-IDOR Protections

1. **Member Self-Scoping**:
   - For all member-facing endpoints (`/api/v1/members/me/bookings`, `/api/v1/members/me/waitlists`, `/api/v1/class-sessions/:id/book`), the backend strictly extracts `memberProfileId` from the verified JWT:
     ```typescript
     const member = await this.prisma.memberProfile.findUnique({
       where: { userId: user.sub },
     });
     ```
   - Members cannot pass an arbitrary `memberProfileId` query param or payload to view or act on behalf of another user.
2. **Booking Cancellation Ownership**:
   - When a cancellation is requested at `POST /api/v1/bookings/:id/cancel`:
     ```typescript
     if (!isStaff && booking.memberProfileId !== memberProfile.id) {
       throw new ForbiddenException({
         code: 'FORBIDDEN',
         message: 'You cannot cancel another member\'s booking',
       });
     }
     ```
   - Automated test `booking-security.e2e-spec.ts` strictly verifies that Member B cannot cancel Member A's booking (returning HTTP 403).

---

## 4. Cross-Tenant & Outlet Boundary Isolation

1. **Organisation Tenant Boundary**:
   - `ClassType`, `ClassTemplate`, `BookingPolicy`, and `RecurringSchedule` are queried with `WHERE organisationId = :orgId`.
   - Cross-tenant requests to access another organisation's classes or policies return `404 Not Found`.
2. **Outlet Isolation**:
   - `ClassSession` and `Resource` records are strictly bound to their parent `outletId`.
   - Outlet managers and staff can only manage sessions hosted at their assigned outlet.

---

## 5. Commercial Invariant & Entitlement Verification

The system enforces that `MemberOutlet ≠ Booking Eligibility`:
- Even if a member is administratively assigned to an outlet via `MemberOutlet`, they **cannot** book a class unless their active `MemberMembership` grants `GROUP_CLASSES` entitlement at that specific outlet:
  ```typescript
  const hasAccess = await this.membershipAccessPolicy.canAccessOutlet(
    memberProfileId,
    session.outletId,
    'GROUP_CLASSES',
  );
  if (!hasAccess.allowed) {
    return {
      eligible: false,
      reason: hasAccess.reason, // OUTLET_NOT_IN_SCOPE or NO_CLASS_ENTITLEMENT
    };
  }
  ```

---

## 6. Concurrency Defense & Idempotency

1. **Pessimistic Locking**:
   - `SELECT ... FOR UPDATE` prevents double-booking race conditions during high-volume booking drops.
2. **Idempotent Retries**:
   - `Idempotency-Key` header allows safe mobile retries during transient network timeouts without creating duplicate reservations or eating session capacity.
