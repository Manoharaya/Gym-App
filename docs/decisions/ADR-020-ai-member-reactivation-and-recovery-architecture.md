# ADR-020: AI Member Reactivation & Recovery Architecture

## Status
Accepted

## Date
2026-09-08

## Context
Member disengagement and gym inactivity are primary drivers of attrition in the fitness industry. Traditional gym software relies either on coarse manual reports or aggressive automated blast messaging (e.g. unsolicited discount emails) that erode brand perception and member trust.

In Day 27 of FitCore, our goal is to build an intelligent, empathetic recovery engine that identifies inactive and disengaging members and prescribes explainable, personalized return strategies.

Crucially, the architecture must balance algorithmic intelligence with human oversight, brand integrity, and strict member privacy.

---

## Decisions

### 1. Mandatory Human-in-the-Loop (HITL)
The AI system is strictly an advisory intelligence layer.
- **Capabilities Granted:** Inactivity detection, frequency decline analysis, positive recovery signal recognition, strategy selection from an approved 13-item taxonomy, draft message generation, and priority assignment.
- **Strict Prohibitions:** The AI must NEVER autonomously dispatch emails, push notifications, SMS, or telephone calls, and must NEVER autonomously alter member plan pricing or apply discounts.
- **Execution Mechanism:** All recovery plans are instantiated as `MemberRecoveryPlan` with status `PENDING_APPROVAL` (or `DRAFT`), requiring explicit human review and sign-off by gym staff or assigned trainers before execution.

### 2. Personal Baseline Comparison vs Cohort Averages
Inactivity and frequency drops are evaluated against each member's personal 28-day baseline rather than static cohort or population-wide metrics. A member who normally visits once per week is not flagged as inactive after 5 days, whereas a member who visits 5 times weekly and suddenly drops to 0 visits for 10 days is appropriately recognized as experiencing a significant disruption.

### 3. Controlled 13-Item Strategy Taxonomy
To prevent hallucinated or unauthorized actions, strategy recommendations are strictly bound to a 13-item taxonomy:
1. `PERSONAL_TRAINER_CHECK_IN`
2. `GOAL_RESET`
3. `TRAINING_RESTART`
4. `CLASS_REINTRODUCTION`
5. `PERSONAL_TRAINING_RESTART`
6. `ROUTINE_REBUILD`
7. `RECOVERY_FOCUSED_RETURN`
8. `APP_ENGAGEMENT_RESTART`
9. `NUTRITION_LOGGING_RESTART`
10. `MEMBERSHIP_REVIEW`
11. `GENERAL_SUPPORT`
12. `NO_ACTION`
13. `INSUFFICIENT_DATA`

### 4. Zero Predictive Exposure on Member Endpoints
Members must never feel monitored or stigmatized by churn or retention risk scores.
- The member dashboard accesses `GET /ai/reactivation/member-state`, which returns only positive return guidance and routine status.
- Internal metrics (e.g. `HIGH_RISK`, disengagement barrier logs, churn scores) are completely blocked from member endpoints.

### 5. Programmatic Safeguards Against Clinical & Commercial Risks
`ReactivationSafetyService` intercepts all outputs:
- Blocks clinical and mental health diagnostic terms (depression, bipolar, injury diagnosis).
- Blocks commercial price-slashing and unauthorized discounts (% off, waived fees, free months).

---

## Consequences

### Positive
- Prevents embarrassing or legally risky automated member communications.
- Establishes a transparent, auditable recovery workflow where staff take ownership of member relationships.
- Guarantees multi-tenant isolation and role-based client scoping for personal trainers.
- Ensures a welcoming, supportive mobile experience for members returning after inactivity.

### Negative / Trade-offs
- Requires staff engagement to review and approve recovery plans (cannot run entirely on autopilot).
- Expiration sweeps are necessary to clean up unacted plans if staff fail to respond in a timely manner.
