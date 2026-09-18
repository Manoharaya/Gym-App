# FitBeat Movement Learning Intelligence, Adaptive Practice & Gap Detection Architecture

## Executive Summary
Day 83 delivers the **Movement Learning Intelligence Layer** of FitBeat's Visual Movement Coach.
Building directly upon Days 81 (structured movement foundation) and 82 (guided practice sessions), Day 83 enables FitBeat to intelligently and deterministically understand:
- What the member has learned vs. what remains uncompleted.
- Which specific movement phases have not been rehearsed.
- Which technique concepts need review based on quiz performance or staleness.
- What practice should be recommended next based on movement pattern fundamentals and prerequisites.
- When an educational "Quick Refresh" (30–60s) is recommended.
- How to create a personalized, targeted rehearsal session ("Practice What I Need to Review").

---

## 1. End-to-End Learning Intelligence Flow

```text
Exercise
   │
   ▼
Movement Structure (Day 81)
   │
   ▼
Movement Phases & Expectations (Day 81)
   │
   ▼
Guided Practice History (Day 82)
   │
   ▼
Knowledge Checks (Day 72)
   │
   ▼
Learning Progress & Mastery (Days 71, 79)
   │
   ▼
Deterministic Learning Gap Detection (Day 83)
   │
   ├─► INCOMPLETE: Tutorial started but not finished
   ├─► LOW_KNOWLEDGE_CHECK_RESULT: Quiz score < 75%
   ├─► UNREVIEWED_PHASE: Published phase not yet practiced
   ├─► MISSED_PREREQUISITE: Progression exercise without completed base
   ├─► REPEATED_REVIEW: Phase practiced >= 3 times
   ├─► ABANDONED: Practice session left incomplete > 24h
   └─► STALE_LEARNING: Completed > 30 days ago without recent review
   │
   ▼
Deterministic Prioritization (HIGH -> MEDIUM -> LOW)
   │
   ▼
Actionable Deliverables:
   ├─► Consolidated Learning Read Model (GET /api/v1/movement-learning/me)
   ├─► Needs Review & Technique Focus Cards (LearningGapCard)
   ├─► Adaptive Targeted Practice Session (AdaptivePracticePlanCard)
   ├─► 30–60s Quick Refresh Walkthrough (QuickRefreshCard)
   └─► Visual Educational Learning Journey (MovementLearningJourneyCard)
```

---

## 2. Core Architecture & Data Models

### 2.1 Prisma Data Model: `LearningGap`
```prisma
model LearningGap {
  id              String                 @id @default(cuid())
  organisationId  String
  userId          String
  contentType     String                 @default("EXERCISE")
  contentId       String
  exerciseId      String?
  movementPhaseId String?
  gapType         String                 // INCOMPLETE, LOW_KNOWLEDGE_CHECK_RESULT, etc.
  priority        String                 @default("MEDIUM") // HIGH, MEDIUM, LOW
  reason          String                 // Transparent educational explanation
  status          String                 @default("OPEN")   // OPEN, IN_PROGRESS, RESOLVED, DISMISSED
  contextData     Json?                  // { phaseName, score, prerequisiteName }
  detectedAt      DateTime               @default(now())
  lastReviewedAt  DateTime?
  resolvedAt      DateTime?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  user            User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  exercise        Exercise?              @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  movementPhase   ExerciseMovementPhase? @relation(fields: [movementPhaseId], references: [id], onDelete: SetNull)

  @@index([organisationId, userId, status])
  @@index([userId, gapType, status])
  @@index([exerciseId])
  @@index([movementPhaseId])
  @@map("learning_gaps")
}
```

### 2.2 Profile Extension: `LearningPersonalizationProfile`
```prisma
model LearningPersonalizationProfile {
  // ... existing preferences ...
  totalExercisesLearned        Int          @default(0)
  totalExercisesCompleted      Int          @default(0)
  totalPhasesCompleted         Int          @default(0)
  totalPracticesCompleted      Int          @default(0)
  lastMovementLearningActivity DateTime?
}
```

---

## 3. Deterministic Gap Detection & Resolution Rules

| Gap Type | Detection Condition | Deterministic Priority | Transparent Rationale |
| :--- | :--- | :--- | :--- |
| `MISSED_PREREQUISITE` | Progression exercise where base exercise is incomplete | `HIGH` | `"Review ${prerequisiteName} movement fundamentals before progressing to ${exerciseName}."` |
| `INCOMPLETE` | Tutorial started (`completedSteps > 0`) but `< 100%` complete | `MEDIUM` | `"Continue this exercise tutorial for ${exerciseName} because you started it previously."` |
| `UNREVIEWED_PHASE` | Published phase not practiced in any session | `MEDIUM` | `"Review ${phaseName} because this movement phase has not been completed."` |
| `LOW_KNOWLEDGE_CHECK_RESULT` | Quiz score `< 75%` | `MEDIUM` | `"Review this topic because your last knowledge check score (${score}%) requires another review."` |
| `ABANDONED` | Practice session started `> 24h` ago left incomplete | `MEDIUM` | `"Continue guided practice session for ${exerciseName} that was paused previously."` |
| `REPEATED_REVIEW` | Phase practiced $\ge 3$ times | `LOW` | `"Targeted review recommended for ${phaseName} based on repeated phase focus."` |
| `STALE_LEARNING` | Completed `> 30` days ago with no recent review | `LOW` | `"Refresh recommended for ${exerciseName} technique fundamentals."` |

### Auto-Resolution
- Gaps are resolved automatically when the member satisfies the educational condition (e.g. completes base exercise, passes quiz $\ge 75\%$, or completes the unreviewed phase in practice).
- Gaps can also be explicitly resolved or dismissed by the member or authorized trainer.

---

## 4. API Endpoints

| Method | Path | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/movement-learning/me` | Member (Self) | Consolidated read model (continue, needs review, recommendations, quick refresh) |
| `GET` | `/api/v1/movement-learning/gaps` | Member (Self) | Query active learning gaps sorted by priority |
| `POST` | `/api/v1/movement-learning/gaps/:id/resolve` | Member / Trainer | Mark learning gap resolved or dismissed |
| `POST` | `/api/v1/movement-learning/targeted-session` | Member (Self) | Create adaptive practice session focused on gaps |
| `GET` | `/api/v1/movement-learning/quick-refresh/:exerciseId` | Member | 30–60s rapid technique refresher payload |
| `GET` | `/api/v1/exercises/:id/learning-intelligence` | Member | Exercise-specific gap and phase checklist status |
| `GET` | `/api/v1/movement-learning/trainer/member/:memberId` | Trainer / Admin | Trainer view of client learning comprehension |
| `GET` | `/api/v1/movement-learning/admin/analytics` | Admin / Manager | Content quality and phase drop-off analytics |

---

## 5. Non-Diagnostic Educational Scope Guarantees

1. **Zero Camera / Computer Vision**: Strictly pre-camera. No MediaPipe, webcam analysis, pose estimation, automatic rep counting, or form scoring.
2. **Zero Mutation of Physical Workouts**: Rehearsal sessions and gap tracking do not touch `Workout` or `WorkoutExercise` tables.
3. **Strictly Non-Diagnostic Copy**: No claims regarding physical dysfunction, anatomical weakness, or injury risk (e.g., never "bad form", "weak core", or "unsafe movement").
4. **Deterministic Rules Only**: No AI recommendation scores or black-box LLM reasoning.
