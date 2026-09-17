# FitBeat Architecture: Personalized Exercise Discovery & Smart Learning Foundation

## Overview
Day 68 establishes the **Personalized Exercise Discovery & Smart Learning Foundation** for FitBeat. This architecture transforms the Visual Exercise Library into an intelligent, member-centric hub that dynamically prioritizes, scores, and surfaces exercise movements aligned with each member's individual fitness goals, available equipment, difficulty tier, workout history, and learning progress.

Crucially, this system operates on a **deterministic, zero-blackbox scoring model** without requiring non-deterministic LLMs for library organization, ensuring transparent explanations, zero latency overhead, multi-tenant isolation, and complete user control.

---

## Architecture Components

### 1. Data Models (`schema.prisma`)
- **`MemberExercisePreference`**:
  - Encapsulates member-specified discovery parameters:
    - `fitnessGoals`: Array of primary training goals (e.g. `['BUILD_MUSCLE', 'STRENGTH']`).
    - `preferredDifficulty`: Explicit difficulty cap/preference (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`).
    - `preferredCategories`: Training style categories (`STRENGTH`, `CARDIO`, `MOBILITY`, `FUNCTIONAL`).
    - `availableEquipment`: Hardware accessible to member (`BARBELL`, `DUMBBELL`, `BODYWEIGHT`, `CABLE`, etc.).
    - `workoutLocation`: Active training environment (`GYM`, `HOME`, `OUTDOORS`).
  - Strict multi-tenant mapping: `userId` (unique) + `organisationId`.
- **`ExerciseLearningProgress`**:
  - Tracks visual educational milestones per exercise:
    - `status`: `NOT_STARTED` | `IN_PROGRESS` | `COMPLETED`.
    - `completedSteps`: Count of completed instructions.
    - `totalSteps`: Total steps in the exercise guide.
    - `lastStepNumber`: Resume bookmark for step stepper.
    - `mediaViewed`: Boolean flag for demonstration media exploration.
    - `instructionsViewed`: Boolean flag for written instruction review.
    - `phasesExplored`: Boolean flag for biomechanical phase breakdown exploration.
    - `completedAt`: Nullable timestamp when member marked mastery.
  - Unique composite constraint: `@@unique([userId, exerciseId])`.

---

### 2. Deterministic Personalization Engine (`ExercisePersonalizationService`)

#### Signal Aggregation
The personalization engine queries active tenant exercise records alongside member-specific activity signals:
1. **User Preferences**: Explicit `MemberExercisePreference` or fallback goals derived from `TrainingGoal` / profile.
2. **Bookmarked Favorites**: Sourced from `UserExerciseFavorite`.
3. **Recent Views**: Sourced from `UserExerciseRecentView` (ordered by `lastViewedAt` desc).
4. **Workout History Usage**: Sourced from `WorkoutExercise` via member `Workout` records.
5. **Educational Learning Records**: Sourced from `ExerciseLearningProgress`.

#### Scoring Algorithm
Every accessible exercise candidate receives a deterministic score:
$$\text{Score} = S_{\text{goal}} + S_{\text{equip}} + S_{\text{diff}} + S_{\text{fav}} + S_{\text{cat}} + S_{\text{recency}}$$

- **Goal Match (+35 pts)**: Bidirectional mapping between member goals (`BUILD_MUSCLE`, `STRENGTH`, `WEIGHT_LOSS`, `MOBILITY`) and exercise categories / training goals.
- **Equipment Compatibility (+25 pts)**: Exercise equipment matches member gear list, or requires no equipment / bodyweight.
- **Difficulty Match (+20 pts)**: Exercise difficulty matches member experience tier.
- **Favorite Signal (+15 pts)**: Exercise is bookmarked by member.
- **Category Preference (+10 pts)**: Exercise category aligns with member preferred styles.
- **Recent Interest (+5 pts)**: Member viewed or practiced exercise recently.

#### Explainability & Reason Tags
Each recommended item is enriched with a `reasonCode` and user-friendly `reasonText`:
- `GOAL_MATCH` ("Matches your strength goal")
- `EQUIPMENT_MATCH` ("Compatible with your dumbbells")
- `DIFFICULTY_MATCH` ("Tailored for intermediate level")
- `RECENT_INTEREST` ("Pick up where you left off")
- `FAVORITE` ("Saved in your favorites")
- `NEW_DISCOVERY` ("Recommended for you")

#### Diversity Guardrail
To avoid muscle-group saturation, the engine applies a diversity cap of at most **3 exercises per primary muscle group** in the top "For You" list before falling back to next highest-scoring movements.

---

### 3. API Surface

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/exercises/personalized` | Returns structured sections: `forYou`, `continueLearning`, `favorites`, `recentlyViewed`, `basedOnGoals`, `basedOnEquipment`, `usedInWorkouts`, `exploreNew`. |
| `GET` | `/api/v1/exercises/preferences` | Gets member discovery preferences (inferred defaults or explicit). |
| `PATCH` | `/api/v1/exercises/preferences` | Updates member preferences (`fitnessGoals`, `equipment`, etc.). |
| `POST` | `/api/v1/exercises/preferences/reset` | Resets preferences to profile defaults. |
| `GET` | `/api/v1/exercises/:id/learning-progress` | Gets member learning progress and status for an exercise. |
| `POST` | `/api/v1/exercises/:id/learning-progress` | Updates learning step, milestone flags, or marks completed. |

---

### 4. Mobile Client Architecture (`apps/mobile`)

#### Two-Tab Member Discovery Experience
- **"For You" Tab**: Personalized Discovery Hub with summary banner, "Edit Goals" bottom sheet modal, Continue Learning card carousel, and horizontal discovery carousels with reason badges.
- **"Explore All" Tab**: Comprehensive catalog with full-text search, category pills, filter modal, and infinite-scrolling exercise feed.

#### Presentation Components
- `ContinueLearningCard`: Displays exercise thumbnail, step counter ("Step X of Y"), progress bar (% mastered), and "Continue" CTA.
- `PersonalizedExerciseSection`: Smooth horizontal carousel with icon badge, title, subtitle, item count, and "See All" button.
- `PersonalizationSettingsModal`: Bottom-sheet modal for managing goals, difficulty, gear, and categories with "Reset Defaults" and "Save Preferences".
- `ExerciseDetailScreen` Mastery Bar: Quick action button ("Mark Mastered") and status indicator updating learning progress.
- `MemberHomeScreen` Discovery Card: Elevated to showcase personalized exercise recommendations and active step learning.

---

### 5. Multi-Tenant IDOR Protection & Security
- All preference and learning progress endpoints enforce strict tenant matching:
  - `organisationId` resolved from caller session/token.
  - Foreign exercises (exercises belonging to another organisation) throw `404 Not Found`.
  - Member learning progress and preferences are isolated strictly to `userId` and `organisationId`.
