# FitCore AI Lead Qualification & Sales Discovery Architecture (Day 38)

## Overview

The FitCore Lead Qualification & Sales Discovery engine transforms unstructured prospect conversations into a structured, explainable, and multi-tenant qualification profile.

```
Prospect Interaction (Chat / WhatsApp / Voice / Form)
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│       AI Extraction / Deterministic Parser          │
│       Prompt: lead_qualification.v1                │
│       Languages: English, Nepali (नेपाली), Romanized│
└─────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│             Safety & Boundary Filters               │
│  - Medical Non-Diagnosis & Clinical Disclaimer     │
│  - Financial Non-Profiling Guardrail                │
└─────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│          Scoring & Evaluation Engine                │
│  - 7-Dimension Deterministic Completeness (0-100%)  │
│  - High-Intent Lead Evaluation                      │
│  - Precedence Hierarchy Enforcement                 │
└─────────────────────────────────────────────────────┘
                   │
                   ├──────────────────────┐
                   ▼                      ▼
┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│  Lead Qualification Persistence   │ │   Sales Pipeline Sync (Day 37)   │
│  - LeadQualificationProfile      │ │   - Auto-advance to QUALIFIED    │
│  - LeadQualificationObjection    │ │   - Probability: 70% high / 40%  │
│  - LeadQualificationHistory      │ └──────────────────────────────────┘
└──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│          Staff & Sales Agent Consumers              │
│  - Smart Discovery Questions (1-2 prioritized)      │
│  - Staff Manual Override with Immutable Audit Diffs │
│  - REST API /api/v1/leads/:leadId/qualification     │
└─────────────────────────────────────────────────────┘
```

---

## Precedence Hierarchy

1. `DIRECT_CUSTOMER_STATEMENT`: Direct explicit customer statement in text or voice transcript.
2. `VERIFIED_BUSINESS_EVENT`: Verified check-in, attended trial, completed tour, or signed contract.
3. `STAFF_ENTERED`: Front-desk or sales consultant manual entry or override.
4. `AI_EXTRACTION`: Structured extraction by LLM or deterministic parser.
5. `AI_INFERENCE`: Inferred likelihood based on contextual cues.

*Invariant*: Staff overrides cannot be overwritten by stale AI extractions without explicit authorization.

---

## 7-Dimension Completeness Formula

$$\text{Completeness} = \sum_{i=1}^7 w_i \cdot \mathbb{I}(\text{dimension}_i \text{ is present})$$

| Dimension | Weight | Criteria |
| :--- | :--- | :--- |
| **Primary Goal** | **25%** | Stated primary fitness or lifestyle goal |
| **Readiness** | **20%** | Clear buying/intent stage (`READY_TO_JOIN`, `READY_TO_TRY`, `READY_TO_VISIT`, `EXPLORING`) |
| **Timeline** | **15%** | Starting timeframe (`IMMEDIATE`, `THIS_WEEK`, `THIS_MONTH`, `EXPLORING`) |
| **Schedule Preference** | **15%** | Days, times (`MORNING`, `EVENING`, `WEEKEND`), or flexibility stated |
| **Budget Sensitivity** | **10%** | Stated price sensitivity (`HIGH`, `MODERATE`, `LOW`) or range |
| **Experience Level** | **10%** | Training background (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `ATHLETE`) |
| **Location / Outlet** | **5%** | Specific outlet ID, outlet name, or distance sensitivity |

---

## Objection Lifecycle

```
[ Customer Statement / AI Extraction ]
                  │
                  ▼
              ┌───────┐
              │ OPEN  │ ◄─── (Blocker objections hold lead in NEEDS_HUMAN_REVIEW)
              └───┬───┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌────────────────────┐ ┌───────────┐
│ PARTIALLY_ADDRESSED│ │ RESOLVED  │
└────────┬───────────┘ └───────────┘
         │                 ▲
         └─────────────────┘
```

- **Types**: `PRICE_OR_MEMBERSHIP_COST`, `SCHEDULE_OR_TIME_COMMITMENT`, `LOCATION_OR_DISTANCE`, `FACILITY_FEATURES`, `EXPERIENCE_OR_INTIMIDATION`, `CONTRACT_OR_COMMITMENT`, `CHILDCARE_OR_FAMILY`, `DECISION_MAKER_CONSULTATION`, `OTHER`.
- **Severities**: `LOW`, `MEDIUM`, `HIGH`, `BLOCKER`.

---

## REST API Endpoints

All endpoints are hosted under `/api/v1/leads/:leadId/qualification` and require `Authorization: Bearer <token>` and `x-organisation-id: <orgId>`.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/leads/:leadId/qualification` | Full view: lead info, extended profile, active objections, audit history |
| `POST` | `/api/v1/leads/:leadId/qualification/extract` | Trigger extraction from conversational text or message |
| `PATCH` | `/api/v1/leads/:leadId/qualification` | Staff manual override with field diff tracking and rationale |
| `GET` | `/api/v1/leads/:leadId/qualification/questions` | Get prioritized discovery questions for missing profile dimensions |
| `POST` | `/api/v1/leads/:leadId/qualification/objections` | Record a new structured objection |
| `PATCH` | `/api/v1/leads/:leadId/qualification/objections/:objectionId` | Update objection status or resolution notes |
| `GET` | `/api/v1/leads/:leadId/qualification/history` | Retrieve full immutable qualification audit trail |
