# ADR-046: Exercise Collections, Programs & Guided Learning Paths

## Status
Accepted

## Context
Across Days 61 to 69, FitBeat established a powerful visual exercise library, metadata schemas, biomechanical phase breakdowns, multi-angle media playback, personalization preferences, and interactive anatomical discovery (BodyMap & dimension explorers). 

However, presenting exercises solely as a flat or filtered encyclopedia leaves a critical member question unanswered:
> *"What should I learn next, and in what order?"*

To transform FitBeat into a true fitness learning platform, we need structured educational journeys:
1. Curated groupings of movements for workouts, warmups, and mobility series (**Exercise Collections**).
2. Sequenced, step-by-step masterclasses with pedagogical progression, theory, checkpoints, and completion tracking (**Guided Learning Paths**).

Crucially, we must address how this educational curriculum relates to workout execution (Days 20–35), ensuring clarity of purpose and preserving database integrity.

## Decision

### 1. Strict Architectural Separation: Education vs. Workout Execution
We explicitly decouple **Learning Paths / Lessons** from **Workout Sessions / Logs**:
- Guided Learning Paths exist to teach technique, joint positioning, movement cues, and biomechanics.
- Completing an educational lesson **never** logs a completed workout session, nor does it write to active workout volume logs.
- This clean separation ensures member learning analytics (mastery, curriculum completion) do not pollute physical training metrics (sets, volume, 1RM, heart rate zones).

### 2. Relational Hierarchy in Database
We implemented 8 relational models in PostgreSQL via Prisma:
- `ExerciseCollection` & `ExerciseCollectionItem`: Groupings of exercises with sort order, customized titles, and learning objectives.
- `LearningPath`, `LearningPathSection`, `LearningPathLesson`: Multi-tiered masterclasses containing structured sections and individual lessons. Lessons can link to an `exerciseId` for live visual synchronization.
- `UserLearningPathProgress`: Aggregated member status (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`), percentage calculation, and timestamp tracking.
- `UserLessonCompletion`: Granular completion events per lesson per user, supporting auditability and personal notes.
- `TrainerLearningPathAssignment`: Coach-directed curriculum assignment to members with target completion dates.

### 3. State Machine & Resettable Progress
Member progress transitions deterministically:
- `NOT_STARTED` -> `IN_PROGRESS` (upon finishing lesson 1 or initiating path) -> `COMPLETED` (when `completedLessons === totalLessons`).
- Progress can be safely reset (`POST /exercises/learning-paths/:id/reset`), enabling members to review a masterclass from scratch while retaining historical completion logs if needed.
- Re-completing already-finished lessons is idempotent.

### 4. Bidirectional Discovery & Cross-Linking
- Every exercise detail screen surfaces: *"Taught in Guided Masterclasses & Curated Collections"* via `GET /exercises/:exerciseId/related-curriculum`.
- Learning paths and collections surface direct links back to full interactive exercise breakdowns.
- The Exercise Library home features dedicated Hub Tiles into Collections and Learning Paths.

### 5. Multi-Tenant Isolation
- Collections and Paths with `tenantId: null` represent global system masterclasses accessible across all facilities.
- Collections and Paths with a specific `tenantId` represent facility-custom or trainer-created curricula.
- All backend queries strictly enforce tenant boundaries using Prisma `AND: [{ OR: [...] }]` structures.

## Consequences

### Positive
- Members gain structured guidance from beginner fundamentals to advanced lifts without getting lost in the broader exercise library.
- Trainers can prescribe structured learning paths to clients alongside workout programs.
- Bi-directional linking ensures high discoverability between individual exercises and comprehensive courses.
- Educational progress is completely distinct from workout load, preventing metric distortion.

### Negative / Trade-offs
- Additional database tables and relationships require maintenance and indexing.
- Mobile client requires 5 additional navigation destinations and specialized curriculum player screens.
