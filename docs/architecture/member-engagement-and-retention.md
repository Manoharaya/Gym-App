# FitCore Architecture: Member Engagement, Habits, Challenges & Retention Foundation

## 1. Overview & Objective
Day 18 introduces the **Member Engagement & Retention Foundation** to FitCore. Rather than functioning as a passive record-keeping system, FitCore actively motivates members to maintain attendance, log workouts, follow training and nutrition plans, build sustainable daily habits, compete in gym challenges, and earn achievement rewards.

A critical design mandate of Day 18 is the **Decoupled Architecture**:
Existing domains (`Attendance`, `Workout`, `Nutrition`, `TrainingGoal`, `Booking`) remain the sole authoritative sources of truth for their business records. The Engagement domain acts exclusively as an **event consumer** that ingests immutable domain signals, processes retention loops, evaluates achievements, and updates derived summaries without ever mutating underlying business records.

Furthermore, Day 18 operates with **Strictly Zero AI Execution**:
Deterministic algorithms, configurable scoring weights, and timezone-aware streak calculations power the foundation. It establishes the clean data contract `MemberEngagementContext` for future AI consumption (AI Coach, Daily Check-in, Churn Prediction, Gamification Intelligence), but invokes no LLMs or automated bots on Day 18.

---

## 2. Decoupled Architecture & Event Sourcing

```
       MEMBER
         │
   ┌─────┴──────────────┐
   ↓                    ↓
Source of Truth:     Source of Truth:
Attendance, Workout, Goals, Habits
Nutrition, Bookings     │
   │                    │
   └─────────┬──────────┘
             ↓
    ENGAGEMENT EVENT STREAM (Immutable Log)
             │
   ┌─────────┼──────────┐
   ↓         ↓          ↓
Habits   Challenges   Streaks
   │         │          │
   └─────────┼──────────┘
             ↓
     ENGAGEMENT SCORE
             ↓
       SEGMENTATION
             ↓
      BADGES / REWARDS
             ↓
DAY 17 NOTIFICATION ORCHESTRATOR
             ↓
     MEMBER EXPERIENCE
```

### Event Model & Idempotency
- **`EngagementEvent`**: Immutable event containing `id`, `organisationId`, `outletId`, `memberId`, `eventType`, `sourceType`, `sourceId`, `metadata`, `idempotencyKey`, `occurredAt`, `createdAt`.
- **Source Attribution**: Every event attributes its origin (e.g. `sourceType = WORKOUT`, `sourceId = workout_123`) to support cross-domain lineage and future AI reasoning.
- **Deduplication**: Idempotency keys prevent duplicate credit on retries or concurrent event creation (e.g. `workout:wk_123:completed`).
- **Zero Sensitive Data in Metadata**: Health screening responses, PAR-Q answers, medical clearances, and payment card details are strictly forbidden from event payloads.

---

## 3. Deterministic Engagement Scoring & Levels

### Scoring Model
The scoring engine calculates a bounded score from `0` to `100` based on six explainable components with configurable weights:
1. **Gym Attendance (30%)**: Physical gym check-ins and completed classes over the last 30 days (benchmark: 12 visits/month = 100%).
2. **Workout Activity (25%)**: Completed workout sessions logged in the last 30 days (benchmark: 10 workouts/month = 100%).
3. **Goal Progress & Completion (15%)**: Active goals on track and goals completed in the last 30 days.
4. **Nutrition Logging (10%)**: Meals and food logs recorded in the last 30 days (benchmark: 20 logged meals/month = 100%).
5. **Challenge Participation (10%)**: Active participation in progress and completed challenges.
6. **Recent Activity & Time Decay (10%)**: Decay multiplier applied based on recency:
   - Within last 7 days: 100% multiplier
   - 8–14 days: 75% multiplier
   - 15–30 days: 50% multiplier
   - > 30 days: 20% multiplier

### Historical Snapshots & Versioning
Every calculated score can be recorded into `EngagementScoreSnapshot` tagged with mandatory `calculationVersion: 1`. When scoring models are refined in future releases (`calculationVersion: 2`), historical snapshots remain completely untouched, ensuring retrospective analytics are strictly reproducible.

### Deterministic Engagement Levels
- **`NEW`**: Member joined within the last 14 days and has fewer than 3 recorded events.
- **`HIGHLY_ENGAGED`**: Score ≥ 75, or current streak ≥ 7 with activity in the last 2 days.
- **`ENGAGED`**: Score ≥ 50, or current streak ≥ 3 with activity in the last 4 days.
- **`ACTIVE`**: Score ≥ 25 with activity in the last 7 days.
- **`AT_RISK`**: Score < 25 or inactive between 8 and 21 days.
- **`DORMANT`**: Inactive for greater than 21 days.

---

## 4. Timezone-Aware Streak Engine
- **Local Calendar Normalization**: Dates are parsed using the member's configured timezone (`MemberProfile.timezone`, e.g. `Australia/Perth`). UTC midnight boundaries are never used directly for streak evaluations.
- **Active Day Definition**: An active day requires at least one qualifying engagement event (`GYM_CHECKED_IN`, `WORKOUT_COMPLETED`, `CLASS_ATTENDED`, `MEAL_LOGGED`, `PROGRESS_RECORDED`, or habit completion).
- **Streak Continuity**: A streak remains active if the member logged an activity either today or yesterday in their local timezone. If today is not yet active, yesterday's streak is preserved. If yesterday and today are both inactive, the current streak resets to 0 while the all-time longest streak is preserved.

---

## 5. Habit Tracking & Idempotent Completions
- **Habit Catalog**: System-wide habits and organization-specific habit templates.
- **Member Assignment**: Members self-assign habits or trainers assign habits within their authorized coaching scope (`TrainerClientAssignment`).
- **Idempotent Daily Logging**: `HabitCompletion` maintains a unique constraint on `[memberHabitId, date]`. Re-submitting a completion updates the value without generating duplicate records.
- **Habit Streaks**: Each habit maintains independent current and longest streaks calculated via `StreakService`.

---

## 6. Challenges & Zero-Trust Privacy Leaderboards
- **Challenge Lifecycle**: `DRAFT` → `PUBLISHED` → `ACTIVE` → `COMPLETED` / `CANCELLED` / `ARCHIVED`.
- **Target Metrics**: `ATTENDANCE`, `WORKOUT_COMPLETION`, `CLASS_ATTENDANCE`, `HABIT_COMPLETION`, `GOAL_PROGRESS`.
- **Event-Driven Progress**: Challenge progress increments automatically as qualifying domain events are ingested (e.g. `WORKOUT_COMPLETED` increments workout challenge progress by +1).
- **Privacy-Preserving Leaderboards**:
  - Only public display names or initials are rendered (e.g. `Alex C.`).
  - Progress counters and ranks are visible.
  - Zero-Trust Privacy: Under no circumstances are body weight, body composition, medical conditions, PAR-Q history, or private trainer notes exposed on public or challenge leaderboards.

---

## 7. Rewards & Badge Gamification
- **Badges**: Qualified deterministically (`FIRST_WORKOUT`, `10_WORKOUTS`, `25_WORKOUTS`, `50_WORKOUTS`, `FIRST_CLASS`, `10_CLASSES`, `7_DAY_STREAK`, `30_DAY_STREAK`, `GOAL_COMPLETED`, `CHALLENGE_COMPLETED`). Enforced by unique constraint `[memberId, badgeId]`.
- **Reward Catalog & Transactional Redemption**: Perks, guest passes, merchandise discounts, and free classes.
- **Concurrency Safety**: If a reward has inventory limits, redemption runs inside an interactive database transaction with atomic decrement (`inventory: { decrement: 1 }`), preventing negative inventory or double-redemption race conditions.

---

## 8. Anti-Spam Notification Frequency Control
Integration with the Day 17 `NotificationOrchestratorService` enforces strict anti-spam retention guardrails:
1. **Daily Cap**: Maximum of 3 engagement notifications per member per 24 hours.
2. **Duplicate Suppression**: The same milestone notification type is suppressed if already sent within 24 hours.
3. **Cooldown Window**: Minimum of 1 hour cooldown between normal priority engagement alerts.

---

## 9. Future AI Integration Boundary Contract
```typescript
interface MemberEngagementContext {
  memberId: string;
  organisationId: string;
  engagementLevel: string;
  engagementScore: number;
  currentStreak: number;
  longestStreak: number;
  recentActivity: EngagementEvent[];
  workoutSummary: { totalCompleted: number; lastWorkoutAt: Date | null; weeklyWorkouts: number };
  attendanceSummary: { totalVisits: number; lastVisitAt: Date | null; weeklyVisits: number };
  goalSummary: { totalGoals: number; completedGoals: number; activeGoals: number };
  nutritionSummary: { lastLoggedAt: Date | null; weeklyLogs: number };
  challengeSummary: { activeCount: number; completedCount: number };
  habitSummary: { activeCount: number; weeklyCompletionRate: number };
}
```
This interface guarantees that future AI models receive clean, structured, privacy-vetted telemetry without requiring ad-hoc data access.
