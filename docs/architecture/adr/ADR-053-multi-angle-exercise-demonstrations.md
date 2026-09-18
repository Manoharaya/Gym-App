# ADR-053: Multi-Angle Exercise Demonstrations, Visual Technique Comparison & Advanced Media Presentation

## Status
Accepted

## Date
2026-09-18

## Context
FitBeat Days 61–76 established comprehensive exercise educational systems, culminating in single-exercise interactive tutorials (Day 75) and multi-exercise guided sessions (Day 76). However, exercise demonstrations were restricted to a single primary visual perspective.

In biomechanical coaching, observing movement from a single fixed angle obscures critical technique checkpoints:
1. **Planar Blind Spots**: Front angles reveal knee tracking and lateral pelvic tilt but conceal spinal flexion, hip hinge depth, and bar path. Side angles reveal lumbar neutrality and depth but conceal valgus/varus knee deviations and asymmetric weight distribution.
2. **Phase-Specific Demonstration Angles**: Certain movement phases (such as the turnaround point in a squat or lockout in an overhead press) require close-up or orthogonal viewpoints to properly observe joint alignment.
3. **Common Mistake Visualization**: Members learn more effectively when able to compare correct technique directly against common movement deviations with clear, non-judgmental biomechanical cues.

Key constraints & requirements:
- **No AI Computer Vision or Automatic Scoring**: All visual comparisons, angles, and cue overlays are authored educational content created by certified trainers.
- **Strict Workout Separation**: Viewing angles or interacting with compare mode never creates workout logs.
- **Backward Compatibility**: Legacy media records without `viewAngle` metadata must continue to function through deterministic fallback.
- **Cross-Device Coordinate Responsiveness**: Visual annotations must scale consistently across various screen resolutions and aspect ratios.

## Decisions

### 1. Unified Media Schema Extension (Avoid Duplicate Tables)
- Rather than creating a separate "AngleMedia" table, we extended the existing `ExerciseMedia` Prisma model with `viewAngle` (`FRONT`, `BACK`, `LEFT`, `RIGHT`, `SIDE`, `THREE_QUARTER`, `OVERHEAD`, `CLOSE_UP`, `CUSTOM`) and `phaseId` (foreign key to `ExerciseMovementPhase`).
- This preserves existing storage, signing, CDN caching, and thumbnailing infrastructure while unlocking multi-angle querying and phase linking.

### 2. Normalized Coordinate Representation ($0.0 \le x, y, width, height \le 1.0$)
- Created `ExerciseMediaAnnotation` storing coordinates as normalized floats between $0.0$ and $1.0$.
- Validation rules strictly reject coordinate values $< 0.0$ or $> 1.0$, and ensure $startTime \le endTime$.
- The mobile rendering layer scales coordinates responsively to pixel dimensions based on the measured canvas layout.

### 3. Deterministic Angle Fallback Hierarchy
- When an exercise does not specify a default angle or contains legacy media, the system resolves the active angle deterministically:
  1. Configured primary media angle (`primaryMedia.viewAngle`)
  2. `'SIDE'` view if available
  3. `'FRONT'` view if available
  4. First available angle in `availableAngles`
  5. Default illustrated guide fallback

### 4. Synchronized Compare Mode
- In mobile `ExerciseAngleViewer`, compare mode displays primary and secondary views (stacked vertically for mobile ergonomics).
- A unified playback state synchronizes timestamp scrubbing, play/pause, and playback speed across both media frames simultaneously.

### 5. Multi-Tenant Authorization & Integrity
- Authored annotations enforce tenant ownership. Trainers can only annotate exercises belonging to their organization. SYSTEM exercises can only be annotated by system administrators.

## Consequences

### Positive
- Delivers a state-of-the-art 360° visual learning studio for strength exercises.
- Eliminates planar blind spots by allowing simultaneous Front and Side biomechanical observation.
- Authored visual cues provide contextual attention markers during playback without relying on unreliable or intrusive webcam computer vision.
- Zero impact on physical workout tracking integrity.

### Negative / Trade-offs
- Playing multiple videos in Compare Mode simultaneously increases network bandwidth and mobile decoding requirements (mitigated by pause-on-background and optimized bitrate).
- Authoring high-quality multi-angle assets and annotations requires deliberate coach effort.
