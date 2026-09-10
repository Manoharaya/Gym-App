# ADR-028: AI Sales Agent Foundation Architecture

## Status
Accepted

## Date
2026-09-10

## Context
Day 36 introduces a dedicated, production-grade **AI Sales Agent** in FitCore. Prospective customers interact through multiple channels (Web Chat, WhatsApp, SMS, Walk-in, Receptionist Handoff) seeking information about memberships, pricing, classes, trainers, and facilities. 

To convert prospective leads into members while preserving brand reputation and operational integrity, the AI Sales Agent must:
1. **Be Universal Across Fitness Modalities**: Support traditional gyms, CrossFit boxes, 24/7 fitness centers, boutique yoga/Pilates studios, personal training clubs, and multi-outlet chains without hardcoded business rules.
2. **Strict Pricing Integrity & Truth in Advertising**: AI must NEVER negotiate custom discounts, modify prices, promise unauthorized deals, or invent non-existent amenities/promotions.
3. **Discover Real Prospect Needs**: Gather structured signals (goals, budget, schedule, fitness experience, readiness to join) and sync them into Day 33's `LeadQualificationProfile`.
4. **Grounded Recommendations**: Recommend approved, active membership plans with verified pricing, supporting rationale, and honest limitations.
5. **Actionable Next Steps & Human Oversight**: Guide prospects to real next actions (facility tour, trial session, receptionist booking, staff consultation) and support seamless human handoff.
6. **Medical Safety Boundary**: Strictly refuse medical advice, injury diagnosis, rehabilitation programming, or triage, directing prospects to healthcare professionals.
7. **Zero Autonomous Financial/Contractual Powers**: AI must NOT collect credit cards, execute membership agreements, or alter subscription contracts.

---

## Decision

### 1. Dedicated Sales Domain Architecture & Multi-Tenancy
We established the dedicated `SalesAgentModule` with full tenant isolation (`organisationId`, `outletId`):
- `SalesAgentProfile`: Configures the agent's persona (`CONSULTATIVE`, `ENERGETIC`, `PREMIUM`, `DIRECT`, `SUPPORTIVE`), allowed channels, enabled recommendations, trial booking settings, and custom instructions.
- `SalesConversation` & `SalesConversationMessage`: Stores full multi-turn conversational history with captured intents, extracted entities, token usage, and latency.
- `SalesRecommendation`: Stores deterministic recommendations for membership plans, personal training packages, or trials with confidence, reasons, and limitations.
- `SalesNextAction`: Records actionable recommendations (`BOOK_TOUR`, `BOOK_TRIAL`, `VIEW_MEMBERSHIP_OPTIONS`, `CONNECT_WITH_STAFF`).
- `SalesHandoff`: Manages human staff escalations with priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), assignment, status tracking, and notes.

### 2. Guardrails & Anti-Hallucination (`SalesPolicyService`)
- **Strict Pricing Policy**: Only official, active `MembershipPlan` records in the database can be quoted. The AI is structurally prevented from quoting unverified figures or granting custom discounts.
- **Unauthorized Discount Rejection**: Prompts or queries asking for discounts, bargaining, or price cuts trigger standardized refusal responses directing users to approved standard plans or staff.
- **Prompt Injection Defense**: Filters out adversarial system prompt override attempts, roleplay bypasses, and unauthorized administrative commands.
- **Medical Refusal**: Queries involving injuries, medical conditions, or therapy trigger immediate disclaimers requiring medical clearance before training.

### 3. Grounded Context Aggregation (`SalesContextService`)
Aggregates verified business data within a bounded token budget:
- Business profile, operating hours, outlet location, amenities, and policies.
- Active membership plans, pricing, commitment terms, inclusions, and restrictions.
- Class schedules, formats, and peak/off-peak capacity.
- Certified trainer profiles, credentials, and specialties.
- Current active promotional campaigns and official trial offerings.

### 4. Controlled Tool Registry (`SalesToolRegistry`)
Schema-validated, tenant-isolated tools:
- **Read Tools**: `get_business_info`, `get_membership_options`, `get_class_schedule`, `get_trainer_profiles`, `get_current_promotions`, `get_facility_policies`.
- **Lead Tools**: `find_or_create_lead`, `update_lead_qualification` (reusing Day 33's `LeadsService`).
- **Action Tools**: `recommend_trial`, `recommend_tour`, `initiate_human_handoff`, `route_to_receptionist_booking`.

### 5. Seamless Workflow Integration
- **Day 33 Lead Capture**: Discovered buyer context is continuously synced into `LeadQualificationProfile` without schema duplication.
- **Day 32/35 Receptionist & Booking**: When a prospect reaches high intent to book a trial or class, the agent smoothly hands off to the existing booking engine.
- **Day 28 Communication**: Staff alerts are dispatched via `NotificationOrchestratorService` upon high-priority prospect handoffs.
- **Day 30 Automation**: Emits `SALES_CONVERSATION_STARTED`, `SALES_LEAD_QUALIFIED`, and `SALES_HANDOFF_INITIATED` events.

---

## Consequences

### Positive
- **Brand Protection**: Eliminates rogue AI promises, hallucinated discounts, or inaccurate facility information.
- **Sales Velocity**: Converts casual website/social inquiries into structured, qualified leads and booked tours/trials instantly 24/7.
- **Modality Agnostic**: Operates with identical reliability for standard gyms, boutique studios, CrossFit boxes, and multi-location franchises.
- **Multilingual Ready**: First-class support for English and Nepali prospect interactions.

### Negative / Tradeoffs
- Requires fitness businesses to maintain accurate membership plans, pricing, and operating hours in the FitCore database to enable rich recommendations.
- Sales Agent cannot autonomously close contracts or collect billing information; conversion requires human staff or self-service member app checkout.
