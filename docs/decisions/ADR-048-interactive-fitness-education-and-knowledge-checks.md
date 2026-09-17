# ADR-048: Interactive Fitness Education, Knowledge Checks & Assessments

## Status
Accepted

## Context
Across Days 61 to 71, FitBeat established the Visual Exercise Learning platform, structured learning paths, and progress intelligence. However, learning was essentially passive (reading guides, viewing animations, and manually marking lessons as complete).

In serious fitness coaching and injury prevention, verification of comprehension is vital. Members must understand:
- Proper starting alignment and joint stacking cues
- What common biomechanical faults to avoid (e.g., knee valgus, spinal flexion under load)
- Correct movement phase transitions (concentric vs. eccentric breathing and tempo)
- Equipment adjustments and safety protocols

To solve this, Day 72 introduces an **Interactive Fitness Education & Knowledge Check system**, turning the learning workflow into:
$$\text{Watch} \longrightarrow \text{Read} \longrightarrow \text{Practice} \longrightarrow \text{Understand} \longrightarrow \text{Check} \longrightarrow \text{Continue}$$

## Decision

### 1. Additive Multi-Tenant Assessment Schema
We introduced 5 new database models (`KnowledgeCheck`, `KnowledgeQuestion`, `KnowledgeAnswer`, `KnowledgeAttempt`, `KnowledgeResponse`) linked to `LearningPathLesson` and `Exercise`. All tables enforce `tenantId` isolation with relational constraints preventing orphaned questions or leaking data across gyms.

### 2. Comprehensive Question Types
The platform natively supports 6 question formats:
- **Multiple Choice**: Standard single-select biomechanics questions.
- **Multi-Select**: Checklist questions requiring all correct cues to be selected with zero incorrect options.
- **True / False**: Fast true/false questions for myth-busting and quick form safety rules.
- **Image Choice**: Visual posture and alignment comparisons using exercise media snapshots.
- **Ordering**: Sequential ordering of movement phases and execution steps.
- **Matching**: Matching exercise terms, cues, or phases to their physical targets.

### 3. Server-Authoritative Grading & Answer Key Sanitization
- The client player endpoint (`GET /learning/checks/:id/player`) explicitly strips `isCorrect`, `correctOrderIndex`, and `matchTarget` from answers.
- For matching questions, target items are returned as a deduplicated, shuffled list, rendering client-side answer key scraping impossible.
- Every response is graded authoritatively on the server via `POST /learning/attempts/:id/response`.

### 4. Pedagogical Feedback & Targeted Review Recommendations
- When a response is submitted, the server provides immediate pedagogical feedback, correct/incorrect cues, and coaching explanations.
- When an attempt is finalized, if the member has mistakes, the server deterministically generates `reviewRecommendations` linking directly back to relevant exercise movement breakdowns.
- Post-test review (`GET /learning/attempts/:id/review`) provides a full audit trail showing member choices, correct answers, and rationale.

### 5. Mandatory Lesson Gating
- Lessons can designate a knowledge check with `isRequiredForLesson: true`.
- Passing score defaults to 70%. When a member achieves a passing score, the system automatically marks the lesson completed and updates learning path progress.
- If a lesson has an unpassed mandatory knowledge check, manual completion is prevented until the assessment is passed.

### 6. Zero LLM / Workout Decoupling
- Consistent with FitBeat architecture, 100% of questions and grading logic are authored and deterministic; no generative AI is used for grading or question synthesis.
- Assessment scoring never alters physical workout session logs, maintaining clean separation between education and workout logging.

## Consequences

### Positive
- Guarantees members understand critical safety and technique rules before loading heavy weights or attempting complex skills.
- Rich variety of question types keeps educational content engaging.
- Immediate coaching feedback deepens retention and explains the "why" behind every movement rule.
- Targeted exercise review guides members to revisit specific exercise breakdowns when they miss questions.

### Negative / Trade-offs
- Assessment creation requires trainers and curriculum authors to write well-formed questions, answers, and explanations.
- Extra round-trips for question submission and answer verification.
