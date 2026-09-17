# ADR-050: Visual Anatomy, Muscle Education, Movement Mechanics & "Why This Exercise Works"

## Status
Accepted

## Context
Through Days 61–73, FitBeat established comprehensive exercise discovery, step-by-step instructions, movement players, learning paths, knowledge checks, and the Fitness Academy curriculum. However, members frequently ask:
- *"What is actually happening inside my body during this movement?"*
- *"Which muscles are doing the heavy lifting versus stabilizing my joints?"*
- *"Why does this exercise work, and what joints and planes of motion are engaged?"*
- *"What should I feel at each phase of the movement (setup, eccentric, transition, concentric, lockout)?"*

Existing fitness apps often suffer from two extremes: either superficial bullet points with no biomechanical depth, or pseudo-scientific visual gimmicks (such as ungrounded, AI-generated "EMG activation percentages" like "87% glute activation"). Furthermore, visual anatomy tools often fail accessibility guidelines by conveying muscle involvement solely through color tinting without text descriptors, screen-reader parity, or high-contrast tactile lists.

To provide an elite, educational, evidence-conscious experience, Day 74 implements **Visual Anatomy, Muscle Education, Movement Mechanics & "Why This Exercise Works"**.

## Decision

### 1. Tri-Level Functional Muscle Classification (Primary, Secondary, Stabilizer)
- We standardize muscle involvement into three functional biomechanical roles:
  - `PRIMARY` (Agonist / Prime Mover): Initiates and drives the primary joint action and torque.
  - `SECONDARY` (Synergist / Assistant): Assists the prime mover throughout the movement arc.
  - `STABILIZER` (Fixator / Isometric Support): Fires isometrically to maintain joint alignment, pelvic neutral, or spinal stability.
- Strictly prohibited: Artificial EMG percentage meters (e.g., "78% Hamstring activation") that lack validated biomechanical telemetry. Every muscle involvement entry provides explicit functional role text and qualitative involvement intensity (`HIGH`, `MEDIUM`, `LOW`).

### 2. Standardized 10-Pattern Movement Taxonomy
- We define a foundational movement pattern taxonomy grounded in human kinesiology:
  1. `SQUAT`: Knee-dominant bilateral or unilateral lower-body displacement.
  2. `HINGE`: Posterior-chain hip-dominant flexion/extension with minimal knee flexion.
  3. `PUSH`: Upper-body pressing away from center (horizontal or vertical).
  4. `PULL`: Upper-body pulling toward center (horizontal or vertical).
  5. `LUNGE`: Asymmetrical split-stance single-leg dominant movement.
  6. `ROTATION`: Transverse plane rotation or anti-rotation resisting torque.
  7. `CARRY`: Loaded locomotion demanding total-body core stiffness and grip.
  8. `LOCOMOTION`: Cyclical aerobic or ballistic locomotion (running, rowing, sprinting).
  9. `STABILIZATION`: Isometric resistance against extension, flexion, or lateral tilt.
  10. `ISOMETRIC`: Static muscle contraction under tension without joint displacement.
- Each movement pattern is backed by an educational catalog endpoint (`GET /movements` and `GET /movements/:pattern`) detailing plane of motion, primary joint actions, stabilization demands, and associated exercises.

### 3. Granular Movement Mechanics & Phase Synchronization
- Each exercise's movement arc is broken down into structured phases:
  - `SETUP`: Ground contact, stance width, grip, spinal neutral, intra-abdominal pressure.
  - `ECCENTRIC`: Lengthening under control, tempo cadence, stretch-shortening cycle priming.
  - `BOTTOM_TRANSITION`: Pause/reversal point, maintaining tension, eliminating momentum.
  - `CONCENTRIC`: Concentric contraction, force production, rate of force development.
  - `LOCKOUT_FINISH`: Joint lockout without hyperextension, breath release, reset.
- Movement mechanics are paired with **tempo timing** (e.g., "3-1-1-0": 3s down, 1s pause, 1s explosive up, 0s pause) and synchronized **breathing cadence** (e.g., diaphragmatic inhale on eccentric, forceful exhale past sticking point).

### 4. Deterministic "Why This Exercise Works" Synthesis & Non-Diagnostic Disclaimer
- Exercises provide a comprehensive educational synthesis covering:
  - Biomechanical overview and mechanical advantage.
  - Primary force drivers and muscular torque generation.
  - Active joint actions and degrees of freedom.
  - Stabilization focus and core integration.
  - Tangible physical and athletic benefits.
  - Non-diagnostic educational disclaimer:
    > *"Educational guidance only. Consult a qualified fitness professional or healthcare provider for personalized training advice or if experiencing pain or discomfort."*
- Gym trainers and admins (`TRAINER`, `ADMIN`, `SUPERADMIN`) can author custom "Why It Works" insights via `PATCH /exercises/:id/why-it-works`. In the absence of custom text, the system deterministically compiles evidence-conscious biomechanical explanations from verified movement taxonomy and muscle relations.

### 5. Accessible Visual Body Map (WCAG 2.1 AA Compliant)
- The mobile `BodyMapVisualizer` renders both anterior and posterior anatomical views with distinct visual role highlights:
  - Primary movers: Solid accent badge / highlight border.
  - Synergists: Cyan badge / secondary highlight.
  - Stabilizers: Violet badge / dashed stabilizer highlight.
- An accessible toggle mode switches immediately from visual rendering to a structured, high-contrast, screen-reader-friendly text breakdown organized by functional role.

### 6. Bidirectional Cross-Exploration Screens
- Members and trainers can navigate seamlessly between:
  - `ExerciseDetailScreen` $\longleftrightarrow$ `MuscleDetailScreen` (`/muscles/:code`)
  - `ExerciseDetailScreen` $\longleftrightarrow$ `MovementPatternDetailScreen` (`/movements/:pattern`)
  - Muscle & Movement profiles cross-link to relevant Academy lessons and interactive Knowledge Checks.

### 7. Additive Database Migration
- Database changes are strictly additive:
  - `whyItWorks Json?` on `Exercise`
  - `phaseMuscles Json?` on `ExerciseMovementPhase`
- No destructive drops, column renames, or existing table resets. Backward compatibility is 100% preserved.

## Consequences

### Positive
- Deepens member comprehension from mechanical mimicry ("do this") to physiological understanding ("why my body moves this way").
- Eliminates pseudoscience and deceptive percentages while providing evidence-based muscle mechanics.
- Fosters cross-domain discovery: members searching for "Hamstrings" can discover hinges, squats, and associated Academy lessons.
- Ensures WCAG 2.1 AA compliance with dual visual/list rendering and high-contrast badges.
- Retains robust multi-tenant security with actor-scoped RBAC and IDOR protection.

### Negative / Trade-offs
- Detailed movement phases and custom "Why It Works" notes require thoughtful authoring for niche or novel exercises.
- Requires maintenance of the foundational kinesiology knowledge base when new specialized equipment or movement variants are added.
