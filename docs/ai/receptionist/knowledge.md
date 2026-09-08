# AI Receptionist — Grounded Knowledge System

## 1. Overview & Principles

The FitCore AI Receptionist is architected to eliminate hallucinations by anchoring every answer in authoritative organizational knowledge. Unlike generic LLM bots, it does not invent membership pricing, fabricate class schedules, or speculate on facility features.

### Core Tenets:
1. **Database Grounding First**: Structured domain models (`MembershipPlan`, `ClassType`, `ClassSession`, `TrainerProfile`, `Outlet`) are the primary source of truth.
2. **Curated Policy & Facility Docs**: Unstructured policies and facility details are authored and managed through versioned `ReceptionistKnowledgeSource` documents.
3. **Outlet Scoping & Precedence**: Outlet-specific knowledge takes priority over organization-wide general defaults when an inquiry targets a specific branch.
4. **Knowledge Gap Tracking**: Whenever a customer asks about an ungrounded topic or facility not listed in authoritative records, the system records a `ReceptionistKnowledgeGap` record for staff review.

---

## 2. Knowledge Model Structure

### 2.1 `ReceptionistKnowledgeSource`
```prisma
model ReceptionistKnowledgeSource {
  id                String    @id @default(cuid())
  organisationId    String
  outletId          String?   // null = Org-wide, non-null = Outlet-specific
  type              String    // Enum of 19 knowledge types
  title             String
  description       String?
  content           String    @db.Text
  sourceReferenceId String?
  status            String    @default("PUBLISHED") // DRAFT, PUBLISHED, ARCHIVED
  priority          Int       @default(0)
  visibility        String    @default("PUBLIC") // PUBLIC, CUSTOMER_VISIBLE, STAFF_ONLY, INTERNAL
  version           Int       @default(1)
  metadata          Json?
}
```

### 2.2 Supported Knowledge Types (19 Types)
* `ORGANISATION_PROFILE`: General gym philosophy, founding details, executive management.
* `OUTLET_PROFILE`: Location details, directions, landmark proximity.
* `OPENING_HOURS`: Regular weekday and weekend operating schedules.
* `HOLIDAY_HOURS`: Special Christmas, New Year, Easter, and public holiday hours.
* `MEMBERSHIP_PLAN`: Membership tiers, benefits, duration, cancellation policies.
* `CLASS_TYPE`: Class catalog, categories (Cardio, Strength, Recovery), default durations.
* `CLASS_POLICY`: Cancellation windows, waitlist rules, late check-in penalties.
* `TRAINER_PROFILE`: Certified trainer roster, specialties, bios, coaching philosophies.
* `FACILITY`: Main gym zones (Free Weights, Cardio, Turf, Recovery lounge).
* `AMENITY`: Showers, sauna, steam room, lockers, towel service, parking.
* `POLICY`: Code of conduct, age restrictions, dress code, hygiene requirements.
* `FAQ`: Frequently asked questions with vetted answers.
* `TRIAL_INFORMATION`: Free trial policies, visitor registration requirements.
* `CONTACT_INFORMATION`: Front desk phone numbers, emergency lines, email addresses.
* `PARKING_INFORMATION`: Parking location, validation rules, charges, overflow bays.
* `BOOKING_POLICY`: Advance reservation limits, guest booking rules.
* `CANCELLATION_POLICY`: Notice requirements, suspension fees, refund conditions.
* `GUEST_POLICY`: Member guest passes, visitor day passes, age requirements.
* `CUSTOM`: Organization-specific supplementary knowledge snippets.

---

## 3. Retrieval & Ranking Engine

When a customer submits an inquiry:
1. **Candidate Retrieval (`KnowledgeRetrievalService`)**:
   - Queries published `ReceptionistKnowledgeSource` entries matching `organisationId` and `(outletId == null OR outletId == targetOutletId)`.
   - Concurrently fetches structured platform entities (`MembershipPlan`, `ClassType`, `TrainerProfile`) relevant to keyword triggers.
2. **Re-Ranking (`KnowledgeRankingService`)**:
   - Outlet Specificity Bonus: +0.3 score boost for entries explicitly matching target branch.
   - Title Token Overlap: +0.25 score boost for matching terms in article titles.
   - Tag Overlap: +0.20 score boost for matching categorized tags.
   - Content Token Overlap: +0.10 score boost for matching terms in content.
3. **Context Injection**: Top scored snippets are formatted into the prompt's `=== GROUNDED KNOWLEDGE SOURCES ===` block.
4. **Citation Tracking**: Each knowledge item utilized in an AI response is attached to the output `citations` array with `sourceType`, `title`, and `outletId`.

---

## 4. Knowledge Gap Resolution Workflow

```
Customer Question (e.g. "Do you have an Olympic swimming pool?")
                       │
                       ▼
       Search Knowledge & Platform Models
                       │
         [No verified pool record found]
                       │
                       ▼
   1. AI Response: Accurately denies having pool, refrains from guessing
   2. Handoff: Recommends connecting with front-desk staff
   3. Record Gap: ReceptionistKnowledgeGap created (status: "NEW", frequency: 1)
                       │
                       ▼
          Staff Dashboard: Gap Alert Review
                       │
     ┌─────────────────┴─────────────────┐
     ▼                                   ▼
[Service Offered]                  [Not Offered]
Staff authors new                  Staff confirms policy;
KnowledgeSource:                   AI continues safe
"Lap pool opening Q3"              denials without guessing
```
