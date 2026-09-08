# Day 32 — AI Receptionist Booking Security & Guardrails

This document outlines the security architecture, authorization boundaries, IDOR defenses, and cryptographic token lifecycle governing all booking operations in the FitCore AI Receptionist.

---

## 1. Zero-Trust Operational Model

The AI Receptionist functions strictly as an intelligent interface layer. It is **never** granted raw database mutation privileges. Every operational intent is parsed, validated against canonical domain services, authorized via single-use server-side tokens, and executed through canonical business logic.

```
+------------------+      +---------------------------+      +--------------------------+
|  User Message    | ---> | Receptionist Intent & LLM | ---> | Tool Execution Request   |
+------------------+      +---------------------------+      +--------------------------+
                                                                         |
                                                            +------------v-------------+
                                                            | Tool Permission Service  |
                                                            | Check Risk Tier & Token  |
                                                            +--------------------------+
                                                                         |
                                                            +------------v-------------+
                                                            | Domain Booking Service   |
                                                            | Multi-Tenant / IDOR / DB |
                                                            +--------------------------+
```

---

## 2. Multi-Tenant Boundary Isolation

FitCore enforces absolute tenant data isolation at every layer:

1. **Explicit Organisation Scoping**:
   - Every service call requires `organisationId`.
   - All Prisma queries unconditionally scope by `organisationId`:
     ```ts
     where: { organisationId, id: bookingId }
     ```
2. **Cross-Tenant Token Defense**:
   - `BookingConfirmationState` records are tied directly to an `organisationId`.
   - If an attacker attempts to execute a token generated in Organisation A against an endpoint or session in Organisation B, `validateAndConsumeToken` throws `ForbiddenException`.
3. **Outlet Scoping**:
   - Outlets are validated to belong to the active organisation. Cross-organisation outlet referencing is rejected with `NotFoundException` or `ForbiddenException`.

---

## 3. Member Identity vs. Prospect Boundary

FitCore enforces a clear distinction between unauthenticated prospects and verified members:

### Prospect Capabilities
- Browse upcoming class schedules across outlets.
- Ask questions regarding gym amenities, trainers, and policies.
- Inquire about membership plans and trial options.

### Member-Only Capabilities
- Reserving spots in class sessions (`create_booking`).
- Cancelling existing reservations (`cancel_booking`).
- Rescheduling reservations (`reschedule_booking`).
- Joining session waitlists (`join_waitlist`).
- Viewing personal booking histories (`get_booking_details`).

### Enforcement Point: `ReceptionistMemberIdentityService`
```ts
assertVerifiedMember(identity: VerifiedMemberIdentity): asserts identity is Required<VerifiedMemberIdentity> {
  if (!identity.isMember || !identity.memberProfileId) {
    throw new UnauthorizedException(
      'I can help you browse class schedules and facilities, but class bookings and reservations require an active FitCore member account. Please log in or speak with our front desk.',
    );
  }
}
```

---

## 4. Insecure Direct Object Reference (IDOR) Defense

To prevent members from inspecting or modifying other members' bookings:

1. **Query Guards**:
   - In `getBookingDetails`, `booking.memberProfileId` must match the authenticated member's `memberProfileId`. Mismatches throw `ForbiddenException`.
2. **Cancellation Guards**:
   - Cancellation requests verify that `booking.memberProfileId === memberProfileId`.
3. **Rescheduling Guards**:
   - The source booking ID must belong to the caller. Target session entitlement and capacity are checked against the caller's profile.

---

## 5. Server-Side Single-Use Confirmation Tokens

High-risk mutations require an explicit two-step confirmation flow backed by server-side state tokens.

### Token Characteristics
- **Entropy**: 32 bytes of cryptographically secure random data (`crypto.randomBytes(32).toString('hex')`).
- **Storage**: Persisted in PostgreSQL table `booking_confirmation_states`.
- **TTL**: 10 minutes (600 seconds) by default. Expired tokens cannot be executed.
- **Action Binding**: Bound to specific actions (`CREATE_BOOKING`, `CANCEL_BOOKING`, `RESCHEDULE_BOOKING`, `WAITLIST_JOIN`).
- **Single-Use**: Upon first successful execution, status transitions atomically to `EXECUTED` with `executedAt = now()`.

### Replay Attack Prevention
Any attempt to submit the same confirmation token a second time results in an immediate rejection:
```ts
if (confirmation.status === 'EXECUTED') {
  throw new ConflictException({
    code: 'CONFIRMATION_TOKEN_ALREADY_USED',
    message: 'This booking confirmation has already been executed.',
  });
}
```

---

## 6. Concurrency & Race Condition Defense

1. **Transaction Isolation**:
   - Final booking spot allocation occurs inside an atomic database transaction (`prisma.$transaction`).
2. **Double-Check Capacity Lock**:
   - Even if capacity was available during discovery, the transaction counts confirmed bookings immediately before creating the new record.
   - If capacity is exhausted between the initial question and confirmation submission, a `ConflictException` is raised, alerting the customer that the spot was just claimed.
3. **Atomic Rescheduling Guarantee**:
   - Old booking cancellation and new booking creation happen in the same transaction.
   - If target session creation fails, the entire transaction rolls back, leaving the original booking fully intact.
