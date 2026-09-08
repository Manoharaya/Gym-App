# ADR-019: AI Retention Intelligence Architecture

## Status
Accepted

## Context
Following the implementation of deterministic engagement signals and baseline trend foundations (Day 25, ADR-018), FitCore required an operational retention intelligence layer (Day 26). The goal was to transform raw multi-pillar engagement signals and risk levels into **explainable, personalized, actionable retention recommendations** for gym staff and personal trainers.

Key challenges addressed:
1. Preventing hallucinated activity or speculative retention assertions by LLMs.
2. Eliminating risks of autonomous, unauthorized member communications, discounting, pricing changes, or cancellations.
3. Ensuring ethical fairness: strict exclusion of protected demographic attributes and complete prohibition of clinical/psychological diagnostic claims (e.g., depression, burnout).
4. Enforcing strict member privacy: churn and retention risk labels must remain strictly internal to staff, while members experience encouraging fitness momentum.
5. Providing structured, accountable human follow-up task tracking.

## Decision
We designed and implemented **AI Retention Intelligence** with the following foundational architecture:

1. **Strict Human-In-The-Loop (HITL) Design**:
   - AI **detects, explains, recommends, prioritizes, and drafts**.
   - AI **never** triggers direct autonomous communications (no SMS, email, WhatsApp, or robocalls).
   - AI **never** applies discounts, fee waivers, or pricing/tier alterations.
   - AI **never** alters member bookings, memberships, or training programs.

2. **Personal Baseline Comparison (Self-Comparison)**:
   - Evaluates a member's retention risk by comparing recent activity (7-day window) strictly against their own historical baseline (28-day window), preventing false-positive risk flags for naturally low-frequency, consistent members.

3. **Separation of Observable Facts vs AI Recommendations**:
   - Observable platform data is structured into verifiable risk factors (`RetentionRiskFactor`) with concrete evidence metrics.
   - Positive recovery signals (`RetentionPositiveSignal`) balance the assessment when recent activity shows renewed momentum.
   - LLMs generate grounded explanations, suggested staff notes, and talking points referencing only confirmed facts.

4. **Controlled Intervention Taxonomy**:
   - Every recommendation maps strictly to a closed 12-item taxonomy: `TRAINER_CHECK_IN`, `GOAL_REVIEW`, `TRAINING_RESTART`, `CLASS_RECOMMENDATION`, `PERSONAL_TRAINING_FOLLOW_UP`, `RECOVERY_SUPPORT`, `APP_ENGAGEMENT`, `NUTRITION_ENGAGEMENT`, `MEMBERSHIP_CONVERSATION`, `GENERAL_SUPPORT`, `NO_ACTION`, `INSUFFICIENT_DATA`.
   - Recommendations include suggested channels and timing windows for staff execution.

5. **Formal Human Follow-Up Task Engine**:
   - Staff recommendations can be converted into `RetentionFollowUpTask` entities (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `DISMISSED`, `EXPIRED`).
   - Task completion requires staff notes and identity attribution. Dismissal requires explicit reasoning (`dismissalReason`).

6. **Member vs Staff Visibility Boundary**:
   - **Internal Staff**: Access `/ai/retention/*` endpoints, retention queue, and `RetentionRiskCard`.
   - **Members**: Mobile dashboard displays **`FitnessMomentumCard`** (weekly workouts, streaks, positive momentum), with zero exposure of churn or risk levels.

7. **Prohibition of Medical & Psychological Diagnostics**:
   - Diagnostic labels (e.g., clinical depression, bipolar disorder, anxiety) are strictly prohibited and actively sanitized by `RetentionSafetyService`.
   - Protected demographic attributes (gender, age, race) are excluded from prediction algorithms.

8. **Scoped Trainer Authorization & Multi-Tenancy**:
   - Trainers are strictly scoped to actively assigned clients (`TrainerClientAssignment`).
   - Tenant boundaries (`organisationId`) are verified on all endpoints and database queries.

9. **Continuous Learning & Staff Feedback**:
   - Authorized staff can rate recommendations (`HELPFUL`, `ACCURATE`, `UNHELPFUL`, `INACCURATE`) with feedback persisted to database and audit logs for ongoing prompt calibration.

## Consequences
### Positive:
- Highly grounded, explainable retention guidance eliminating autonomous outreach risks.
- Transparent accountability through formal staff follow-up task tracking.
- Protected member trust through privacy-preserving mobile UI.
- Strong protection against hallucination, prompt injection, and unapproved commercial discounting.

### Negative / Trade-offs:
- Requires staff action and time; no automated quick-fix campaigns.
- Background batch evaluations across large member populations require controlled query limits and caching.
