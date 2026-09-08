# FitCore AI Retention Intelligence — Staff Insights, Risk Explanation & Controlled Interventions

## 1. System Overview & Purpose
**AI Retention Intelligence** (Day 26) is the predictive, explainable member retention advisory layer for the FitCore platform. It transforms deterministic engagement signals (Day 25), personal baseline deviations, attendance trajectories, and training adherence into **structured risk factors, positive momentum signals, and actionable intervention recommendations** exclusively for authorized gym staff and personal trainers.

### Core Mission:
Provide human fitness staff with early, context-rich visibility into why a member's engagement is shifting—giving staff the exact insights, talking points, and outreach drafts needed to proactively support members before churn occurs.

### Strict Non-Negotiable Human-in-the-Loop Boundaries:
1. **AI Never Acts Autonomously**:
   - AI detects, explains, recommends, prioritizes, and drafts.
   - AI **never** sends autonomous messages, emails, SMS, or WhatsApp messages to members.
   - AI **never** applies discounts, waives fees, or alters membership tiers/pricing.
   - AI **never** cancels, suspends, renews, or alters memberships or class bookings.
2. **Strict Member-Facing Privacy**:
   - Churn labels, retention risk scores (`HIGH`, `ELEVATED`), and disengagement flags are strictly internal staff indicators.
   - Mobile member-facing surfaces show encouraging, positive momentum indicators (`FitnessMomentumCard`), never risk or retention assessments.
3. **No Psychological or Medical Diagnostic Claims**:
   - The system analyzes observable fitness, gym visit, and app engagement data only.
   - Medical conditions, mental health diagnoses (e.g., depression, anxiety), and clinical terminology are strictly prohibited.
4. **Fairness & Non-Discrimination**:
   - Protected demographic attributes (gender, age, race, ethnicity) are strictly excluded from retention calculations.
5. **Personal Baseline Grounding**:
   - Evaluates retention risk by comparing members against their own established baseline history, never rigid cohort averages.

---

## 2. Architecture & Data Flow

```
[Raw Platform Activity: Visits, Workouts, Bookings, Wearables, Check-Ins, Goals]
                                  │
                                  ▼
             [Day 25 Deterministic Engagement Signals Bundle]
                                  │
                     ┌────────────┴────────────┐
                     ▼                         ▼
         [Personal Baseline Engine]    [Trend & Trajectory Engine]
                     │                         │
                     └────────────┬────────────┘
                                  ▼
              [Deterministic Risk Assessment (0-100, Level)]
                                  │
                                  ▼
                [RiskFactorService & PositiveSignals]
               (Structured facts & verifiable evidence)
                                  │
                                  ▼
                   [RetentionContextService]
           (Sanitized profile, lifecycle context, baseline)
                                  │
                                  ▼
             [Prompt Registry: retention_intelligence.v1]
                                  │
                                  ▼
                 [AIOrchestratorService / Gateway]
               (Grounding rules, no hallucination)
                                  │
                                  ▼
                 [RetentionSafetyService]
      (Sanitizes diagnostic terms, validates approved taxonomy)
                                  │
                                  ▼
       ┌──────────────────────────┴──────────────────────────┐
       ▼                                                     ▼
[Staff Retention Queue & Cards]               [RetentionFollowUpTask Engine]
 (Trainer & Manager Dashboards)               (OPEN -> ASSIGNED -> COMPLETED)
```

---

## 3. Controlled Intervention Taxonomy
Every AI and deterministic recommendation adheres strictly to the 12 approved intervention types:

| Intervention Type | Target Member Scenario | Recommended Channel | Timing Window |
| :--- | :--- | :--- | :--- |
| `TRAINER_CHECK_IN` | Assigned client experiencing attendance or workout drop | In-Person / Chat | 24–48 hours |
| `GOAL_REVIEW` | Member stalled on goal progress or goals inactive > 30 days | In-Person / App | Next gym visit |
| `TRAINING_RESTART` | Inactivity > 14 days following training disruption | Staff Phone / Chat | Within 3 days |
| `CLASS_RECOMMENDATION` | Drop in solo gym attendance; likes group energy | App / Reception | Next week |
| `PERSONAL_TRAINING_FOLLOW_UP` | Member completed trial PT or expressed interest | In-Person / Phone | Within 5 days |
| `RECOVERY_SUPPORT` | Wearable shows high strain/low recovery or overreaching | Trainer / App | Next session |
| `APP_ENGAGEMENT` | In-gym visits active but mobile feature utilization zero | App Notification | Within 7 days |
| `NUTRITION_ENGAGEMENT` | Member training consistently but ignoring nutrition | In-App Coach | Next check-in |
| `MEMBERSHIP_CONVERSATION` | Renewal approaching within 30 days with declining visits | Reception / Phone | 14–21 days prior |
| `GENERAL_SUPPORT` | Mild disengagement without clear specific driver | Floor Greeting | Next visit |
| `NO_ACTION` | Member healthy, consistent, or re-engaging strongly | None | N/A |
| `INSUFFICIENT_DATA` | Brand new member (< 7 days) or insufficient history | Onboarding | Week 1–2 |

---

## 4. Explainability & Grounding Contract
Every retention analysis provides verifiable platform facts, preventing hallucination:
- **`observation`**: A concise, factual summary of the change (e.g., "Gym visits decreased from normal baseline of 3.5 visits/week to 0.5 visits/week").
- **`evidence`**: Direct, auditable platform metrics (e.g., `["Baseline: 3.5 visits/wk", "Recent: 0.5 visits/wk", "Variance: -85%", "Last Check-in: 12 days ago"]`).
- **`positiveSignals`**: Concrete evidence of recovery (e.g., `["Completed 2 workouts in past 3 days", "Renewed 3-week booking streak"]`).
- **`suggestedStaffNote`**: Objective, professional staff draft note for gym records.

---

## 5. Human Follow-Up Task Lifecycle
Staff follow-up tasks (`RetentionFollowUpTask`) formalize accountability without automated intrusion:

```
    [Create Task from Recommendation]
                   │
                   ▼
                [OPEN]
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
    [ASSIGNED]          [DISMISSED] (Requires dismissalReason)
         │
         ▼
   [IN_PROGRESS]
         │
         ▼
    [COMPLETED] (Requires completion notes & staff ID)
```

---

## 6. Access Control & Privacy
1. **RBAC Staff Only**: Only `SUPERADMIN`, `ORGANISATION_OWNER`, `OUTLET_MANAGER`, `TRAINER`, and `RECEPTION` may access retention intelligence.
2. **Trainer-Scoped**: Trainers can only view retention intelligence for actively assigned clients (`TrainerClientAssignment`).
3. **Multi-Tenant Isolation**: Tenant scoping is strictly enforced at database and service query levels (`organisationId`).
4. **Staff Continuous Feedback**: Staff can submit ratings (`HELPFUL`, `ACCURATE`, `UNHELPFUL`, `INACCURATE`) to track recommendation quality and calibrate future guidance.
