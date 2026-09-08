# ADR-022: Deterministic Automated Engagement Workflow Engine

## Status
**Accepted**

## Date
2026-09-08

## Context
In Days 25–29, FitCore developed core telemetry and AI retention capabilities:
- Day 25: Member Engagement Intelligence & Retention Risk Foundation
- Day 26: AI Retention Intelligence
- Day 27: AI Reactivation & Member Recovery
- Day 28: Centralized Communication & Notification Engine
- Day 29: AI Retention Agent & Canonical Retention Data Definitions

Gym operators require automated, event-driven workflows for common engagement touchpoints (e.g. 14-day inactivity check-ins, attendance drops, class no-shows, membership renewals, and milestone celebrations). However, allowing AI or automation to execute high-risk operations autonomously poses severe business risks:
1. Accidental contract cancellations, unauthorized price modifications, or improper discounts.
2. Member spamming or message fatigue across uncoordinated channels.
3. Insensitive, shaming, or guilt-inducing messaging.
4. Spurious causal claims ("Workflow caused member to renew").

## Decision

We have implemented a **Deterministic, Event-Driven Automated Engagement Workflow Engine**:

```text
EVENT → RULE → ELIGIBILITY → SAFETY → ACTION → APPROVAL → EXECUTION → OUTCOME
```

Key architectural tenets:

1. **Deterministic Rule Engine over Autonomous Agents**:
   - Workflows are defined deterministically with declarative leaf and compound (`AND` / `OR`) condition trees.
   - The AI Assistant (`AUTOMATION_ASSISTANT`) acts solely as a drafter and recommender, never as an unconstrained autonomous executor.

2. **Strictly Prohibited High-Risk Actions**:
   - Zero autonomous mutations for: `CANCEL_MEMBERSHIP`, `MODIFY_PRICE`, `APPLY_DISCOUNT`, `UPDATE_PAYMENT_METHOD`, `REVOKE_GATE_ACCESS`.
   - Validated at schema ingestion and step execution time.

3. **Mandatory Centralized Communication Routing**:
   - All outbound messages route strictly through Day 28 `CommunicationOrchestratorService`.
   - Direct provider calls (Twilio, SendGrid, WhatsApp) are forbidden.

4. **Configurable Human-in-the-Loop (HITL) Review**:
   - Workflows can mandate staff approval (`approvalMode: ALWAYS_REQUIRED` or `requireApproval: true`).
   - Actions pause in `AWAITING_APPROVAL` until staff explicitly approve or reject them.

5. **Multi-Scope Cooldown & Safety Guardrails**:
   - Granular cooldown scopes: `MEMBER`, `WORKFLOW`, `MEMBER_AND_WORKFLOW`, `ORGANISATION`.
   - Quiet hours protection automatically defers overnight messages to daylight hours.
   - Anti-shaming linguistic filter blocks derogatory or guilt-inducing copy.

6. **Non-Causal Outcome Framing**:
   - Post-workflow engagement telemetry is framed strictly as:
     `subsequentVisitsFollowingWorkflow`, `subsequentBookingsFollowingWorkflow`, `engagementTrendFollowingWorkflow`.
   - Never states or implies causation.

7. **Bilingual Copy Standards**:
   - Templates include supportive English and Nepali (`नमस्ते`) copy.

## Consequences

### Positive
- Gyms can automate critical member touchpoints safely at scale.
- Eliminates risk of automated billing or contract mishaps.
- Human review queue protects gym brand reputation.
- Complete auditability across all executions, steps, and outcomes.

### Trade-offs & Mitigations
- **Trade-off**: Staff must review sensitive actions in the approval queue.
- **Mitigation**: Low-risk informational notifications and staff tasks execute automatically when approved by policy.
