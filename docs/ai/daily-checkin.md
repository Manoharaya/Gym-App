# FitCore AI Daily Check-In — Member Intelligence, Wellness & Engagement Engine

## 1. System Overview & Primary Objectives
The **AI Daily Check-In** is the daily intelligence and engagement orchestration layer of the FitCore multi-tenant platform (Day 22), built directly upon:
1. **Day 19 AI Platform Foundation**: Central Orchestrator (`AIOrchestratorService`), Model Gateway (`ModelGatewayService`), Prompt Registry (`PromptRegistryService`), AI Safety (`AISafetyService`), AI Permissions, Usage Tracking, and Audit Logging.
2. **Day 20 AI Fitness Coach**: Personalized training intelligence, exercise progressions, and biomechanical explanations.
3. **Day 21 AI Nutrition Coach**: Macro adherence, calorie pacing, pre/post-workout meal timing, and allergy safety.
4. **Core FitCore Domains**: Training (`TrainingPlan`, `Workout`), Nutrition (`NutritionTarget`, `NutritionSummary`), Progress, Attendance, Communication, and Engagement.

### Core Value Proposition:
Answers the central daily member question: **"How am I doing today, and what should I focus on?"**

### Strict Non-Negotiable Boundaries:
- **Zero Direct LLM Calls**: All AI interactions route strictly through `AIOrchestratorService.execute()`.
- **Strict Non-Medical Boundary**: Readiness is strictly a deterministic **training-planning indicator** (0–100), NOT a clinical or medical diagnosis. Wellbeing/mood questions are self-reported fitness signals, not psychiatric measurements.
- **Zero Autonomous Modifications**: The AI Daily Check-In never autonomously alters workouts, sets, weights, meal plans, nutrition targets, memberships, bookings, or payment methods.
- **Trainer Programming Protection**: The system never overrides an assigned personal trainer's program; when fatigue or soreness is elevated, it suggests trainer consultation and voluntary pacing adjustments.
- **One Check-In Per Day**: Enforces exactly one active/completed check-in record per member per local calendar day (`@@unique([memberId, checkInDate])`).
- **Scoped Trainer Visibility**: Trainers only access authorized clients via `TrainerClientAssignment`, receiving summarized readiness indicators while raw subjective notes remain confidential to the member.

---

## 2. Architecture & Data Flow

```
Mobile App (DailyCheckInHomeScreen / DailyCheckInQuestionScreen)
        │
        ▼
DailyCheckInController (/api/v1/ai/daily-checkin)
        │
        ├─► 1. Auth & Consent Check (AI_PROCESSING consent verified)
        │
        ├─► 2. Idempotency Check (idempotency-key header cache lookup)
        │
        ├─► 3. Calendar Date Enforcement (@@unique([memberId, checkInDate]))
        │
        ├─► 4. Deterministic Readiness Calculation (DailyCheckInScoringService)
        │        └─ Energy, Sleep, Soreness, Stress, Motivation (0 - 100)
        │
        ├─► 5. Acute Safety Screening (DailyCheckInSafetyService)
        │        └─ Red flag detected (CHEST_PAIN, etc.)?
        │             ├─ Halt coaching recommendations
        │             ├─ Set readinessCategory = RECOVERY_FOCUSED
        │             ├─ Record safety escalation audit event
        │             └─ Return non-medical emergency guidance immediately
        │
        ├─► 6. Context Aggregation (DailyCheckInContextService)
        │        ├─ Active Training Plan & Scheduled Workouts
        │        ├─ Yesterday Workout Adherence
        │        ├─ Active Goals & Nutrition Targets
        │        ├─ Attendance Streak
        │        └─ Historical Trends (DailyCheckInSummaryService, min 3 check-ins)
        │
        ├─► 7. AI Orchestrator Execution (AIOrchestratorService.execute)
        │        └─ Model Gateway -> Dev Provider / Anthropic / Gemini
        │
        ├─► 8. Fallback Safety Wrapper (graceful deterministic fallback if AI fails)
        │
        ├─► 9. Audit Logging (AIAuditService)
        │
        └─► 10. Return Structured Daily Intelligence (DailyCheckInDto)
```

---

## 3. Database Schema (Prisma)

```prisma
model DailyCheckIn {
  id                         String        @id @default(cuid())
  organisationId             String
  memberId                   String
  checkInDate                DateTime      @db.Date
  status                     String        @default("PENDING") // PENDING, STARTED, COMPLETED, SKIPPED, EXPIRED
  completedAt                DateTime?
  createdAt                  DateTime      @default(now())
  updatedAt                  DateTime      @updatedAt

  // Member-reported structured signals
  energyLevel                String?       // VERY_LOW, LOW, MODERATE, GOOD, VERY_GOOD
  wellbeingMood              String?       // VERY_LOW, LOW, NEUTRAL, GOOD, VERY_GOOD
  sleepQuality               String?       // VERY_POOR, POOR, FAIR, GOOD, EXCELLENT
  sleepDurationMinutes       Int?
  sorenessLevel              String?       // NONE, MILD, MODERATE, HIGH, VERY_HIGH
  stressLevel                String?       // VERY_LOW, LOW, MODERATE, HIGH, VERY_HIGH
  motivationLevel            String?       // VERY_LOW, LOW, MODERATE, HIGH, VERY_HIGH
  yesterdayWorkoutCompleted  Boolean?
  notes                      String?       @db.Text

  // Deterministic fitness planning indicator (Non-clinical)
  readinessScore             Int?
  readinessCategory          String?       // OPTIMAL, MODERATE, RECOVERY_FOCUSED

  // Structured AI daily intelligence
  aiSummary                  String?       @db.Text
  aiCheckInInterpretation    String?       @db.Text
  aiReadinessFraming         String?       @db.Text
  aiTodayFocus               String?       @db.Text
  aiRecommendations          Json?
  aiCaution                  String?       @db.Text
  aiEscalation               Json?
  safetyFlagged              Boolean       @default(false)
  safetyCategory             String?
  suggestedNextAction        String?
  sourceSummary              Json?

  // Observability & Idempotency
  aiModel                    String?
  aiTokens                   Int?
  aiLatencyMs                Int?
  idempotencyKey             String?

  // Feedback loop
  feedbackRating             String?       // HELPFUL, NOT_HELPFUL, INCORRECT, NOT_RELEVANT, UNSAFE
  feedbackComment            String?       @db.Text

  organisation               Organisation  @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  memberProfile              MemberProfile @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([memberId, checkInDate])
  @@index([organisationId, checkInDate])
  @@index([memberId, status])
  @@index([idempotencyKey])
  @@map("daily_check_ins")
}

model DailyCheckInSetting {
  id                         String        @id @default(cuid())
  organisationId             String
  memberId                   String?       @unique
  checkInEnabled             Boolean       @default(true)
  reminderEnabled            Boolean       @default(true)
  reminderTime               String        @default("08:00") // HH:mm
  trainerVisibility          String        @default("SUMMARIZED") // NONE, SUMMARIZED, FULL
  availableQuestions         Json?
  createdAt                  DateTime      @default(now())
  updatedAt                  DateTime      @updatedAt

  organisation               Organisation  @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  memberProfile              MemberProfile? @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([organisationId, memberId])
  @@map("daily_check_in_settings")
}
```

---

## 4. Deterministic Readiness Scoring Algorithm

Readiness is computed via a versioned, formulaic scoring model (`v1.0-weighted-composite`):

| Signal | Component Weight | Point Scale |
| :--- | :--- | :--- |
| **Energy Level** | 25 points | `VERY_LOW` (5), `LOW` (10), `MODERATE` (17), `GOOD` (22), `VERY_GOOD` (25) |
| **Sleep Quality** | 25 points | `VERY_POOR` (5), `POOR` (10), `FAIR` (17), `GOOD` (22), `EXCELLENT` (25) |
| **Muscle Soreness** | 20 points | `VERY_HIGH` (2), `HIGH` (6), `MODERATE` (12), `MILD` (17), `NONE` (20) |
| **Perceived Stress** | 15 points | `VERY_HIGH` (2), `HIGH` (5), `MODERATE` (9), `LOW` (13), `VERY_LOW` (15) |
| **Motivation Level** | 15 points | `VERY_LOW` (2), `LOW` (5), `MODERATE` (9), `HIGH` (13), `VERY_HIGH` (15) |

### Category Thresholds:
- **`OPTIMAL`** (Score ≥ 80): High capacity for programmed workouts and progressive overload.
- **`MODERATE`** (Score 50–79): Standard training capacity; maintain planned volume, monitor recovery.
- **`RECOVERY_FOCUSED`** (Score < 50): Physiological fatigue or soreness elevated; recommend lighter technical work, mobility, or active recovery.

---

## 5. Deterministic Trend Detection Engine

Trends are calculated purely from verified historical records and require a minimum of **3 completed check-ins** (`TREND_OBSERVATION_MINIMUM = 3`) to establish an authentic baseline:

1. **`ENERGY_DECLINING`**: 3 consecutive check-ins reporting `LOW` or `VERY_LOW` energy.
2. **`ENERGY_IMPROVING`**: 3 consecutive check-ins reporting `GOOD` or `VERY_GOOD` energy.
3. **`SORENESS_INCREASING`**: 3 consecutive check-ins reporting `HIGH` or `VERY_HIGH` soreness.
4. **`SLEEP_DECLINING`**: 3 consecutive check-ins reporting `POOR` or `VERY_POOR` sleep.
5. **`MOTIVATION_DECLINING`**: 3 consecutive check-ins reporting `LOW` or `VERY_LOW` motivation.
6. **`TRAINING_CONSISTENCY_IMPROVING`**: ≥ 75% adherence across observed window.
7. **`TRAINING_CONSISTENCY_DECLINING`**: ≤ 33% adherence across observed window.

---

## 6. Safety Guardrails & Acute Red-Flag Deflections

### Red-Flag Screening:
The `DailyCheckInSafetyService` intercepts free-text notes and ratings before AI processing:
- **Cardiovascular Symptoms**: `CHEST_PAIN`, severe chest tightness, heart palpitations.
- **Respiratory Distress**: `DIFFICULTY_BREATHING`, shortness of breath at rest.
- **Loss of Consciousness**: `FAINTING_DIZZINESS`, passed out, blacked out, room spinning.
- **Acute Physical Trauma**: `ACUTE_INJURY`, joint popped, inability to bear weight, broken bone.
- **Rhabdomyolysis Indicators**: `EXTREME_SORENESS` accompanied by swollen muscles or dark urine.

### Safety Protocol on Detection:
1. Coaching and workout advice are **instantly halted**.
2. Structured output is replaced with immediate **non-medical emergency guidance** directing the member to seek medical care or call 000 / 911.
3. An immutable safety escalation audit record is persisted (`AIFitnessSafetyEscalation`).
4. Readout explicitly re-iterates that FitCore does not provide clinical diagnoses.

---

## 7. Coach Handoff Architecture

When deep specialization is indicated by the daily check-in, structured handoffs are generated for existing specialized coaches:
- **Fitness Coach Handoff (`FITNESS_COACH`)**: Suggested when soreness is focal, today's workout has heavy technical lifts, or the member expresses uncertainty about exercise substitutions.
- **Nutrition Coach Handoff (`NUTRITION_COACH`)**: Suggested when low energy aligns with caloric deficits or skipped post-workout meals.

The mobile interface renders direct deep-link CTAs navigating directly to `AICoachScreen` or `NutritionCoachScreen` with contextual prompt seeds.

---

## 8. Mobile Client Implementation

The mobile app provides a dedicated **Daily Check-In suite** located in `apps/mobile/src/features/check-ins/`:
- **`DailyCheckInHomeScreen`**: Central entry point displaying today's check-in status, readiness progress ring (when completed), historical trends teaser, and rapid start CTA.
- **`DailyCheckInQuestionScreen`**: A streamlined 30–60 second multi-question check-in questionnaire (Energy, Sleep, Soreness, Stress, Motivation, Yesterday's Workout, Notes).
- **`DailyCheckInResultScreen`**: Complete daily intelligence breakdown featuring the readiness ring, Today's Focus card, actionable recommendation cards, coach handoff CTAs, feedback submission, and privacy transparency modal.
- **`DailyCheckInHistoryScreen`**: Archive of past check-ins with date filtering, observed trends badge strip, and status pills.
- **`DailyCheckInDetailScreen`**: Historical inspection of any past check-in with complete member inputs and AI suggestions.
- **`MemberHomeScreen` Integration**: The main dashboard dynamically binds to live daily check-in state, showing live readiness and focus or prompting the member to log their 30s check-in.
