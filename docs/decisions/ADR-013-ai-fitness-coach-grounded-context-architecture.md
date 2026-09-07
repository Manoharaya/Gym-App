# ADR 013: AI Fitness Coach Grounded Context, Clinical Guardrails & Trainer Program Protection

## Status
Accepted (Day 20)

## Context
On Day 20, FitCore implements its first production AI feature: the **AI Fitness Coach**. While generic conversational LLMs can offer generic workout tips, an unconstrained LLM in an athletic gym platform poses serious risks:
1. **Hallucination of Member Data**: A member asking "What did I do in my last workout?" or "How is my progress?" must never receive fabricated workouts, ghost weights, or imaginary PRs.
2. **Clinical & Medical Liability**: Members frequently mention acute symptoms (e.g. sharp chest pain, lightheadedness, joint pops, swelling). The coach must never diagnose injuries, recommend ignoring pain, or prescribe exercises to symptomatic individuals.
3. **Trainer Relationship Undermining**: When a human personal trainer has designed a member's periodized programming, the AI must not unilaterally alter sets, reps, load, or exercise substitutions without the trainer's knowledge.
4. **Data Privacy & Multi-Tenancy**: The AI must strictly observe tenant boundaries and member consent (`AI_PROCESSING`), while excluding PAR-Q, medical clearances, private trainer notes, and payment credentials from prompt payloads.
5. **System of Record Integrity**: The AI Fitness Coach is strictly a reasoning and advisory layer. It must never perform autonomous writes to core domain records (`Workout`, `TrainingPlan`, `TrainingGoal`).

## Decision

1. **Strict Gateway Pipeline Invocation**:
   - All interactions with the AI Fitness Coach route through `AIOrchestratorService` using prompt `fitness_coach.v1` and JSON Schema `FITNESS_COACH_RESPONSE_SCHEMA`. Direct third-party LLM SDK calls are strictly prohibited.

2. **Prioritized Context Engine & Zero Hallucination**:
   - `FitnessCoachContextBuilderService` assembles verified FitCore activity: recent completed workouts (last 14 days), active training plan, target milestones, and attendance consistency streak.
   - If a member has 0 logged workouts, the prompt directives and model gateway enforce explicit declaration: *"I don't have enough recorded activity to determine that. You currently have 0 completed workouts recorded in your training history."*
   - Context window enforces a prioritized token budget: Member Preferences (10%) -> Active Goals (15%) -> Active Plan (25%) -> Recent Workouts (30%) -> Engagement (10%) -> Conversation History (10%).

3. **Multi-Tiered Safety Escalation Policy (`FitnessSafetyPolicyService`)**:
   - Evaluates prompts before model execution:
     - **Acute Cardiopulmonary Symptoms** (chest pain, syncope, severe dyspnea): Immediately terminates exercise recommendation, outputs urgent medical guidance, triggers `AIFitnessSafetyEscalation` with severity `URGENT_ESCALATION`, and writes audit record `FITNESS_COACH_SAFETY_ESCALATION`.
     - **Musculoskeletal / Injury Inquiries** (joint popping, swelling, acute pain, diagnosis requests): Rejects diagnostic claims, advises immediate cessation of irritating loads, and refers member to licensed physiotherapists or physicians.
     - **Extreme Practices** (severe caloric deprivation, unmonitored fasting, dangerous volume): Blocks endorsement and enforces sustainable progression guidelines.

4. **Trainer Programming Protection Policy**:
   - When context indicates an active trainer-prescribed training plan (`isTrainerAssigned: true`), the coach explicitly advises discussing modifications with the assigned trainer rather than altering periodized volume or exercise selection.

5. **Read-Only In-App Action Links**:
   - The coach returns structured in-app action recommendations (`VIEW_WORKOUT`, `VIEW_PROGRESS`, `VIEW_GOAL`, `VIEW_TRAINING_PLAN`, `VIEW_BOOKING`, `OPEN_CHALLENGE`).
   - The AI cannot mutate database state directly; all user actions navigate within the mobile application.

6. **Tool Security & IDOR Prevention**:
   - Read-only tools (`get_member_goals`, `get_member_workouts`, `get_active_training_plan`, `get_member_streak`, etc.) ignore client-provided member IDs and bind execution strictly to `context.memberId` resolved from the authenticated JWT session.

7. **Consent & Multi-Tenant Isolation**:
   - Verification of `AI_PROCESSING` consent: If consent is `WITHDRAWN` or `DECLINED`, operations throw `403 Forbidden`.
   - All database queries enforce `organisationId` isolation. Cross-tenant conversation inspection is rejected.

8. **Trainer Client Preview & Non-Clinical Summaries**:
   - Trainers assigned via `TrainerClientAssignment` can inspect client adherence, volume trends, and suggested discussion points through `GET /ai/fitness-coach/trainer/preview/:memberId`. Unassigned trainers are rejected.

## Consequences

### Positive
- **Guaranteed Grounding**: Zero hallucination on workouts, plans, and metrics; members receive advice rooted in their real training logs.
- **Safety Compliance**: Immediate, deterministic deflection of emergency symptoms without relying on LLM benevolence.
- **Trainer Alignment**: Preserves the value and authority of human fitness professionals.
- **Auditability**: Complete audit trail of AI coaching conversations, safety escalations, and member feedback (`AIFeedback`).

### Negative / Trade-offs
- **Deterministic Conservatism**: Members asking for injury diagnosis are redirected to clinicians rather than receiving speculative advice.
- **Read-Only Bound**: The coach cannot auto-schedule workouts or auto-modify plans, requiring member action in the app.
