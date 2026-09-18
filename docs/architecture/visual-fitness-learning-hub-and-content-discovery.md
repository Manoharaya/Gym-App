# Visual Fitness Learning Hub, Content Discovery & Unified Education Home

## 1. System Overview

Day 80 delivers the **FitBeat Visual Fitness Learning Hub & Content Discovery Layer**, uniting Days 61–79 educational and exercise systems into a cohesive, personalized learning portal.

Prior to Day 80, members interacted with fragmented educational features across multiple screens:
- Standalone Exercise Library & Discovery (Days 61–69)
- Movement Phases & Step-by-Step Breakdown (Days 62–64)
- Curated Exercise Collections & Guided Learning Paths (Days 70–71)
- Interactive Fitness Academy & Comprehensive Glossary (Days 72–73)
- Visual Anatomy & "Why This Exercise Works" Biomechanics (Day 74)
- Interactive Exercise Tutorials & Rehearsal Checklists (Day 75)
- Guided Practice Sessions & Rest/Transition Timers (Day 76)
- Multi-Angle Visual Demonstrations & Technique Comparison (Day 77)
- Adaptive Learning Personalization & Tutorial Modes (Day 78)
- Learning Analytics, Funnel Telemetry & Mastery Intelligence (Day 79)

The **FitBeat Learning Hub** acts as an **orchestration, aggregation, and presentation layer** over these underlying systems. It provides a single educational home where members discover movements, resume ongoing study with 1-tap deterministic action pointers, explore taxonomies, practice guided sessions, and reinforce technique through a targeted review queue.

```
       ┌────────────────────────────────────────────────────────┐
       │             FitBeat Learning Hub Screen                │
       │  (Header, Preferences, Search Bar, Section Filters)    │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                 LearningHubService                     │
       │           Consolidated Read Model Pipeline             │
       └─┬──────────────┬──────────────┬──────────────┬─────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
   │ Continue  │  │Recommend- │  │  Explore  │  │  Guided   │
   │ Pipeline  │  │ed Engine  │  │ Taxonomy  │  │ Learning  │
   │ (Paths,   │  │ (Rules &  │  │(Movements,│  │  (Paths,  │
   │Tutorials, │  │ Reasons)  │  │ Muscles,  │  │Sessions,  │
   │ Sessions) │  │           │  │ Equipment)│  │Collections│
   └───────────┘  └───────────┘  └───────────┘  └───────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
   │  Academy  │  │  Review   │  │ Featured  │  │ Unified   │
   │  Tracks & │  │   Queue   │  │ Exercises │  │  Search   │
   │ Glossary  │  │ (Mastery  │  │(Mastery   │  │  Engine   │
   │ Overview  │  │  < 70%)   │  │  Badges)  │  │(Cross-Cat)│
   └───────────┘  └───────────┘  └───────────┘  └───────────┘
```

---

## 2. Architectural Principles & Boundaries

1. **Pure Orchestration & Aggregation**:
   The Learning Hub does not duplicate database entities. It queries existing tables (`LearningPath`, `ExerciseCollection`, `GuidedSession`, `Exercise`, `Curriculum`, `GlossaryTerm`, `ExerciseLearningProgress`, `UserGuidedSessionProgress`, `LearningMastery`) and composes them into a single-request read model.
2. **Zero Synthetic / Hallucinated Scores**:
   All metrics (streaks, minutes, mastery badges, funnel stages) derive 100% deterministically from logged user activity and stored progress.
3. **Transparent Recommendation Reasons**:
   Recommendations always expose clear, human-understandable reason strings (e.g. `DIFFICULTY_MATCH`, `GOAL_MATCH`, `RECENT_INTEREST`, `POPULAR_IN_GYM`).
4. **Physical Workout Isolation**:
   Educational rehearsals, tutorials, and guided practice sessions never pollute physical workout tables (`Workout`, `WorkoutExercise`).
5. **Non-Diagnostic Educational Boundary**:
   FitBeat provides movement education, biomechanical principles, and structured rehearsal checklists. It strictly disclaims computer vision form scoring, pose estimation, and medical/orthopedic diagnosis.
6. **Multi-Tenant Isolation & Content Governance**:
   Organizations with custom exercises, curricula, or sessions maintain complete isolation. Content belonging to Tenant B is never surfaced to Tenant A. Only `PUBLISHED` content is accessible to members.

---

## 3. Data Model & API Contracts

### Endpoints

- `GET /learning/hub`: Returns the consolidated 8-section Learning Hub response payload.
- `GET /learning/hub/search?q={query}&limit={limit}`: Executes cross-categorical unified search.

### Response Payload Structure (`LearningHubResponseDto`)

```typescript
export interface LearningHubResponseDto {
  continueLearning: ContinueLearningHubItemDto[];
  recommendedLearning: RecommendedLearningHubItemDto[];
  explore: LearningHubExploreSectionDto;
  guidedLearning: LearningHubGuidedSectionDto;
  academy: LearningHubAcademySectionDto;
  reviewQueue: HubReviewItemDto[];
  myLearningSummary: HubMyLearningSummaryDto;
  featuredExercises: HubFeaturedExerciseDto[];
}
```

### Unified Search Result (`LearningHubSearchResponseDto`)

```typescript
export interface LearningHubSearchResponseDto {
  query: string;
  totalCount: number;
  exercises: UnifiedSearchResultItemDto[];
  movementPatterns: MovementSearchResultItemDto[];
  muscles: MuscleSearchResultItemDto[];
  equipment: EquipmentSearchResultItemDto[];
  learningPaths: UnifiedSearchResultItemDto[];
  collections: UnifiedSearchResultItemDto[];
  curricula: UnifiedSearchResultItemDto[];
  tutorials: UnifiedSearchResultItemDto[];
}
```

---

## 4. Mobile Component Hierarchy

The mobile client architecture resides in `apps/mobile/src/features/exercises/`:

```
LearningHomeScreen
├── Header (Personalization settings trigger, Navigation progress)
├── LearningHubSearchBar (Debounce search, instant categorized results modal)
├── SectionFilterPills (All, Continue, Explore, Guided, Academy, Review)
├── TargetedReviewQueue (Red/amber review cards with direct rehearsal action)
├── ContinueLearningSection (Horizontal carousel of active items with resume pointers)
├── RecommendedLearningSection (RecommendedLearningCard with reason banners)
├── LearningHubExploreGrid (Movements, Muscles, Equipment, Categories)
├── FeaturedExercisesSection (Visual cards with ContentMasteryBadge)
├── StructuredGuidedSection (Paths, Collections, Guided Sessions)
├── FitnessAcademyHero (Curricula tracks & Glossary preview)
├── MyLearningSummaryCard (Streak, learning hours, exercises mastered)
└── PersonalizeLearningModal (Personalized depth, mode, angle overrides)
```

---

## 5. Verification & Quality Gates

- **Backend E2E Suite**: `test/learning-hub.e2e-spec.ts` (10/10 tests passing).
- **Regression E2E Suites**:
  - `test/exercise-learning-analytics-mastery.e2e-spec.ts` (Day 79: 13/13 passing)
  - `test/exercise-learning-personalization.e2e-spec.ts` (Day 78: 10/10 passing)
- **Backend Compilation**: `npm run build` (`nest build`) passes cleanly with 0 errors.
- **Mobile TypeScript Validation**: `src/features/exercises/` passes with 0 TypeScript errors.
