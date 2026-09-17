# ADR-047: Member Learning Dashboard & Progress Intelligence

## Status
Accepted

## Context
Across Days 61 to 70, FitBeat established the Visual Exercise Learning platform, culminating on Day 70 with structured Exercise Collections and Guided Learning Paths.

While members could discover paths and complete lessons, the system lacked a cohesive **Learning Intelligence layer**. Members faced ambiguity:
> *"What am I currently learning?"*  
> *"What have I completed across the entire curriculum?"*  
> *"Where did I leave off, and how do I jump right back in?"*  
> *"Which specific exercises and skills have I mastered?"*  
> *"What should I learn next?"*

To solve this, Day 71 introduces a dedicated Member Learning Dashboard, progress aggregation engine, deterministic resume intelligence, and rule-based curriculum recommendations.

## Decision

### 1. Deterministic Resume Intelligence
Rather than requiring members to navigate hierarchies (Library → Category → Path → Section → Lesson), the system computes a deterministic resume state:
- Identifies the most recently interacted active path (`status: 'IN_PROGRESS'`).
- Locates the first uncompleted lesson in sequential order.
- Computes overall path progress percentage and remaining time.
- Exposes this via `GET /learning/resume` and powers the 1-tap `ContinueLearningHero` widget.
- When all active paths are 100% complete, the hero gracefully yields to recommended next paths.

### 2. Verified Ground-Truth Intelligence & Streak Computation
- **No Synthetic Learning Time:** Time spent learning is derived solely by summing `estimatedMinutes` of actual completed lessons (`UserLessonCompletion`).
- **Timezone-Aware Daily Streak:** Streaks are computed by sorting distinct completion dates in descending order and verifying day-by-day continuity from today or yesterday.
- **Mastery Status:** Exercises are marked `LEARNED` if the member completed an educational lesson directly teaching that exercise or completed all instructional checkpoints.

### 3. Rule-Based, Explainable Recommendations (Zero LLM / AI Drift)
Recommendations are calculated via deterministic heuristics with explicit reason codes:
- Suggests unstarted beginner or intermediate paths in categories the member is actively learning or has completed (`SAME_CATEGORY`).
- Suggests next difficulty levels as prerequisites are fulfilled (`PROGRESSION_LADDER`).
- Matches user fitness goals and available equipment.
- Every recommendation exposes a human-readable `reason` string.

### 4. Educational Decoupling Maintained
- Educational completions (`UserLessonCompletion`, `UserLearningPathProgress`, `UserCollectionProgress`) remain strictly decoupled from physical workout session logs (`WorkoutSession`, `WorkoutLog`).
- No workout sets, reps, or cardiovascular logs are altered when lessons are completed.

### 5. Multi-Tenant Isolation & IDOR Protection
- Endpoints enforce dual tenancy (`tenantId` and `userId` extracted strictly from verified JWT tokens).
- Members cannot query or manipulate progress data of other members.

## Consequences

### Positive
- Members have immediate clarity on their learning journey through a unified dashboard.
- 1-tap lesson continuation reduces friction and boosts learning habit formation.
- Transparent, explainable recommendations eliminate hallucination and maintain gym curriculum integrity.
- Exercise detail screens show verified mastery status with direct links back to guided paths.

### Negative / Trade-offs
- Added aggregation queries require indexed foreign keys (`userId`, `pathId`, `completedAt`).
- Daily streak calculations require processing recent lesson completion dates.
