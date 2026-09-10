# ADR-027: AI Receptionist Production Workflow Architecture

## Status
Accepted

## Date
2026-09-10

## Context
Days 31 to 34 established conversational context access, controlled booking mutations, lead capture & qualification, and real-time voice channel capabilities. Day 35 requires turning these features into a reliable **business operating workflow** connecting customer interactions across all channels (Web, WhatsApp, SMS, Email, Voice) to staff handoffs, follow-up tasks, callback requests, Day 28 notifications, Day 30 automation events, and staff operations dashboards.

Key engineering constraints:
1. **AI as Assistant, not Autonomous Employee**: The AI must never be allowed to directly mutate sensitive database entities or claim unverified domain success ("Done").
2. **Reuse Existing Infrastructure**: Prevent duplication of the Day 30 Automation Engine, Day 28 Communication Engine, Lead domain, Booking domain, and Staff RBAC.
3. **Deterministic Business Rules**: Pricing exceptions, customer complaints, private account lookups, and booking confirmations must be enforced in backend code rather than relying solely on LLM prompt instructions.
4. **Day 36 Readiness**: Expose a clean boundary (`RECEPTIONIST_SALES_HANDOFF_REQUESTED`) so qualified prospects can transition to Day 36's AI Sales Agent without duplicating lead records.

---

## Decision

### 1. Canonical Interaction Model & Deterministic State Machine
We created the canonical `ReceptionistInteraction` entity to record cross-channel touchpoints:
- Channels: `WEB`, `WHATSAPP`, `SMS`, `EMAIL`, `VOICE`.
- Deterministic states: `ACTIVE` $\rightarrow$ `COMPLETED`, `ABANDONED`, `FAILED`, `HANDED_OFF`, `FOLLOW_UP_REQUIRED`.
- Authoritative outcomes: `BOOKING_CREATED`, `BOOKING_CANCELLED`, `WAITLIST_JOINED`, `LEAD_CREATED`, `LEAD_QUALIFIED`, `STAFF_HANDOFF`, `CALLBACK_REQUESTED`, `INFORMATION_PROVIDED`, `UNRESOLVED`, `FAILED`.
- Outcome source tracking: `AI`, `CUSTOMER`, `STAFF`, `SYSTEM`.

### 2. Safety Invariant: Authoritative Outcome Resolution
The AI cannot claim domain success unless the underlying authoritative domain confirms the transaction. If a booking, lead, or transfer fails, the system returns a safe explanation, records `FAILED`, and queues staff follow-up rather than hallucinating success.

### 3. Staff Routing & Employment Invariants
The `ReceptionistRoutingService` evaluates staff assignments based on:
- `BY_OUTLET`, `BY_ROLE` (`RECEPTION`, `TRAINER`, `FINANCE`, `OUTLET_MANAGER`), and `ROUND_ROBIN`.
- Strict employment verification: Terminated (`TERMINATED`) and suspended (`SUSPENDED`) staff are strictly prohibited from receiving task or handoff assignments.

### 4. Conversational Loop Protection
To prevent runaway loops between the AI and external tools, the `ReceptionistEscalationService` enforces hard limits:
- Max consecutive errors: 3 failures $\rightarrow$ immediate handoff with `TECHNICAL_FAILURE`.
- Max repeated tool calls: 3 $\rightarrow$ follow-up task queued.
- Max conversational turns: 20 $\rightarrow$ handoff with `COMPLEX_REQUEST`.

### 5. Integration with Day 28 Communication & Day 30 Automation
- Staff alerts for handoffs and tasks are dispatched via Day 28 `NotificationOrchestratorService` with sanitized content (zero private health info, zero internal AI scores).
- Receptionist domain events (`RECEPTIONIST_INTERACTION_STARTED`, `RECEPTIONIST_INTERACTION_COMPLETED`, `RECEPTIONIST_MISSED_CALL`, etc.) are dispatched to Day 30 `WorkflowEngineService` with idempotency keys.
- Section 96/97: Qualified leads emit `RECEPTIONIST_SALES_HANDOFF_REQUESTED` to establish the boundary for Day 36's AI Sales Agent.

---

## Consequences

### Positive
- **Channel Neutrality**: Identical business rules, booking validations, and cancellation windows apply across all channels.
- **Operational Reliability**: Staff receive actionable handoff tickets with rule-based priorities (`LOW`, `NORMAL`, `HIGH`, `URGENT`) and clear summaries.
- **Zero Hallucinated Success**: Eliminates false promises to members regarding bookings or custom discounts.
- **Privacy Compliance**: Excludes clinical health data and unconsented outbound marketing to unknown phone callers.

### Negative / Tradeoffs
- Staff must maintain up-to-date outlet assignments in `StaffOutletAssignment` for role-based routing to find valid candidates.
