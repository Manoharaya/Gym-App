# FitBeat Visual Movement Coach — Guided Movement Practice Architecture

## Executive Summary
Day 82 delivers the **Guided Movement Practice Sessions & Movement Feedback Experience** for FitBeat 2.0.
Building directly on Day 81's structured foundation (`MovementExpectation`, `MovementFeedbackRule`, `TechniqueChecklist`), Day 82 empowers members to actively rehearse exercises phase-by-phase with deliberate focus, posture checkpoints, timers, rep counters, self-reflection, and educational learning feedback.

---

## 1. End-to-End User Journey

```text
[ Exercise Detail Screen ]
         │
         ▼  "Practice With Visual Coach"
[ Visual Movement Coach Screen ]
         │
         ▼  "Start Practice Mode"
[ Guided Movement Practice Screen ]
         │
         ├─► Step 1: INTRO (Overview, Time, Phases Preview, Pre-Camera Notice)
         │
         ├─► Step 2: PREPARATION (Clear Space, Equipment Check, Setup Instructions)
         │
         ├─► Step 3: PHASE REHEARSAL (Phases 1..N: Cues, Expectations, Reps, Stopwatch)
         │
         ├─► Step 4: SELF-REFLECTION (Movement Checklist, Form Topics, Notes)
         │
         ├─► Step 5: KNOWLEDGE CHECK (Sanitized Multi-Choice Quiz on Mechanics)
         │
         └─► Step 6: SUMMARY (Educational Assessment, Strengths, Repeat/Finish)
```

---

## 2. Architecture & Data Flow

### 2.1 Backend Data Model
```prisma
model MovementPracticeSession {
  id                    String    @id @default(cuid())
  organisationId        String
  userId                String
  exerciseId            String
  tutorialId            String?
  sessionType           String    @default("GUIDED_PRACTICE") // GUIDED_PRACTICE, PHASE_FOCUS, QUICK_REHEARSAL
  status                String    @default("IN_PROGRESS")    // NOT_STARTED, IN_PROGRESS, PAUSED, COMPLETED, ABANDONED
  currentStep           String    @default("INTRO")          // INTRO, PREPARATION, PHASE_LEARNING, PHASE_PRACTICE, PHASE_REVIEW, SELF_REVIEW, KNOWLEDGE_CHECK, SUMMARY, COMPLETED
  currentPhaseId        String?
  currentPhaseIndex     Int       @default(0)
  totalSteps            Int       @default(1)
  progressPercent       Float     @default(0.0)
  completedPhases       Json?     // string[]
  checklistState        Json?     // Record<string, boolean>
  phasePracticeData     Json?     // PhasePracticeRecord[]: { phaseId, reps, durationSeconds, completedAt }
  selfReflection        Json?     // { selectedTopics: string[], notes: string }
  knowledgeCheckScore   Float?
  knowledgeCheckCompleted Boolean @default(false)
  startedAt             DateTime? @default(now())
  lastActiveAt          DateTime  @default(now())
  completedAt           DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user                  User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  exercise              Exercise               @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  currentPhase          ExerciseMovementPhase? @relation(fields: [currentPhaseId], references: [id], onDelete: SetNull)
}
```

### 2.2 Integration with Learning Mastery & Progress
On session completion (`completeSession`):
1. **Exercise Learning Progress**:
   - `ExerciseLearningProgress` is upserted with `status = 'COMPLETED'` and `practiceCompleted = true`.
2. **Learning Mastery**:
   - Emits learning telemetry `practice_completed` to `ExerciseLearningMasteryService`.
   - Mastery progresses to `PROGRESSING` or `COMPLETED`.
3. **Physical Workout Isolation**:
   - Zero rows are created or modified in `Workout` or `WorkoutExercise` tables. Rehearsal remains strictly educational.

---

## 3. Mobile UI Component Hierarchy

| Component | Responsibility |
| :--- | :--- |
| `GuidedPracticeIntroCard` | Presents exercise stats, phases count, estimated minutes, practice preview, and educational notice. |
| `GuidedPracticePreparationCard` | Verifies space clearance, equipment readiness, starting position, and safety warnings. |
| `PhasePracticeInteractiveCard` | Displays phase coaching cue, form checkpoints, common mistakes, rep counter, and stopwatch timer. |
| `GuidedPracticeSummaryCard` | Shows celebration badge, rehearsal stats (phases, checkpoints, quiz), educational form assessment, and next actions. |
| `GuidedMovementPracticeScreen` | Full-screen state machine coordinating step transitions, persistence, and navigation. |

---

## 4. Verification & Testing Summary

1. **Backend E2E Suite (`services/api/test/visual-movement-practice.e2e-spec.ts`)**:
   - 13/13 passing tests.
   - Verified data retrieval, phase rehearsal recording, checklist updating, session completion, learning progress sync, and multi-tenant IDOR protection.
2. **Regression Suites**:
   - Day 81: `test/visual-movement-coach.e2e-spec.ts` (14/14 passed).
   - Day 80: `test/learning-hub.e2e-spec.ts` (10/10 passed).
3. **Mobile Client Verification**:
   - Clean compilation in `apps/mobile/src/features/exercises/` with 0 TypeScript errors.
   - Screen and components integrated with navigation routes and primary actions.
