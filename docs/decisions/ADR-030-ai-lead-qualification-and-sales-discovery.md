# ADR-030: AI-Powered Lead Qualification and Sales Discovery Architecture

## Status
Accepted

## Date
2026-09-10

## Context
Day 38 introduces the production foundation for **AI-Powered Lead Qualification and Sales Discovery** in FitCore.
Prior milestones delivered:
- **Day 33**: Multi-tenant lead capture, baseline qualification, duplicate prevention, and consent tracking (`Lead`, `LeadQualificationProfile`).
- **Day 35**: AI Receptionist operational workflow, triage, and handoffs (`ReceptionistInteraction`, `ReceptionistFollowUpTask`).
- **Day 36**: AI Sales Agent consultative conversations, verified plan recommendations, and next best actions (`SalesConversation`, `SalesRecommendation`).
- **Day 37**: Commercial sales pipeline, kanban board, and deal tracking (`SalesPipeline`, `SalesPipelineStage`, `SalesOpportunity`).

Before Day 38:
- Prospect conversations generated unstructured text that remained locked in chat logs.
- Sales staff, outlet managers, and receptionists lacked a structured, explainable qualification profile.
- Objections were mentioned in passing without lifecycle resolution tracking (`OPEN` -> `PARTIALLY_ADDRESSED` -> `RESOLVED`).
- Staff corrections could be inadvertently overwritten by stale background AI extractions.
- Completeness and high-intent scoring lacked deterministic, transparent, and auditable mathematical formulas.
- Medical safety concerns and financial ability profiling risked compliance and ethical boundaries if not strictly controlled.

---

## Decision

### 1. Unified Multi-Tenant Data Model Extension (No Second CRM)
We extended the existing Day 33 `LeadQualificationProfile` rather than creating redundant tables:
- Added schedule fields: `preferredDays`, `preferredTimes`, `frequencyPreference`, `scheduleFlexibility`.
- Added location preferences: `preferredOutletId`, `preferredOutletName`, `preferredLocationText`.
- Added budget sensitivity: `budgetSensitivity` (`HIGH`, `MODERATE`, `LOW`, `UNKNOWN`), `budgetRange`.
- Added decision factors, timeline, open questions, and constraints: `decisionFactors`, `timeline`, `questions`, `constraints`, `missingInformation`.
- Added deterministic metrics: `isHighIntent: Boolean`, `qualificationCompleteness: Int` (0-100%).
- Added staff override governance: `lastStaffOverrideAt`, `lastStaffOverrideById`, `qualificationVersion`.
- Created dedicated relational entities:
  - `LeadQualificationObjection`: Explicit objection lifecycle with type, severity (`LOW`, `MEDIUM`, `HIGH`, `BLOCKER`), customer quote, and resolution notes.
  - `LeadQualificationHistory`: Immutable field-level audit trail tracking every change, previous value, new value, actor type, and source evidence.

### 2. Precedence Hierarchy & Staff Override Invariant
To prevent AI hallucination or stale inference from overwriting human truth, all updates enforce a strict authority order:
`DIRECT_CUSTOMER_STATEMENT` > `VERIFIED_BUSINESS_EVENT` > `STAFF_ENTERED` > `AI_EXTRACTION` > `AI_INFERENCE`.
Staff manual updates set `lastStaffOverrideAt` and `lastStaffOverrideById`. Automated AI extractions cannot silently overwrite staff-entered values unless staff explicitly permits it or direct customer statements supersede.

### 3. Transparent 7-Dimension Completeness Engine
Completeness is computed deterministically across 7 explicit dimensions (Total 100%):
1. **Primary Goal (25%)**: Weight loss, muscle building, general fitness, performance, rehab, etc.
2. **Readiness / Buying Stage (20%)**: Exploring, interested, ready to visit, ready to try, ready to join.
3. **Timeline (15%)**: Immediate, today, this week, this month, exploring.
4. **Schedule Preference (15%)**: Preferred days, times, and flexibility.
5. **Budget Sensitivity (10%)**: Stated price sensitivity or range.
6. **Experience Level (10%)**: Beginner, intermediate, advanced, athlete.
7. **Location / Outlet Preference (5%)**: Specific outlet or proximity preference.

### 4. Deterministic High-Intent Lead Evaluation
A lead is flagged `isHighIntent = true` if:
- Readiness is `READY_TO_JOIN`, `READY_TO_TRY`, `READY_FOR_TRIAL`, `READY_FOR_TOUR`, or `READY_TO_VISIT`; OR
- Timeline is `IMMEDIATE` or `TODAY`; OR
- The prospect explicitly requested pricing, sign-up, or trial availability.

### 5. Medical Safety & Clinical Non-Intervention Boundary
Under no circumstances does the qualification engine make clinical diagnoses or store medical conditions as disqualifiers. If a prospect mentions injuries, surgeries, heart conditions, or pain:
- The system attaches a non-medical educational disclaimer.
- Flags `requiresHumanReview = true` and `qualificationStatus = NEEDS_HUMAN_REVIEW`.
- Recommends immediate human staff escalation with PAR-Q+ compliance.

### 6. Financial Ethics Boundary
The system only captures declared customer price sensitivity (`HIGH`, `MODERATE`, `LOW`). It is strictly prohibited from inferring creditworthiness, income brackets, or financial eligibility.

### 7. Objection Relational Lifecycle Management
Objections are tracked through an explicit lifecycle:
- `OPEN`: Detected or raised by customer.
- `PARTIALLY_ADDRESSED`: Educational or value proposition provided.
- `RESOLVED`: Customer accepted resolution or staff documented resolution.
- `DISMISSED`: Outdated or withdrawn concern.
Active `BLOCKER` objections automatically hold lead qualification in `NEEDS_HUMAN_REVIEW`, preventing premature pipeline advancement.

### 8. Day 37 Sales Pipeline Synchronization
When a lead achieves `QUALIFIED` status with completeness $\ge 60\%$ (and without active blocker objections), the system automatically advances any associated active opportunity in stage `NEW` or `CONTACTED` to stage `QUALIFIED`, adjusting probability to 70% (high intent) or 40% (standard intent).

### 9. Smart Discovery Question Prioritization
Discovery questions are generated dynamically to target missing dimensions (prioritized: Goal > Service Interest > Schedule > Budget > Experience > Timeline). Questions are capped at 1-2 per turn to avoid conversational interrogation, and support English, Nepali, and Romanized Nepali.

---

## Consequences

### Positive
- Unified source of truth: Sales, reception, and pipeline views consume the exact same qualification profile.
- Multilingual accessibility: Fully supports English, Nepali, and Romanized Nepali prospects.
- Compliance and safety: Clinical disclaimers and financial boundaries protect the organization.
- Transparent and explainable: Every score, recommendation, and diff has an immutable audit trail.
- Zero breaking changes across Days 33, 35, 36, and 37 suites.

### Negative / Trade-offs
- Slight database write overhead for immutable history diffs on each qualification change.
- Strict validation requires explicit types across all qualification fields.
