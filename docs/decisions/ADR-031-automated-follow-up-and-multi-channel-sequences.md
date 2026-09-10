# ADR-031: Automated Follow-Up and Multi-Channel Sales Sequences Architecture

## Status
Accepted

## Date
2026-09-10

## Context
Day 39 establishes the production foundation for **Automated Follow-Up and Multi-Channel Sales Sequences** across the FitCore platform.
It unifies the foundational engines established across:
- **Day 28**: Communication Engine (`CommunicationOrchestratorService`, multi-channel delivery, consent verification, quiet hours, audit logs)
- **Day 30**: Automated Engagement Workflows (`EngagementWorkflowService`, condition evaluation, step scheduling)
- **Day 33**: Multi-tenant Lead Capture (`Lead`, `LeadQualificationProfile`, consent statuses)
- **Day 35**: AI Receptionist Production Workflow (`ReceptionistInteraction`, `ReceptionistFollowUpTask`)
- **Day 36**: AI Sales Agent (`SalesConversation`, verified plan recommendations)
- **Day 37**: Commercial Sales Pipeline (`SalesPipeline`, `SalesOpportunity`, stage progressions)
- **Day 38**: AI Lead Qualification & Sales Discovery (`LeadQualificationProfile` 7 dimensions, objections, readiness)

Prior to Day 39:
- Follow-ups across the gym network were ad-hoc, manual, or scattered across disconnected communication jobs.
- Sequences lacked version-controlled blueprints with multi-channel step choreography (`EMAIL`, `SMS`, `WHATSAPP`, `PUSH`, `IN_APP`, `VOICE`).
- Inbound prospect replies (WhatsApp, SMS, Email) or CRM events (tour booked, trial attended, deal closed) did not automatically stop active sales sequences, causing embarrassing double-messaging.
- Outbound automated messages risked spamming prospects without respecting central consent, frequency caps, quiet hours, or active staff conversations.
- Attribution of conversions (sales closed, memberships purchased) was vulnerable to exaggerated causal claims rather than conservative observational tracking.

---

## Decision

### 1. Unified Multi-Tenant Follow-Up Data Model
We added canonical versioned sequence entities rather than duplicating CRM tables:
- `FollowUpSequence`: Organization- and outlet-scoped sequence definition (`name`, `type`, `triggerEvent`, `status`, `targetAudience`).
- `FollowUpSequenceVersion`: Immutable version record (`versionNumber`, `status`, `stopOnReply`, `stopOnBooking`, `stopOnConversion`, `stopOnStaffHandoff`, `cooldownHours`, `quietHoursStart`, `quietHoursEnd`).
- `FollowUpStep`: Discrete choreographed step (`stepOrder`, `channel`, `delayMinutes`, `requiresApproval`, `conditionRules`, `contentTemplate`, `aiDraftingEnabled`, `promptTemplateId`, `fallbackChannel`).
- `FollowUpEnrollment`: Per-lead / per-opportunity active execution tracker (`status`, `currentStepIndex`, `enrolledAt`, `stoppedAt`, `stopReason`, `completedAt`).
- `FollowUpStepExecution`: Execution audit record for each step (`channel`, `status`, `scheduledAt`, `executedAt`, `draftMessage`, `finalMessage`, `approvedById`, `deliveryStatus`, `communicationId`).
- `FollowUpSuppression`: Comprehensive suppression audit record capturing exact reason, policy, and actor.
- `FollowUpResponse`: Captured inbound prospect response (`responseType`, `channel`, `sentiment`, `intent`, `actionTaken`).
- `FollowUpOutcome`: Observational business outcome tracking (`outcomeType`, `value`, `attributedDelayHours`, zero causal overclaims).
- `FollowUpAssignment`: Multi-tenant staff ownership and operational routing.

### 2. Strict Delivery Authority Boundary (Zero Direct Provider Calls)
All communications must flow exclusively through Day 28 `CommunicationOrchestratorService`.
- No direct Twilio, SendGrid, Meta/WhatsApp, or Push provider SDK calls exist anywhere in the follow-up module.
- Channel fallbacks (e.g. `WHATSAPP` -> `SMS`) require verified channel consent before routing.
- The `communicationId` returned by Day 28 is authoritatively linked to `FollowUpStepExecution.communicationId`.

### 3. Centralized 14-Point Eligibility & Suppression Engine
Before enrolling a prospect or executing any step, `FollowUpEligibilityService` and `FollowUpSuppressionService` evaluate strict conditions:
1. Consent revoked or opted-out (`OPTED_OUT`, `UNSUBSCRIBED`, `RESTRICTED_BY_CONSENT`)
2. Lead already converted (`LEAD_ALREADY_CONVERTED`)
3. Opportunity won or closed (`DEAL_ALREADY_WON`)
4. Sequence or sequence version inactive (`SEQUENCE_INACTIVE`)
5. Active human staff conversation in progress (`ACTIVE_STAFF_CONVERSATION`)
6. Active human staff takeover / handoff (`ACTIVE_STAFF_TAKEOVER`)
7. Prospect booked or trial active (`ALREADY_BOOKED`)
8. Quiet hours active in prospect outlet timezone (`QUIET_HOURS_ACTIVE`)
9. Frequency cap exceeded (max messages per 24h/7d) (`FREQUENCY_CAP_EXCEEDED`)
10. Organization or outlet cooldown window active (`COOLDOWN_ACTIVE`)
11. Existing active enrollment in identical sequence (`ALREADY_ENROLLED`)
12. Channel unconsented or unreachable (`CHANNEL_UNCONSENTED`)
13. Medical condition flagged requiring human review (`MEDICAL_SAFETY_SUPPRESSION`)
14. Prospect explicitly requested do-not-contact (`DO_NOT_CONTACT_REQUESTED`)

### 4. Grounded Context Personalization (Zero Redundant Questions)
`FollowUpContextService` combines prospect information, Day 38 qualification profiles, Day 37 opportunity context, and Day 35 interaction history:
- Prohibits asking discovery questions that the prospect already answered in Day 38 (e.g. primary goal, timeline, schedule preference).
- Prohibits referencing resolved objections as if they remain blockers.
- Personalizes greeting, outlet details, preferred workout times, and next best action based on verified database records.

### 5. AI Message Drafting with Safety & Token Governance
When `aiDraftingEnabled: true`:
- Leverages the canonical prompt `follow_up_message.v1` registered with Day 19 `PromptRegistryService`.
- Enforces strict JSON schema validation (`messageText`, `suggestedChannel`, `tone`, `safetyFlags`, `containsMedicalAdvice`, `containsPricePromise`).
- Disallows medical diagnosis, physical therapy advice, or unverified price discounts.
- Records token usage and latency through Day 19 `AIUsageService` under feature `'FOLLOW_UP_MESSAGE'`.

### 6. Human Approval Gates
- Any sequence step marked with `requiresApproval: true` enters `PENDING_APPROVAL` status upon generation.
- The message is held in the staff operational inbox.
- Delivery cannot proceed until staff explicitly invokes `approveStepExecution` with optional edits.
- Staff rejections mark execution `REJECTED` and safely advance or pause the enrollment.

### 7. Deterministic Stop Conditions & Response Detection
When an inbound customer response or business event occurs:
- Inbound messages pass to `FollowUpResponseService.processResponse()`.
- Sequence stop conditions (`stopOnReply`, `stopOnBooking`, `stopOnConversion`, `stopOnStaffHandoff`) trigger immediate termination (`STOPPED`) with explicit `stopReason`.
- Stop events emit audit logs and cancel any pending scheduled future steps.

### 8. Observational Attribution Engine
- Outcomes (`BOOKING_COMPLETED`, `TRIAL_ATTENDED`, `TOUR_COMPLETED`, `MEMBERSHIP_PURCHASED`, `OPPORTUNITY_WON`) are linked observationally to enrollments.
- Strict anti-overclaim invariant: attribution uses conservative language (`conversion_following_follow_up`) and records timestamps and delay hours without claiming solitary causation.

---

## Consequences

### Positive
- **Guaranteed Consistency**: Uniform multi-channel touchpoints across the entire prospect lifecycle (Day 0, Day 1, Day 3, Day 7).
- **Spam & Embarrassment Elimination**: Automated stop on reply/booking prevents sending automated prompts to prospects who already responded or visited.
- **Full Legal & Ethical Compliance**: Respects quiet hours, explicit marketing consents, and medical safety flags.
- **Complete Auditability**: Every enrollment, execution, draft, override, suppression, and outcome is permanently logged in PostgreSQL.

### Negative / Trade-offs
- Background queue delays and scheduler cron execution must be actively monitored in high-throughput production environments.
- Staff must actively review steps configured with `requiresApproval: true` to avoid message delivery delays.
