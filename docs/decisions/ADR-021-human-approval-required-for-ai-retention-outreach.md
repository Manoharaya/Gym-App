# ADR-021: Human Approval Required for AI Retention Outreach

## Status
Accepted

## Date
2026-09-08

## Context
Across Days 25, 26, and 27, the FitCore platform developed comprehensive behavioral telemetry analysis:
- Day 25: Member Engagement Intelligence & Personal Baselines
- Day 26: AI Retention Intelligence & Risk Factors
- Day 27: AI Reactivation & Recovery Workflows

In Day 29, the platform introduces the **AI Retention Agent** to connect these observational foundations directly to member communication and recovery actions. However, autonomous AI communication presents severe brand, legal, and operational risks:
1. Hallucinated or tone-deaf messages (e.g. guilt-tripping members about missed visits).
2. Unwanted spam or message flooding.
3. Premature disclosure of internal risk scores or algorithmic predictions (e.g. "We think you are going to cancel").
4. Accidental breach of quiet hours, communication consent, or opt-out choices.
5. Inappropriate medical, psychological, or injury assumptions.

## Decisions

### 1. Mandatory Human-in-the-Loop (HITL) Approval
The AI Retention Agent is strictly prohibited from autonomously contacting members or dispatching communications.
The operational pipeline is non-negotiable:
```text
OBSERVE → IDENTIFY → EXPLAIN → RECOMMEND → DRAFT → HUMAN APPROVAL → COMMUNICATE → TRACK → LEARN
```
- Every AI-generated outreach is created in `PENDING_APPROVAL` status with an assigned staff member (Owner, Manager, or assigned Trainer).
- An authorized human staff member must review, optionally edit the text or channel, and explicitly approve the outreach before it can enter the queue.
- Rejection or cancellation requires staff documentation to feed back into platform learning.

### 2. Zero Direct Vendor or Provider Integration
The AI Retention Agent possesses zero direct integration with external LLMs or communication providers (Twilio, SendGrid, Meta WhatsApp, FCM, APNs).
- All AI inferences pass through the Day 19 `AIOrchestratorService` and `ModelGatewayService`.
- All outbound communications pass through the Day 28 `CommunicationOrchestratorService`.
- The agent has strictly read-only tools; it possesses no write tools capable of modifying memberships, booking classes, issuing discounts, or sending messages.

### 3. Sensitive Data Boundary & Non-Clinical Framing
In compliance with Day 19 data classification:
- Personal health documents, PAR-Q answers, medical diagnoses, medications, payment credentials, and confidential staff notes are strictly excluded from AI prompts and context.
- The agent is forbidden from diagnosing burnout, depression, injuries, or clinical conditions.
- Messages must never shame, guilt, or scold members. Accusatory questions like "Why haven't you been coming?" are replaced with supportive, flexible assistance (e.g., "Hi {{firstName}}, we noticed you haven't been in recently. If you'd like, we can help you find a session that fits your schedule.").

### 4. Non-Causal Re-engagement Outcome Tracking
When a member attends the gym, completes a workout, or books a class following outreach delivery:
- The platform records an **observed outcome** (e.g., `CLASS_ATTENDED`, `WORKOUT_COMPLETED`, `BOOKING_CREATED`, `REENGAGED`).
- The system explicitly avoids claiming causal attribution (e.g., "The AI message caused the member to return").

### 5. Multi-Tenant and Trainer Client Assignment Scoping
All queries, queues, and approval operations enforce multi-tenant isolation (`organisationId`, optional `outletId`).
Personal Trainers are restricted strictly to their assigned clients via `TrainerClientAssignment`. Cross-tenant or unassigned client access is denied at the service and controller boundary.

### 6. Multilingual Support
Message drafts support the platform's localization framework, generating warm and natural outreach in English or Nepali based on the member's preferred communication language.

---

## Consequences

### Positive
- Ensures complete brand protection and human ownership of member relationships.
- Prevents embarrassing automated AI blunders or sensitive data leaks.
- Guarantees compliance with Day 4 consent records and Day 28 quiet hours and opt-outs.
- Builds trust with gym owners, managers, trainers, and gym members.

### Trade-offs / Mitigations
- Requires staff attention: Outreaches cannot be sent without human action.
  - *Mitigation*: The staff dashboard provides streamlined single-click approval, pre-populated personalized drafts, and batch review queues.
- Inactive outreaches can accumulate if staff fail to review them.
  - *Mitigation*: Background jobs monitor pending tasks and auto-expire unacted outreaches after 14 days.
