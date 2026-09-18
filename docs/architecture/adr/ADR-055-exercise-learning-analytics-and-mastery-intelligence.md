# ADR-055: Exercise Learning Analytics, Skill Progression & Member Mastery Intelligence

## Status
Accepted (Day 79)

## Context
Across Days 61–78, FitBeat 2.0 established an extensive exercise education infrastructure, including the exercise library, multi-angle demonstrations, interactive tutorials, guided exercise sessions, knowledge checks, curriculum paths, and personalized learning adaptations.

However, prior to Day 79:
1. Learning telemetry was scattered across disparate models (`ExerciseLearningProgress`, `TutorialUserProgress`, `GuidedSessionUserProgress`, `KnowledgeCheckAttempt`).
2. There was no unified, authoritative definition of educational **Mastery** or standard state progression (`NOT_STARTED` $\to$ `EXPLORING` $\to$ `LEARNING` $\to$ `PRACTICING` $\to$ `PROGRESSING` $\to$ `COMPLETED` $\to$ `MASTERED` $\to$ `REVIEW`).
3. Members lacked a centralized mastery dashboard tracking their aggregate educational investment (time learned, checkpoints completed, exercises mastered, and targeted review queues).
4. Content authors, trainers, and administrators had no drop-off funnel analytics to identify which tutorial sections (Setup, Movement Breakdown, Practice, or Knowledge Check) caused student disengagement.

## Decisions

### 1. Unified Learning Mastery State Machine (`LearningMastery`)
- Introduced the `LearningMastery` model in PostgreSQL, keyed by `[userId, organisationId, contentType, contentId]`.
- Enforces an educational state machine with deterministic transitions:
  - `NOT_STARTED`: Content cataloged but unviewed.
  - `EXPLORING`: Member initiated viewing (overview/quick facts).
  - `LEARNING`: Actively studying movement phases, trajectory cues, or anatomy.
  - `PRACTICING`: Rehearsing exercise technique with self-guided practice checklist.
  - `PROGRESSING`: Completed rehearsal checklist; advancing through multi-part curriculum.
  - `COMPLETED`: All authored tutorial movement phases, instructions, and practice steps completed.
  - `MASTERED`: Completed requirements AND achieved $\ge 80\%$ on comprehension knowledge check.
  - `REVIEW`: Knowledge check scored $< 70\%$ or technique review recommended.
- Tracks granular progress: `completionPercent` ($0.0-100.0\%$), `sectionsCompleted` (`string[]`), `knowledgeCheckScore`, `knowledgeCheckAttempts`, `masteredAt`, `reviewRecommendedAt`, and `reviewReason`.

### 2. High-Fidelity Educational Telemetry Pipeline (`LearningActivityEvent`)
- Telemetry events (`TUTORIAL_STARTED`, `SECTION_VIEWED`, `PHASE_EXPLORED`, `MEDIA_ANGLE_SWITCHED`, `INSTRUCTION_EXPANDED`, `PRACTICE_REP_CHECKED`, `PRACTICE_COMPLETED`, `KNOWLEDGE_CHECK_PASSED`, `KNOWLEDGE_CHECK_FAILED`, `TUTORIAL_COMPLETED`, `REVIEW_OPENED`) are ingested asynchronously via `POST /learning/events`.
- Events update the underlying `LearningMastery` projection in real-time, recalculating section checkpoints and completion percentages deterministically.

### 3. Transparent Funnel Analytics & Platform Intelligence
- Real-time 6-stage drop-off funnel computation:
  `Starts` $\to$ `Intro & Setup` $\to$ `Movement Breakdown` $\to$ `Interactive Practice` $\to$ `Knowledge Check` $\to$ `Completed & Mastered`.
- Computes actual completion rates, review rates, and average engagement times from logged events without synthetic estimation.
- Tenant-wide platform analytics (`GET /learning/analytics/overview`) surface top mastered exercises and stages with elevated drop-off rates for curriculum refinement.

### 4. Trainer Co-Pilot & Member Educational Privacy
- Multi-tenant isolation: Trainers can query member learning profiles (`GET /learning/trainer/members/:memberId`) strictly within their assigned organization. Cross-tenant access is rejected with `403 Forbidden`.
- Separation of physical workouts and educational telemetry: Rehearsals and mastery checks never mutate `Workout` or `WorkoutExercise` tables.

### 5. Non-Diagnostic Boundary
- Educational mastery denotes fulfillment of instructional curriculum and quiz comprehension. The system strictly disclaims automated athletic certification, camera pose estimation, and medical/biomechanical diagnosis.

## Consequences

- **Positive**:
  - Unifies learner progression across standalone exercises, tutorials, guided sessions, and academy tracks into a single canonical source of truth.
  - Equips learners with clear progression goals, motivational badges, and automated review cues.
  - Delivers actionable curricular insights to trainers and admins through deterministic drop-off funnels.
  - Guarantees backward compatibility with Days 61–78 models while establishing the foundation for Day 80.
- **Neutral**:
  - Introduces two indexed database tables (`LearningMastery`, `LearningActivityEvent`).
  - Mobile client surfaces richer progress states via `ContentMasteryBadge` and `LearningJourneyVisualizer`.
