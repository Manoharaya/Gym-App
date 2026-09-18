# ADR-059: Visual Movement Coach — Movement Learning Intelligence, Adaptive Practice & Learning Gap Detection

## Status
Accepted (Day 83)

## Context
Following Day 81's structural coach foundation (`MovementExpectation`, `MovementFeedbackRule`) and Day 82's guided rehearsal execution (`MovementPracticeSession`), Day 83 introduces the **Movement Learning Intelligence layer**.

Prior to Day 83, FitBeat could present static exercise tutorials and record practice sessions, but lacked an intelligent and deterministic understanding of:
1. What a member has completed vs. what remains uncompleted.
2. Which specific movement phases have not been rehearsed.
3. Which technique concepts require review based on quiz performance or staleness.
4. What practice should be recommended next based on movement pattern fundamentals and prerequisites.
5. Rapid technique reinforcement via 30–60s "Quick Refresh" mode.
6. How to synthesize a personalized, targeted rehearsal session ("Practice What I Need to Review").

### Strict Scope & Non-Diagnostic Boundaries
1. **Zero Camera / Computer Vision**: No webcam, MediaPipe, OpenCV, TensorFlow, pose estimation, automatic rep counting, or automated form scoring is implemented today.
2. **Non-Diagnostic & Educational Tone**: The system evaluates **learning behavior and comprehension only** (e.g., "Review Bottom Position because this phase has not yet been practiced"), never physical capability or health (no "bad form", "weakness", or "unsafe movement").
3. **Physical Workout Isolation**: Movement learning intelligence and adaptive rehearsal sessions do not create, modify, or corrupt physical workout tracking logs (`Workout`, `WorkoutExercise`).
4. **Deterministic Rules**: All gap detection and recommendation priorities are deterministic and transparent. No black-box AI recommendation score or opaque LLM reasoning is used for decision-making.

---

## Decisions

### 1. Unified Architecture over Duplicate Engines
To honor the core architectural mandate ("Do NOT create a second recommendation engine"), we unified movement learning intelligence under `MovementLearningIntelligenceService`, extending and integrating with:
- `ExerciseLearningPersonalizationService` (Day 78)
- `ExerciseLearningMasteryService` (Day 79)
- `MovementPracticeService` (Day 82)
- `VisualMovementCoachService` (Day 81)
- `LearningHubService` (Day 80)

### 2. Database Schema Extensions (`schema.prisma`)
- Added `LearningGap` model:
  - Multi-tenant isolation (`organisationId`, `userId`, `exerciseId`, `movementPhaseId`).
  - Strict lifecycle states: `OPEN` $\to$ `IN_PROGRESS` $\to$ `RESOLVED` $\to$ `DISMISSED`.
  - Transparent rationale text and contextual JSON metadata (`score`, `phaseName`, `prerequisiteName`).
  - Compound indexes on `[organisationId, userId, status]`, `[userId, gapType, status]`, `[exerciseId]`, `[movementPhaseId]`.
- Extended `LearningPersonalizationProfile`:
  - Added movement aggregates: `totalExercisesLearned`, `totalExercisesCompleted`, `totalPhasesCompleted`, `totalPracticesCompleted`, `lastMovementLearningActivity`.

### 3. Deterministic Gap Detection Rules
1. `INCOMPLETE`: Tutorial started (`completedSteps > 0`) but uncompleted (`< 100%`). Priority: `MEDIUM`.
2. `LOW_KNOWLEDGE_CHECK_RESULT`: Quiz attempt score $< 75\%$. Priority: `MEDIUM`.
3. `UNREVIEWED_PHASE`: Published movement phase never completed in any practice session. Priority: `MEDIUM`.
4. `MISSED_PREREQUISITE`: Exercise is a progression from a base exercise that is not completed. Priority: `HIGH`.
5. `REPEATED_REVIEW`: Phase practiced or reviewed $\ge 3$ times. Priority: `LOW`.
6. `ABANDONED`: Practice session started $> 24$ hours ago and left incomplete. Priority: `MEDIUM`.
7. `STALE_LEARNING`: Exercise completed $> 30$ days ago without recent rehearsal. Priority: `LOW`.

### 4. Deterministic Prioritization & Transparent Reasons
- Prioritization hierarchy: `HIGH` $\to$ `MEDIUM` $\to$ `LOW`.
- Missed prerequisites receive `HIGH` priority to ensure fundamentals are mastered first.
- Every recommendation provides an explainable reason (e.g., `"Review Bottom Position because this movement phase has not been completed."`).

### 5. Consolidated Read Model (`GET /api/v1/movement-learning/me`)
A single aggregated endpoint feeds client dashboards with 6 structured sections:
1. `continueLearning`: In-progress tutorials and sessions.
2. `needsReview`: Active gaps sorted deterministically.
3. `recommendedPractice`: Prerequisite progressions and phase-level practice suggestions.
4. `quickRefresh`: 30-60s rapid refresher candidates.
5. `recentlyLearned`: Mastered / completed technique content.
6. `learningSummary`: Aggregated metrics.

### 6. Quick Refresh Mode (`GET /api/v1/movement-learning/quick-refresh/:exerciseId`)
Compressed 30-60s rapid walkthrough payload containing:
- Baseline setup notes & equipment checklist.
- Movement phases with essential cues, tempo, and mistakes to avoid.
- Cadence & breathing pattern summary.
- 5-point rapid checklist.

### 7. Adaptive Targeted Rehearsal (`POST /api/v1/movement-learning/targeted-session`)
Enables "Practice What I Need to Review" by creating a `MovementPracticeSession` with `sessionType: 'TARGETED_REVIEW'`, linking target phase IDs from active gaps and marking gaps `IN_PROGRESS`.

### 8. Mobile Client Architecture (`apps/mobile`)
- Extended `ExerciseService` with Day 83 static methods and TypeScript interfaces.
- Built modular UI components:
  - `LearningGapCard`: Priority-badged gap card with transparent reason and "Review Phase" CTA.
  - `QuickRefreshCard`: Interactive 30-60s rapid refresher card and full-screen modal walkthrough.
  - `AdaptivePracticePlanCard`: Tailored rehearsal sequence card with "Start Targeted Practice" CTA.
  - `MovementLearningJourneyCard`: Visual 6-step progression (`Learn` $\to$ `Understand` $\to$ `Practice` $\to$ `Review` $\to$ `Quiz` $\to$ `Master`) with technique concept coverage.
- Integrated into `VisualMovementCoachScreen` and `LearningHomeScreen`.

---

## Consequences

### Positive
- **Deterministic & Explainable**: Members always understand *why* a review is recommended based strictly on their actual activity.
- **Zero Hallucination / Black-Box Risk**: Rule-driven engine eliminates unpredictability from LLMs or opaque heuristics.
- **Workout History Integrity**: Guaranteed zero contamination of physical workout records.
- **High Performance**: Consolidated aggregation endpoint avoids client round-trip waterfalls.
- **Future AI & CV Ready**: Clear abstractions allow future computer vision or AI providers to plug in seamlessly without rewriting the exercise learning architecture.

### Neutral
- Member movement profile aggregates are updated incrementally on gap detection and session completion.
