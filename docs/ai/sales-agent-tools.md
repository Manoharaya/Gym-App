# FitCore AI Sales Agent Tools & Execution Model

## Overview
The AI Sales Agent interacts with the FitCore platform through a schema-validated, permission-controlled, multi-tenant **Tool Registry** (`SalesToolRegistry`).

The agent is never permitted direct database access, raw SQL execution, or arbitrary network access. Every interaction passes through specific domain tools that enforce tenant boundaries (`organisationId`, `outletId`) and audit logging.

---

## Tool Categories

### 1. Grounded Business Read Tools
Read tools query authoritative database records without mutation.

| Tool Name | Parameters | Return Schema | Purpose |
| :--- | :--- | :--- | :--- |
| `getBusinessInfo` | `{ outletId?: string }` | Business profile, operating hours, amenities, address, policies | Answers general facility questions grounded in real settings |
| `getMembershipOptions` | `{ category?: string, limit?: number }` | List of active `MembershipPlan` records (id, name, price, inclusions, limits) | Grounds plan recommendations in verified pricing |
| `getMembershipPlanDetails` | `{ planId: string }` | Full plan entity with entitlements, rules, and restrictions | Deep dive on a single plan |
| `getClassSchedule` | `{ category?: string, date?: string }` | Active `ClassSession` records with capacity, instructor, time | Answers class timing and programming inquiries |
| `getTrainerProfiles` | `{ specialty?: string }` | Certified `TrainerProfile` records with bio and specialties | Introduces coaches and personal trainers |
| `getCurrentPromotions` | `{}` | Official active promotional campaigns | Provides official promotional details without hallucination |
| `getFacilityPolicies` | `{ topic?: string }` | Cancellation, guest pass, dress code, age limit rules | Answers rules and compliance inquiries |

---

### 2. Lead Management Tools
Reuses Day 33's `LeadsService` and `LeadQualificationService`.

| Tool Name | Parameters | Return Schema | Purpose |
| :--- | :--- | :--- | :--- |
| `findOrCreateLead` | `{ firstName, lastName, email?, phone?, channel }` | `LeadDto` | Matches existing lead or safely registers new prospect |
| `updateLeadQualification` | `{ leadId, goals?, schedule?, budget?, readiness? }` | Updated `LeadQualificationProfile` | Persists discovered sales signals into CRM |

---

### 3. Action Execution Tools
Controlled mutations that create operational next steps for prospects.

| Tool Name | Parameters | Side Effects | Purpose |
| :--- | :--- | :--- | :--- |
| `requestTrial` | `{ conversationId, leadId, preferredDate?, notes? }` | Transitions `SalesNextAction` to `EXECUTED`, updates `Lead.status` to `TRIAL_INTEREST`, creates `LeadActivity` | Issues verified complimentary trial pass |
| `requestTour` | `{ conversationId, leadId, preferredDate?, notes? }` | Transitions `SalesNextAction` to `EXECUTED`, updates `Lead.status` to `TOUR_SCHEDULED`, creates `LeadActivity` | Schedules guided facility walkthrough |
| `initiateHumanHandoff` | `{ conversationId, leadId, reason, priority, notes? }` | Creates `SalesHandoff` ticket, dispatches Day 28 staff notification | Escalates complex/urgent prospect to human staff |
| `handoffToReceptionist` | `{ conversationId, leadId, action, details? }` | Delegates session to Receptionist Booking Engine | Seamless handoff for operational class/session bookings |

---

## Security & Tenant Boundary Enforcement
- Every tool receives `organisationId` from the authenticated session context.
- Cross-tenant ID references throw `NotFoundException` (IDOR defense).
- Read operations filter by `isPublic: true` or active status to prevent leaking draft or legacy plans.
