# ADR 017: AI Wearable Intelligence: Recovery, Readiness, Training Correlation & Personalized Insights

## Status
Accepted (Day 24)

## Context
On Day 24, FitCore establishes the **AI Wearable Intelligence layer**, bridging raw wearable telemetry (Day 23: Apple Health, Google Health Connect, Fitbit) and the core AI platform (Days 19–22: Model Gateway, AI Orchestrator, AI Safety, AI Fitness/Nutrition/Daily Check-In Coaches).

### Architectural Challenges & Drivers
1. **Deterministic Data Processing First, Generative AI Second**: Raw wearable sensor streams (e.g. hundreds of minute-by-minute heart rate pings) must NEVER be directly dumped into a Large Language Model. Telemetry must be aggregated, normalized, baseline-compared, and trend-evaluated deterministically in TypeScript before any AI synthesis occurs.
2. **Strict Non-Medical Boundary**: Wearable metrics are non-clinical lifestyle data. The AI engine must NEVER diagnose medical conditions (e.g. atrial fibrillation, arrhythmia, illness, sleep apnea), prescribe medications, recommend pharmaceutical dosages, or make clinical evaluations.
3. **Rolling Baselines & Trend Stability**: Fitness and recovery observations are meaningful only when evaluated against member-specific baselines (7-day, 14-day, 28-day). Single-day anomalies should not trigger panic or exaggerated claims.
4. **Non-Causal Training Correlation Framing**: Wearable sleep and activity must be correlated with logged workouts and subjective check-ins using strictly observable, non-causal language (e.g., "appeared related" vs "caused").
5. **No Autonomous State Mutations**: AI wearable insights must never autonomously modify workouts, sets, reps, training plans, nutrition targets, or class bookings. Guidance must be advisory and encourage discussion with assigned personal trainers.
6. **Privacy & Sensitive Data Sanitization**: Medical screening data (PAR-Q), clinical records, billing details, and private trainer notes must be strictly excluded from the wearable intelligence LLM context.
7. **Scoped Trainer Access**: Only actively assigned personal trainers (`TrainerClientAssignment`) may view high-level client wearable telemetry. Unassigned staff are denied access with `403 Forbidden`.

---

## Decision

### 1. Deterministic Metrics & Baseline Engines
- **Metrics Services**:
  - `SleepMetricsService`: Aggregates sleep duration, bedtimes, efficiency, and consistency scores.
  - `ActivityMetricsService`: Aggregates daily steps, active energy, distance, and workout frequency.
  - `HeartMetricsService`: Computes resting heart rate and HRV availability with physiological clamping.
  - `RecoveryMetricsService`: Computes qualitative recovery categories (`LOW`, `MODERATE`, `GOOD`, `INSUFFICIENT_DATA`) based on baseline deviations.
  - `WearableMetricsService`: Unified aggregation facade.
- **Baseline Engine (`WearableBaselineService`)**:
  - Computes rolling 7-day, 14-day, and 28-day deterministic baselines.
  - Classifies data quality (`NORMAL_DATA` >= 14d, `PARTIAL_DATA` >= 7d, `INSUFFICIENT_DATA` >= 3d, `NO_DATA` < 3d).
- **Trend Engine (`WearableTrendService`)**:
  - Detects trend directions (`UP`, `DOWN`, `STABLE`, `UNKNOWN`) and strengths (`SLIGHT`, `MODERATE`, `STRONG`).
  - Requires at least 3 distinct observation days before declaring a trend.

### 2. Training Correlation Engine (`TrainingCorrelationService`)
- Evaluates observable relationships between wearable telemetry and training data:
  1. Sleep volume vs. workout consistency.
  2. Daily movement steps vs. strength training sessions.
  3. Subjective check-in soreness vs. preceding training volume.
- Every correlation insight includes the mandatory `TRAINING_CORRELATION_DISCLAIMER` and strictly avoids causal terms like "caused" or "proven".

### 3. Multi-Tier Safety Gateway (`WearableIntelligenceSafetyService`)
- Evaluates queries for acute medical symptoms, cardiac inquiries, and medication advice prior to invoking any model.
- Intercepts acute chest pain, cardiac diagnoses ("afib", "arrhythmia"), and prescription queries.
- When unsafe queries are detected, analysis is halted immediately and an emergency redirection message is returned without calling the LLM.
- Records audit records in `AIAuditEvent` (`AI_REQUEST_BLOCKED`) with user-level foreign key integrity.

### 4. Controlled Context & Sanitization (`WearableIntelligenceContextService`)
- Constructs a tightly bounded, non-medical context object.
- Gathers only authorized domain slices: `MEMBER_PROFILE`, `TRAINING`, and `WEARABLE_HEALTH_DATA`.
- Explicitly strips PAR-Q questionnaires, medical notes, payment details, and private staff notes.

### 5. AI Prompt & Structured Output Schema
- **Prompt**: Registered in `PromptRegistryService` as `wearable_intelligence.v1`.
- **Output Schema (`WEARABLE_INTELLIGENCE_OUTPUT_SCHEMA`)**:
  - `summary`: Non-clinical telemetry synthesis.
  - `dataHighlights`: Key metric comparisons against baseline.
  - `recoveryInterpretation`: Qualitative recovery classification and explanation.
  - `trainingGuidance`: Actionable suggestions (`TRAIN`, `REDUCE_INTENSITY`, `RECOVER`, `ACTIVE_RECOVERY`).
  - `caution`: Mandatory non-medical disclaimer.
  - `escalation`: Flag and guidance if clinical symptoms are detected.
  - `confidence`: Confidence rating (`LOW`, `MEDIUM`, `HIGH`).

### 6. Persistence, Caching & Feedback (`WearableInsight` Model)
- Stores generated insights in PostgreSQL via Prisma model `WearableInsight`.
- Supports request deduplication via `idempotencyKey`.
- Supports Redis caching (30-minute TTL) for summary and metric queries.
- Captures member feedback (`HELPFUL` / `NOT_HELPFUL`, category, comments) for model observability.

### 7. Scoped Trainer Visibility & Privacy
- `getTrainerClientSummary`: Guarded by `TrainerClientAssignment` check. Unassigned trainers or cross-org access attempts receive `403 Forbidden`.
- `getPrivacyView`: Provides member transparency into consent status, connected platforms, accessible metrics, and data retention policies.

---

## Consequences

### Positive
- **Safety First**: Guarantees zero clinical liability by halting medical inquiries deterministically and enforcing non-medical framing.
- **Reliability & Grounding**: LLMs only see verified statistical aggregates and baselines, eliminating hallucinated biometric readings.
- **Privacy & Consent Compliance**: Wearable telemetry is strictly gated by member consent (`WEARABLE_DATA`) and tenant isolation.
- **Personalization**: Members and assigned trainers gain transparent, actionable recovery intelligence correlated with their actual gym workouts.

### Negative / Trade-Offs
- **Qualitative Recovery Only**: Does not attempt to match proprietary 0–100 strain/recovery scores (e.g. WHOOP recovery or Oura readiness), maintaining non-medical classification instead.
- **Observation Latency**: Requires at least 3–7 days of historical records before full trends and baselines can be computed.
