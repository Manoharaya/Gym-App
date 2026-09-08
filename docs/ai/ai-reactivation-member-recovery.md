# AI Reactivation & Member Recovery Engine (Day 27)

## 1. Overview & Purpose

The **AI Reactivation & Member Recovery** layer turns inactivity telemetry and member engagement declines into grounded, explainable, and personalized recovery strategies. It bridges the gap between raw retention risk and empathetic human-approved re-engagement workflows.

The system is built upon three foundational tenets:
1. **Personal Baseline Comparison:** Inactivity and frequency declines are evaluated against the member's personal 28-day baseline, avoiding misleading population or static cohort averages.
2. **Strict Human-in-the-Loop (HITL):** The AI identifies, explains, prioritizes, and drafts recovery plans. It **never** autonomously initiates external member communications (SMS, email, phone calls) and never alters memberships or applies discounts.
3. **Controlled Strategy Taxonomy:** Interventions are bounded to an approved 13-item strategy taxonomy to prevent hallucinated, unauthorized, or clinical actions.

---

## 2. Inactivity Detection & Recovery State Lifecycle

### Inactivity State Machine
```text
ACTIVE (days < 7)
       ↓
AT_RISK (7 <= days < 14)
       ↓
INACTIVE (14 <= days < 30)
       ↓
DORMANT (30 <= days < 60)
       ↓
DISENGAGED (days >= 60)
       ↑
RECOVERING (activity detected after >= 14 days of inactivity)
```

### Recovery States
- `NO_RECOVERY_SIGNAL`: No positive physical or digital interaction since inactivity started.
- `EARLY_REENGAGEMENT`: 1 visit or app session logged in the last 7 days.
- `PARTIAL_REENGAGEMENT`: 2+ visits or sessions in the last 14 days, but below baseline weekly frequency.
- `STABLE_REENGAGEMENT`: Sustained visits matching or exceeding baseline frequency over 14+ days.
- `REENGAGED`: Full return to active routine (> 21 consecutive days of consistent engagement).

---

## 3. Controlled Strategy Taxonomy

Recommendations are strictly confined to 13 curated strategies:

| Strategy | Primary Trigger / Indication | Primary Channel |
| :--- | :--- | :--- |
| `PERSONAL_TRAINER_CHECK_IN` | Assigned PT client with declining workout frequency | Trainer In-App Message |
| `GOAL_RESET` | Stalled or missed goal target milestones | In-Person / PT Session |
| `TRAINING_RESTART` | Member returning from 14+ days away; needs gentle return routine | Push Notification / App Workout |
| `CLASS_REINTRODUCTION` | Former regular class attendee who stopped booking | Reception / Class Booking |
| `PERSONAL_TRAINING_RESTART` | Previous PT package holder who lapsed | Phone Call / In-Person |
| `ROUTINE_REBUILD` | General gym attendee with erratic schedule | Workout Library / Coach Prompt |
| `RECOVERY_FOCUSED_RETURN` | High strain / wearable fatigue indicator prior to absence | Gentle Mobility / Stretch Routine |
| `APP_ENGAGEMENT_RESTART` | Zero app opens or check-ins despite gym membership | Mobile Notification |
| `NUTRITION_LOGGING_RESTART` | Lapsed nutrition tracking after continuous streak | Coach Nutrition Check-In |
| `MEMBERSHIP_REVIEW` | Member facing logistical, schedule, or facility challenges | Front Desk / Club Manager |
| `GENERAL_SUPPORT` | Unspecified absence with minimal data | Welcoming Front Desk Greeting |
| `NO_ACTION` | Member already re-engaging effectively on their own | None (Monitor) |
| `INSUFFICIENT_DATA` | Brand new member (< 14 days) or insufficient telemetry | Welcome Onboarding Follow-Up |

---

## 4. Human-in-the-Loop Recovery Plans (`MemberRecoveryPlan`)

Every recommended recovery strategy is represented by a `MemberRecoveryPlan` database entity governed by a strict state machine:

```text
       ┌───────────┐
       │   DRAFT   │
       └─────┬─────┘
             │ Submit for Review
             ▼
  ┌───────────────────────┐
  │   PENDING_APPROVAL    │ ◄── Initial status for AI-generated plans
  └──────────┬────────────┘
             │
             ├──► Staff Rejection / Dismissal ──► [ DISMISSED ] (Reason mandatory)
             │
             ▼ Staff Approval
       ┌───────────┐
       │ APPROVED  │
       └─────┬─────┘
             │ Staff Begins Outreach
             ▼
     ┌───────────────┐
     │  IN_PROGRESS  │
     └───────┬───────┘
             │
             ├──► Member Re-engages ───────────► [ REENGAGED ]
             ├──► Protocol Concludes ──────────► [ COMPLETED ]
             ├──► Member Requests Dismissal ───► [ DISMISSED ]
             └──► Exceeds Validity Window ────► [ EXPIRED ]
```

---

## 5. Privacy & Member Experience

- **Zero Churn / Risk Exposure:** Members never see risk levels (`HIGH`, `ELEVATED`), churn probabilities, or disengagement labels.
- **Safe Return Hub:** On the mobile dashboard, returning members receive an encouraging `MemberRecoveryHubCard` highlighting light workouts, class reservations, or coach greetings without any punitive or alarmist copy.
- **Safety Boundaries:** Clinical, psychological, and unauthorized commercial terms (e.g. discounts, free months) are programmatically rejected by `ReactivationSafetyService`.
