# FitCore Architecture: Advanced Workout Programming & Training Plans (Day 14)

## 1. Overview & Architecture Positioning

Day 14 builds directly on top of Day 13's workout execution foundation and Day 12's personal training and scheduling foundation. It introduces multi-week periodized programming, exercise grouping (supersets, circuits, EMOM, AMRAP), automated progression engines, template versioning, and compliance tracking.

```
┌──────────────────────────────────────────────────────────────┐
│                       TrainingProgram                        │
│                   (Day 12 Macro/Meso Cycle)                   │
└──────────────────────────────┬───────────────────────────────┘
                               │ 1:N
┌──────────────────────────────▼───────────────────────────────┐
│                        TrainingPlan                          │
│               (Day 14 Multi-Week Periodization)              │
├──────────────────────────────┬───────────────────────────────┤
│ • durationWeeks (4, 6, 8...) │ • status: DRAFT/ACTIVE/PAUSED │
│ • memberProfileId            │ • trainerProfileId            │
└──────────────┬───────────────┴───────────────┬───────────────┘
               │ 1:N                           │ 1:N
┌──────────────▼───────────────┐ ┌─────────────▼───────────────┐
│       TrainingPlanWeek       │ │    WorkoutProgressionRule   │
│  (Periodized Block / Micro)  │ │  (Overload Rules: Linear/   │
├──────────────────────────────┤ │   Reps/Sets/Time/RPE)       │
│ • weekNumber (unique per plan│ └─────────────────────────────┘
│ • focus: Accumulation/Deload │
└──────────────┬───────────────┘
               │ 1:N
┌──────────────▼───────────────┐
│       TrainingPlanDay        │
│    (Day 1..7 per Week)       │
├──────────────────────────────┤
│ • dayNumber (1..7 unique)    │
│ • restDay: boolean           │
│ • scheduledDate              │
│ • workoutId (nullable)       │
└──────────────┬───────────────┘
               │ 1:1
┌──────────────▼───────────────┐
│           Workout            │
│  (Day 13 Execution Entity)   │
├──────────────────────────────┴───────────────────────────────┐
│ • WorkoutExerciseGroup (SUPERSET, CIRCUIT, EMOM, AMRAP...)   │
│ • WorkoutExercise (Cloned snapshot from Template/Custom)     │
│ • WorkoutSet (Pre-populated Target + Actual Performance)     │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Core Entities & Database Schema

### 2.1 `TrainingPlan`
- Multi-week periodized training container linked to `Organisation`, `MemberProfile`, `TrainerProfile`, and optionally `TrainingProgram`.
- Statuses: `DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`.
- Soft-deletion support (`deletedAt`).
- Strict multi-tenant isolation via compound indexes `[organisationId, status]` and `[memberProfileId, status]`.

### 2.2 `TrainingPlanWeek` & `TrainingPlanDay`
- `TrainingPlanWeek`: Represents each microcycle with `weekNumber`, `name`, `focus` (e.g., Accumulation, Intensification, Deload), and date ranges. Enforces uniqueness on `[trainingPlanId, weekNumber]`.
- `TrainingPlanDay`: Represents days 1–7 with `dayNumber`, `restDay` flag, optional target `date`, and foreign key reference to `Workout`. Enforces uniqueness on `[trainingPlanWeekId, dayNumber]`.

### 2.3 `WorkoutExerciseGroup`
- Enables grouping of exercises into compound training protocols:
  - `SINGLE`: Standard isolated exercise.
  - `SUPERSET`: Paired opposing or agonist exercises with minimal transition rest.
  - `TRISET`: Three sequential exercises.
  - `GIANT_SET`: Four or more sequential exercises.
  - `CIRCUIT`: Station or timed circuit.
  - `EMOM`: Every Minute On the Minute.
  - `AMRAP`: As Many Reps/Rounds As Possible.
  - `INTERVAL`: Interval training block.
- Sections: `WARM_UP`, `ACTIVATION`, `MAIN`, `ACCESSORY`, `CONDITIONING`, `COOL_DOWN`, `RECOVERY`, `OTHER`.
- Timers & Rounds: Configurable `rounds`, `restBetweenExercises`, `restBetweenRounds`, and `durationSeconds`.
- Linked to `WorkoutExercise` via `workoutExerciseGroupId` and `orderInGroup`.

### 2.4 `WorkoutProgressionRule`
- Encapsulates progressive overload formulas across plan microcycles:
  - `LINEAR_LOAD`: Increases load by fixed kg (e.g., +2.5kg every 1 week).
  - `REP_PROGRESSION`: Increases target reps until ceiling reached.
  - `SET_PROGRESSION`: Increases target volume sets.
  - `TIME_PROGRESSION`: Extends interval work or isometric duration.
  - `DISTANCE_PROGRESSION`: Extends target cardiovascular distance.
  - `RPE_PROGRESSION`: Adjusts target rate of perceived exertion.
- Structured JSON `configuration` with frequency step evaluation:
  $$\text{TargetLoad} = \text{BaseLoad} + \left\lfloor \frac{\text{weekIndex}}{\text{frequencyWeeks}} \right\rfloor \times \text{loadIncrementKg}$$
- Progression Safety: Progression rules only apply to future ungenerated workouts. Completed workouts preserve immutable performance snapshots.

---

## 3. Template Generation & Idempotency

The `TrainingPlanGenerationService` implements deterministic workout generation:
1. **Transaction Isolation**: Generates workouts, cloned exercise snapshots, and target set skeletons in a single Prisma interactive transaction.
2. **Idempotency Guard**: Checks if a target day already contains a `workoutId`. If present, skips generation for that day and increments `skippedCount`, preventing accidental duplication or overwriting.
3. **Deep Snapshots**: Copies exercise instructions, coaching cues, equipment, and target volume snapshots to `WorkoutExercise` so subsequent template edits or exercise modifications never mutate the assigned workout.
4. **Automated Overload**: Evaluates active `WorkoutProgressionRule` entries for the plan/template and applies calculated progression variables across subsequent weeks.

---

## 4. Adherence & Overdue Tracking

### 4.1 Adherence Metrics (`TrainingAdherenceService`)
Evaluates member compliance against the assigned schedule:
- **Total Scheduled**: Total workouts scheduled within the plan.
- **Completed**: Workouts in `COMPLETED` state.
- **Skipped**: Workouts marked `CANCELLED` or `SKIPPED`.
- **Overdue**: Workouts in `SCHEDULED` or `ASSIGNED` state whose `scheduledDate` has elapsed past midnight.
- **Pending**: Future workouts in `SCHEDULED` or `ASSIGNED` state.
- **Adherence Percentage**:
  $$\text{Adherence \%} = \frac{\text{Completed}}{\text{Completed} + \text{Skipped} + \text{Overdue}} \times 100$$
- **Weekly Breakdown**: Per-week adherence metrics for targeted coach intervention.

### 4.2 Overdue Processing (`processOverdueWorkouts`)
- Background scheduled routine to identify abandoned/overdue sessions.
- Marks workouts older than configurable threshold (default 2 days) as `EXPIRED`.

---

## 5. Security, Authorization & Tenant Isolation

1. **Multi-Tenancy**: Every entity query filters by `organisationId`. Org B users receive `404 Not Found` or `403 Forbidden` when attempting to query or mutate Org A training plans.
2. **Coaching Authority (`TrainerClientAssignment`)**:
   - Trainers can only program and schedule training plans for members with an active `TrainerClientAssignment`.
   - Unassigned trainers attempting to create plans or generate workouts are rejected with `TRAINER_CLIENT_NOT_ASSIGNED` (`403 Forbidden`).
   - Management roles (`SUPERADMIN`, `ORGANISATION_OWNER`, `OUTLET_MANAGER`) bypass 1:1 assignment restrictions.
3. **Member Read-Only Guard**: Members can view their active training plans, weeks, days, and calendar schedules, but are strictly forbidden from generating workouts, modifying plans, or defining trainer progression rules.

---

## 6. Mobile Application Integration

- **Member Overview Screen (`TrainingPlanOverviewScreen`)**: Shows active multi-week plan, current week selector, real-time adherence progress bar, overdue badges, daily breakdown, and direct "Start Workout" launcher.
- **Training Calendar Screen (`TrainingCalendarScreen`)**: Provides week/month schedule view with scheduled workouts, rest day badges, and workout session navigation.
- **Trainer Studio (`TrainerProgrammingScreen`)**: Empowers trainers to initialize periodized plans, generate multi-week workouts from templates with progression, configure overload rules, and preview client experience.
- **Workout Preview Screen (`WorkoutPreviewScreen`)**: Read-only simulator displaying exercise groups, superset pairings, rest intervals, and prescribed volume for client communication.
