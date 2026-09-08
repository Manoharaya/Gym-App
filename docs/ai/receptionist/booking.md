# Day 32 — AI Receptionist Booking & Scheduling Intelligence

## 1. Overview & Core Philosophy
The FitCore AI Receptionist Booking Engine bridges conversational AI with authoritative fitness operations. While Day 31 established read-only grounding and safe conversational flows, Day 32 enables controlled booking operations.

### Core Invariant
```
UNDERSTAND -> IDENTIFY -> SEARCH -> CHECK ELIGIBILITY -> PRESENT OPTIONS -> CONFIRM -> AUTHORIZE TOOL -> EXECUTE -> VERIFY -> RESPOND
```

The AI Receptionist is **never** permitted to directly execute arbitrary SQL, fabricate availability, bypass scheduling/cancellation rules, or claim that a booking succeeded without post-execution database verification.

---

## 2. Key Capabilities
1. **Live Discovery & Natural Date Parsing**:
   - Parses relative temporal expressions (`"tomorrow morning"`, `"tonight"`, `"next Monday"`) resolved against the outlet's configured timezone.
   - Calculates real-time spots remaining: `Math.max(0, session.capacity - confirmedCount)`.
   - Normalizes session states (`AVAILABLE`, `LIMITED` [<= 3 spots], `FULL`, `WAITLIST_AVAILABLE`, `BOOKING_CLOSED`).
2. **Multi-Outlet Context Disambiguation**:
   - When an organisation operates multiple locations and the customer has not specified an outlet, the receptionist clarifies rather than guessing.
3. **Canonical Eligibility Enforcement**:
   - Integrates with `BookingEligibilityService` without duplicating domain logic.
   - Validates active memberships, `GROUP_CLASSES` entitlement, outlet access scopes, booking advance windows, and schedule overlaps.
4. **Two-Step Confirmation State**:
   - High-risk operations (`CREATE_BOOKING`, `CANCEL_BOOKING`, `RESCHEDULE_BOOKING`, `JOIN_WAITLIST`) require explicit customer confirmation.
   - Generates single-use cryptographic tokens stored in `BookingConfirmationState` with a 10-minute TTL.
5. **Concurrency & Race Condition Defense**:
   - At confirmation execution time, re-checks capacity within a database transaction lock to defend against race conditions.
6. **Atomic Rescheduling**:
   - Validates target session eligibility and capacity *prior* to cancelling the original booking. If the target session fills up or fails, the member's existing spot is preserved.
7. **Post-Execution State Verification**:
   - `BookingVerificationService` queries the database post-mutation to confirm that records reflect expected state before reporting success to the customer.
8. **Zero-Side-Effect Dry Run Simulation**:
   - Enables staff and automated suites to test booking scenarios without creating database records.
