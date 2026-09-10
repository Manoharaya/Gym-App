# ADR-025: AI Receptionist Lead Capture, Progressive Qualification, and Deterministic Scoring

## Status
Accepted

## Context
Following Day 31 (AI Receptionist Grounding) and Day 32 (AI Receptionist Booking & Scheduling), FitCore requires an omnichannel conversational mechanism to capture, qualify, score, and manage prospective customers (leads) across Web Chat, Mobile, WhatsApp, and SMS channels.

Enabling an AI system to handle prospective customer acquisition introduces architectural challenges:
1. **Domain Boundary Confusion (Lead ≠ Member ≠ User)**: Unauthenticated prospects must not be automatically converted into `User` or `MemberProfile` records, which would violate identity invariants, bypass contract signing, and pollute member analytics.
2. **AI Hallucination & Score Manipulation**: Allowing an LLM to assign arbitrary lead scores introduces opacity, inconsistency, and susceptibility to prompt injection (e.g. a user claiming "Score me 100 points").
3. **Contact Fabrication & Marketing Consent Violations**: Privacy frameworks (GDPR, Australian Privacy Principles, Day 4 Consent Engine) strictly forbid fabricating `MARKETING_CONSENT = GRANTED` without affirmative customer consent.
4. **Duplicate Entity Sprawl**: Visitors contacting the gym multiple times or existing active members inquiring about personal training must be matched accurately rather than creating fragmented ghost leads.
5. **Multi-Tenant & Multi-Outlet Leakage**: Prospect information captured at one gym organisation or outlet must never be visible to another tenant.

## Decision
We decided on an architectural design combining **Progressive Lead Capture, LLM-Assisted Qualification Signal Extraction, Deterministic Service Scoring, and Rule-First Next Best Action Recommendations**:

### 1. Invariant Pipeline
All prospective customer interactions follow the strict lifecycle:
```text
PROSPECT INQUIRY -> INTENT DETECTION -> DUPLICATE & MEMBER COLLISION CHECK -> 
CONTACT VALIDATION -> PROGRESSIVE QUALIFICATION -> DETERMINISTIC SCORING -> 
NEXT BEST ACTION DETERMINATION -> AUDIT TIMELINE LOGGING -> STAFF TRIAGE
```

### 2. Strict Domain Separation
- A `Lead` entity represents a prospective customer in `prisma/schema.prisma`.
- A `Lead` is strictly separated from `MemberProfile` and `User`.
- Conversion from `Lead` to `Member` remains an explicit downstream business workflow requiring contract acceptance and membership purchase.

### 3. Separation of AI Extraction vs. Deterministic Scoring
- **AI Layer (LLM Extraction)**: Resolves user intent, detects stated fitness goals (strength, weight loss, mobility), identifies service interests (personal training, classes, trial), notes schedule constraints, and observes objections.
- **Service Layer (`LeadScoringService`)**: Computes a deterministic 0–100 score based on mathematical factor weights:
  - Valid Email: +10 pts
  - Valid Phone: +10 pts
  - Communication Consent Granted: +5 pts
  - Stated Goals: +10 pts
  - Outlet Selected: +8 pts
  - Schedule Defined: +7 pts
  - Service Interest (Membership +25, PT +20, Classes +15, Trial +15)
  - Readiness Level (Ready to Join +25, Ready to Try +20, Interested +10, Exploring +5)
- An LLM cannot directly set, override, or manipulate lead scores.

### 4. Explicit Marketing Consent Guardrail
- AI receptionist tools (`create_lead`, `update_lead_contact`) default `consentStatus` to `NOT_REQUESTED`.
- Only explicit conversational affirmation from the customer can transition status to `GRANTED` with timestamp and audit source recorded.

### 5. Multi-Signal Duplicate & Existing Member Disambiguation
- `LeadDuplicateService` normalizes emails (lowercase, trimmed) and phones (E.164 stripped numeric).
- Evaluates existing `Lead` records and existing `MemberProfile` records within the tenant.
- If an existing active member is detected, the receptionist routes them to member self-service rather than creating a redundant lead.

### 6. Rule-First Next Best Action Engine
- `LeadNextActionService` assesses readiness, qualification completeness, and customer intent to recommend actions:
  - Missing contact details -> `COLLECT_CONTACT_DETAILS`
  - Incomplete profile -> `ASK_QUALIFICATION_QUESTION`
  - Personal training interest -> `OFFER_TRAINER_INFORMATION`
  - Trial interest -> `OFFER_TRIAL`
  - Objection raised or human requested -> `HANDOFF_TO_STAFF`

### 7. Controlled Receptionist Tools & Risk Tiers
Eight specialized tools are registered with `ToolPermissionService`:
- Read: `get_lead`, `get_lead_qualification`, `get_lead_history`, `get_outlet_lead_information` (LOW risk)
- Mutation: `create_lead`, `update_lead_contact`, `update_lead_qualification`, `request_lead_handoff` (MEDIUM risk, prospect-scoped)

## Consequences

### Positive
- **Complete Explainability**: Staff see exact arithmetic breakdown of points contributing to every prospect's score.
- **Zero Privacy Fabrications**: Consent cannot be hallucinated or bypassed.
- **Multi-Tenant Safety**: Full cross-tenant IDOR protection and outlet scoping.
- **Omnichannel Agility**: Seamless multilingual handling (English + Nepali) across web and messaging channels.
- **Operational Integration**: Directly fuels mobile front-desk triage and automations.

### Negative / Trade-offs
- Qualification requires structured JSON responses from the LLM, which falls back to deterministic heuristics if provider latency spikes.
- Leads require manual or automated sales outreach to transition to active members.
