# ADR-029: Sales Pipeline and Opportunity Management Architecture

## Status
Accepted

## Date
2026-09-10

## Context
Day 37 introduces the production foundation for the **FitCore Sales Pipeline and Opportunity Management**.
Prior days established:
- Day 33: Multi-tenant Lead capture, progressive qualification, and scoring (`Lead`, `LeadQualificationProfile`).
- Day 35: AI Receptionist operational workflows, triage, and handoffs (`ReceptionistInteraction`, `ReceptionistFollowUpTask`).
- Day 36: AI Sales Agent conversational discovery, grounded recommendations, and next best actions (`SalesConversation`, `SalesRecommendation`, `SalesNextAction`).

Without a formal commercial pipeline, sales opportunities cannot be tracked systematically:
- Prospect deals are lost across chaotic communication channels.
- Stage progression lacks auditability, velocity metrics, and standard operating definitions.
- Simultaneous concurrent modifications by staff and AI lead to lost updates or incorrect stages.
- Autonomous AI agents could hallucinate or prematurely declare deals "converted" without commercial verification.
- Fitness organizations lack kanban visibility into their active pipeline value, conversion rates, and drop-off causes.

---

## Decision

### 1. Distinct Separation of Responsibilities: Lead vs. Opportunity vs. Pipeline
We strictly separated three core concepts:
- **`Lead`** (Person/Contact): The prospective buyer captured in Day 33, representing identity, contact channels, consent, and cumulative qualification profile.
- **`SalesOpportunity`** (Commercial Deal): The active transaction with a target value, expected close date, current stage, assigned owner staff, and velocity tracking. A lead may generate multiple opportunities over time (e.g. initial trial, annual renewal), but only one active opportunity per pipeline.
- **`SalesPipeline`** (Business Process): The structured workflow consisting of ordered stages (`SalesPipelineStage`), default SLA hours, colors, and terminal criteria. Organizations receive a seeded canonical 8-stage pipeline by default.

### 2. Canonical 8-Stage State Machine Model
The commercial journey standardizes across 8 canonical stages:
1. `NEW` (Position 0): Captured lead, pending initial outreach or triage (2h SLA).
2. `CONTACTED` (Position 1): Outreach initiated via AI, voice, SMS, email, or WhatsApp (24h SLA).
3. `QUALIFIED` (Position 2): Prospect intent, schedule, readiness, and budget verified (48h SLA).
4. `TRIAL` (Position 3): Active or scheduled trial workout pass (72h SLA).
5. `TOUR_BOOKED` (Position 4): In-person facility tour scheduled (48h SLA).
6. `OFFERED` (Position 5): Official proposal or contract extended (48h SLA).
7. `CONVERTED` (Position 6, Terminal): Authoritatively converted into active paying member.
8. `LOST` (Position 7, Terminal): Closed lost with mandatory structured loss reason.

### 3. Concurrency Safety & Optimistic Locking
To prevent lost updates in multi-user and AI-assisted environments:
- `SalesOpportunity` includes a strictly incrementing integer `version: Int @default(1)`.
- Transitions execute in Prisma transactions with optimistic concurrency validation. Mismatched versions throw `ConflictException` (HTTP 409).

### 4. Authoritative Conversion Invariant
To preserve commercial and accounting truth:
- AI agents are structurally prohibited from transitioning opportunities to `CONVERTED`.
- Conversion requires domain proof: an active `MemberMembership` record, an official `MembershipPlan` purchase, or a verified administrative override with rationale.
- Successful conversion aligns the parent `Lead.status` to `CONVERTED`.

### 5. Structured Loss Tracking & Explicit Reopening
- Transition to `LOST` requires a standardized `lossReason` (`PRICE`, `NO_RESPONSE`, `NOT_INTERESTED`, `CHOSE_COMPETITOR`, `LOCATION`, `SCHEDULE`, `SERVICE_MISMATCH`, `TIMING`, `FAILED_TRIAL`, `FAILED_TOUR`, `COULD_NOT_CONTACT`, `DUPLICATE`, `INVALID_LEAD`, `OTHER`).
- Terminal lost opportunities can be explicitly reopened back to `NEW`, `CONTACTED`, or `QUALIFIED` with mandatory `reopenReason`, clearing loss notes while retaining complete historical audit trails.

### 6. Full Event & Activity Timeline Integration
- Automated `STAGE_CHANGE` activities are logged upon transition.
- Follow-up `SalesTask` scheduling automatically recalculates `nextActionAt` on the opportunity.
- Domain events (`sales.opportunity.created`, `stage_changed`, `converted`, `lost`) are dispatched to Day 30 `WorkflowEngineService`.
- Full audit logs (`AuditService`) record actors, durations, and version increments.

---

## Consequences

### Positive
- **Standardized Commercial Operations**: Universal across boutique gyms, CrossFit studios, martial arts centers, and enterprise multi-outlet chains.
- **Auditable & Concurrency-Safe**: Complete history of every stage transition, duration in stage, actor type, and optimistic locking prevents race conditions.
- **Revenue Integrity**: Non-negotiable conversion verification stops AI hallucinations from inflating sales metrics.
- **High Visibility**: Real-time Kanban board with stage totals, deal cards, and deterministic velocity/conversion metrics.

### Negative / Trade-Offs
- Requires explicit optimistic locking `version` payload in API requests.
- Strict state machine validation requires intentional reopening workflows rather than arbitrary drag-and-drop stage hops.
