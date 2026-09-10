# Lead Data Model & Lifecycle Specifications

## 1. Entity Relationship Overview

The lead domain introduces three primary entities in Prisma:
1. `Lead`: Core prospect record scoped to `Organisation` and optionally `Outlet`.
2. `LeadQualificationProfile`: 1-to-1 structured qualification context.
3. `LeadActivity`: Immutable activity audit log and interaction timeline.

```text
Organisation ───< Lead ─── 1:1 ─── LeadQualificationProfile
     │              │
     │              └───< LeadActivity
     │
   Outlet (Optional scoping)
```

---

## 2. Schema Specification

### `Lead` Entity
- `id`: String (CUID primary key)
- `organisationId`: String (Multi-tenant partition key)
- `outletId`: String? (Preferred or assigned outlet location)
- `source`: String (Default: `AI_RECEPTIONIST`)
- `status`: String (Enum: `NEW`, `CONTACTED`, `QUALIFYING`, `QUALIFIED`, `UNQUALIFIED`, `CONVERTED`, `LOST`, `DO_NOT_CONTACT`)
- `firstName`, `lastName`: String?
- `email`: String? (Normalized lowercase)
- `phone`: String? (Normalized numeric)
- `preferredContactChannel`: String? (`EMAIL`, `SMS`, `WHATSAPP`, `PHONE`)
- `preferredLanguage`: String (Default: `'en'`)
- `consentStatus`: String (`NOT_REQUESTED`, `GRANTED`, `DENIED`, `WITHDRAWN`)
- `consentSource`: String?
- `consentedAt`: DateTime?
- `score`: Int (0–100, default: 0)
- `scoreVersion`: Int (default: 1)
- `scoreFactors`: Json (Array of factor items)
- `scoreCalculatedAt`: DateTime?
- `assignedStaffId`: String?
- `assignedOutletId`: String?
- `assignedAt`: DateTime?

### `LeadQualificationProfile` Entity
- `id`: String (CUID)
- `leadId`: String (Unique foreign key to `Lead`)
- `goals`: String[] (Extracted fitness goals)
- `serviceInterests`: String[] (e.g. `MEMBERSHIP`, `PERSONAL_TRAINING`, `GROUP_CLASSES`, `TRIAL`)
- `preferredOutletId`: String?
- `preferredSchedule`: String? (`MORNING`, `EVENING`, `FLEXIBLE`, etc.)
- `experienceLevel`: String? (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`)
- `readiness`: String (`EXPLORING`, `INTERESTED`, `READY_TO_TRY`, `READY_TO_JOIN`)
- `priceSensitivity`: String (`PRICE_SENSITIVE`, `VALUE_FOCUSED`, `FLEXIBLE`)
- `objections`: Json (Array of objection objects)
- `qualificationStatus`: String (`NOT_STARTED`, `IN_PROGRESS`, `PARTIALLY_QUALIFIED`, `QUALIFIED`, `UNQUALIFIED`, `NEEDS_HUMAN_REVIEW`)
- `recommendedNextAction`: String?
- `nextActionReason`: String?
- `aiConfidence`: Float? (0.00 – 1.00)
- `aiEvidence`: Json (Array of extracted evidence observations)
- `aiSummary`: String? (Human-readable summary for staff)

### `LeadActivity` Entity
- `id`: String (CUID)
- `leadId`: String
- `organisationId`: String
- `activityType`: String (`LEAD_CREATED`, `CONTACT_UPDATED`, `QUALIFICATION_UPDATED`, `LEAD_QUALIFIED`, `STAFF_ASSIGNED`, `HANDOFF_CREATED`, etc.)
- `actorType`: String (`AI_RECEPTIONIST`, `STAFF`, `SYSTEM`, `CUSTOMER`)
- `title`: String
- `description`: String?
- `metadata`: Json?
- `createdAt`: DateTime

---

## 3. Lifecycle State Machine

```text
       ┌───────────────┐
       │      NEW      │
       └───────┬───────┘
               │ (Staff outreach / Chat response)
               ▼
       ┌───────────────┐
       │   CONTACTED   │
       └───────┬───────┘
               │ (Gathering qualification signals)
               ▼
       ┌───────────────┐
       │  QUALIFYING   │
       └───────┬───────┘
               │
        ───────┴───────────────────────
       │                              │
       ▼                              ▼
┌──────────────┐              ┌──────────────┐
│  QUALIFIED   │              │ UNQUALIFIED  │
└──────┬───────┘              └──────────────┘
       │ (Contract & Payment completed)
       ▼
┌──────────────┐
│  CONVERTED   │
└──────────────┘
```
