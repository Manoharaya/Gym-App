# ADR 015: AI Daily Check-In — Multi-Tenant Daily Intelligence, Deterministic Readiness Scoring, Acute Medical Interception & Cross-Domain Coach Handoffs

## Status
Accepted (Day 22)

## Context
On Day 22, FitCore implements the **AI Daily Check-In** system, establishing daily member intelligence, wellness tracking, and personalized engagement. This feature builds directly upon:
- Day 19 AI Platform Foundation (`AIOrchestratorService`, `ModelGatewayService`, `PromptRegistryService`, `AISafetyService`, `AIToolRegistryService`, `AIAuditService`)
- Day 20 AI Fitness Coach (workout context, training plan awareness, exercise modifications)
- Day 21 AI Nutrition Coach (macro/calorie targets, meal plans, allergen guardrails)
- FitCore Core Domains (Training, Nutrition, Attendance & Streaks, Member Engagement & Habits)

### The Core Problem
Members need a rapid (30–60 second) morning or pre-workout touchpoint answering: *"How am I doing today, and what should I focus on?"*

However, implementing an automated daily check-in in a commercial health and fitness platform presents critical risks:
1. **Medical and Diagnostic Liability**: Members experiencing medical emergencies (e.g., chest pain, shortness of breath, sudden acute tendon tears, neurological dizziness) may report symptoms during a daily check-in. The system must never attempt to diagnose, triage clinically, or provide medical clearance.
2. **Hallucinated Readiness vs. Deterministic Grounding**: Generative models are prone to hallucinating recovery metrics or giving contradictory readiness scores. Readiness must be deterministic, transparent, and grounded in member inputs.
3. **Autonomous Unauthorized Modifications**: The check-in must not autonomously alter coach-prescribed workouts, change nutrition targets, book classes, or modify memberships.
4. **Multi-Tenancy, Privacy & Trainer Scope**: Members share personal wellness notes (e.g., life stress, sleep quality). While assigned personal trainers need operational awareness of physical readiness, members' private journal notes must remain protected. Unassigned staff must have zero visibility.
5. **Double Submissions & Race Conditions**: Check-in fatigue or network retries must not result in multiple conflicting daily entries for the same calendar date.

---

## Decision

### 1. Architectural Boundary & Strict AI Gateway Routing
- The Daily Check-In system acts as an **intelligence orchestration and engagement layer**, sitting between the member and specialized vertical domains (Fitness Coach, Nutrition Coach, Training Plans).
- All generative AI synthesis routes strictly through `AIOrchestratorService.execute()` using system prompt `daily_checkin.v1` and JSON Schema `DAILY_CHECKIN_RESPONSE_SCHEMA`. Direct third-party model SDK calls (OpenAI, Anthropic, Gemini) are strictly prohibited.
- If the AI model fails or experiences network timeout, `DailyCheckInService` executes a deterministic rule-based fallback generating grounded focus areas and recommendations without breaking the user experience.

### 2. Single Check-In Per Day & Idempotency
- Calendar days are calculated using member local timezone (`checkInDate = YYYY-MM-DD`).
- The database enforces a composite unique constraint: `@@unique([memberId, checkInDate])` on the `DailyCheckIn` table.
- `POST /api/v1/ai/daily-checkin/submit` accepts an `idempotencyKey`. If a duplicate request is submitted, the existing check-in is returned safely with `idempotentReplay: true`.

### 3. Deterministic Training Readiness Scoring (`DailyCheckInScoringService`)
- Readiness is calculated deterministically on a 0–100 scale using a transparent weighted algorithm:
  - Energy (0–20 pts)
  - Sleep Quality & Duration (0–25 pts)
  - Muscle Soreness (0–20 pts)
  - Life/Mental Stress (0–15 pts)
  - Yesterday's Training Load & Exertion (0–10 pts)
  - Consistency & Habit Momentum (0–10 pts)
- Output categories: `OPTIMAL` (80–100), `MODERATE` (60–79), and `RECOVERY_FOCUSED` (0–59).
- **Non-Clinical Guarantee**: The readiness score is explicitly documented as a *training-planning indicator*, not a biological or clinical biomarker.

### 4. Acute Medical & Red Flag Interception (`DailyCheckInSafetyService`)
- Before context aggregation or generative processing, member notes and symptoms are scanned against regex patterns covering:
  - `CHEST_PAIN`: Chest tightness, pressure, radiating pain
  - `DIFFICULTY_BREATHING`: Shortness of breath, wheezing, gasping
  - `FAINTING_DIZZINESS`: Syncope, passing out, room spinning
  - `ACUTE_INJURY`: Inability to bear weight, loud pop/snap, bone deformation
  - `EXTREME_SORENESS`: Rhabdomyolysis indicators, dark brown urine, extreme systemic swelling
- **Intervention Protocol**:
  - Sets `safetyIntervention: true` and `actionRequired: "CONSULT_HEALTHCARE_PROFESSIONAL"`.
  - Halts the LLM pipeline immediately.
  - Returns clear non-diagnostic safety instructions and standard emergency hotline advisories.
  - Records an audit event (`DAILY_CHECKIN_SAFETY_ESCALATION`) in `AIAuditService`.

### 5. Grounded Recommendations & Protected Trainer Programming
- `DailyCheckInRecommendationService` generates between 3 and 5 actionable recommendations grounded in verified member context.
- **Coach Program Preservation**: The check-in advises on load adjustments, warm-up intensity, and hydration, but explicitly does NOT cancel or alter assigned coach programs without human coach involvement.
- **Coach Handoffs**: When a member requires in-depth workout substitutions or nutritional recalibration, the check-in provides grounded one-tap handoffs to the Day 20 AI Fitness Coach or Day 21 AI Nutrition Coach with pre-populated context.

### 6. Read-Only Tool Registry Integration
- 7 specialized read-only tools are registered with `AIToolRegistryService`:
  1. `get_daily_checkin_status`
  2. `get_readiness_score`
  3. `get_today_workout_context`
  4. `get_nutrition_checkin_context`
  5. `get_member_habits_context`
  6. `get_checkin_trends`
  7. `get_recovery_recommendations`
- All tools resolve member identity strictly from the authenticated JWT session (`req.user`), completely ignoring client-supplied member IDs.

### 7. Multi-Tenant Scoping, Privacy & Trainer Visibility
- **Consent Enforcement**: Members must have an active `AI_PROCESSING` consent record. If revoked or absent, endpoints return `403 Forbidden` (`AI_CONSENT_REQUIRED`).
- **Trainer Client Scoping**: Personal trainers can view client readiness, trend summaries, and suggested focus areas via `GET /api/v1/ai/daily-checkin/trainer/client/:memberId` ONLY if an active `TrainerClientAssignment` exists.
- **Privacy View**: Member qualitative journal notes (`notes`) are strictly private and never exposed to trainers. The `GET /api/v1/ai/daily-checkin/privacy-view` endpoint provides total transparency to the member regarding exactly what data is visible to their trainer.

---

## Consequences

### Positive
- **High-Velocity Member Engagement**: Provides members with high-value, personalized daily guidance in under 60 seconds without conversational overhead.
- **Guaranteed Safety & Non-Clinical Integrity**: Eliminates medical liability through deterministic red-flag interception and disclaimers.
- **Uncompromised Data Grounding**: Readiness scores and habit trends are calculated mathematically from database records rather than generated probabilistically.
- **Preserved Coach Authority**: Enhances the personal trainer's visibility into client physical readiness without eroding coach programming authority.
- **Auditable & Tenant-Isolated**: Full compliance with multi-tenant data boundaries, tenant filtering on all queries, and audit logging for every safety escalation and member feedback event.

### Negative / Trade-offs
- **One Check-In Constraint**: Members cannot log multiple disparate check-ins in a single calendar day (e.g. morning vs. evening); the design prioritizes a single authoritative daily snapshot.
- **Non-Diagnostic Limitations**: Members reporting acute symptoms are directed away from training and toward medical practitioners, which may feel conservative but is mandatory for platform safety.
