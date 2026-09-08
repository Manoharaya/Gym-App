# ADR-024: AI Receptionist Booking Execution via Controlled Domain Tools and Two-Step Confirmation State

## Status
Accepted

## Context
Day 31 introduced the foundational AI Receptionist for FitCore, providing safe, read-only conversational inquiries grounded in authoritative gym knowledge sources. In Day 32, the receptionist must be empowered to perform operational actions:
- Discover live class availability with dynamic capacity and status.
- Book class sessions.
- Cancel existing reservations.
- Reschedule to alternative sessions.
- Join session waitlists when full.

Enabling an AI system to execute real-world database mutations introduces critical operational and security risks:
1. **Hallucination Risk**: An LLM might claim a booking was made when no record was committed to the database.
2. **Prompt Injection / Unauthorized Mutation**: Malicious inputs could attempt to bypass membership eligibility, cancel other members' bookings, or consume class capacity.
3. **Premature Action**: An LLM might execute a cancellation or booking before the customer is fully aware of penalties or schedule conflicts.
4. **Race Conditions & Concurrency**: Class spots might be claimed between discovery and execution.
5. **Partial Failures During Rescheduling**: Cancelling an existing booking before confirming the new spot could leave the customer stranded if the target fills up.

## Decision
We decided on an architectural design based on **Controlled Domain Tools with Two-Step Confirmation State**:

### 1. Invariant Pipeline
All conversational operations follow the strict sequence:
```
UNDERSTAND -> IDENTIFY -> SEARCH -> CHECK ELIGIBILITY -> PRESENT OPTIONS -> CONFIRM -> AUTHORIZE TOOL -> EXECUTE -> VERIFY -> RESPOND
```

### 2. Strict Prospect vs. Member Boundary
- Unauthenticated prospects can discover class schedules, ask general questions, and check facility information.
- All state-mutating actions (`create_booking`, `cancel_booking`, `reschedule_booking`, `join_waitlist`) unconditionally require a verified member identity (`memberProfileId`), validated by `ReceptionistMemberIdentityService`.

### 3. Server-Side Single-Use Confirmation State Tokens
- Mutating tools are classified as **HIGH** or **MEDIUM** risk.
- They cannot be executed directly in a single conversational turn.
- The system generates a cryptographic 256-bit single-use token persisted in `BookingConfirmationState` with a 10-minute TTL.
- The receptionist presents the exact details and policy to the customer and requests explicit agreement.
- When confirmed, the token is consumed atomically inside a database transaction (`prisma.$transaction`). Replay attacks are blocked with `ConflictException`.

### 4. Canonical Domain Service Reuse
- No duplicate booking logic is created in the AI layer.
- `BookingEligibilityService` evaluates membership status, class entitlements, outlet access scopes, advance booking windows, and schedule conflicts.
- `BookingService` handles underlying database transitions.

### 5. Atomic Rescheduling
- Rescheduling first validates the target session's eligibility and capacity.
- Old booking cancellation and new booking creation are committed in a single transaction.
- If the target session fills up or fails, the original booking remains untouched and confirmed.

### 6. Post-Execution State Verification
- `BookingVerificationService` queries the database post-mutation to assert record creation/modification before returning a success message to the customer.

## Consequences

### Positive
- **Zero Hallucinated State**: The AI can never claim a booking succeeded without verified database confirmation.
- **Robust Tenant & IDOR Isolation**: Multi-tenant boundaries and member ownership are strictly enforced by canonical domain services.
- **Protection Against Accidental Mutations**: Two-step confirmation ensures customer intent is unambiguous.
- **Resilience Under Concurrency**: Transactional capacity locks prevent overbooking.

### Negative / Trade-offs
- Requires two conversational turns for bookings and cancellations (necessary trade-off for security).
- Adds minimal storage overhead for ephemeral confirmation state tokens (mitigated by automated cleanup).
