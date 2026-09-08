# AI Wearable Intelligence Architecture

## Overview
The FitCore AI Wearable Intelligence layer synthesizes normalized wearable telemetry (Day 23) with training and member activity data, providing safe, grounded, non-medical recovery and readiness insights.

---

## High-Level Architecture Pipeline

```
Raw Wearable Records (HealthDataRecord)
                   │
                   ▼
┌──────────────────────────────────────────────┐
│       Deterministic Telemetry Engines        │
│  • WearableBaselineService (7d, 14d, 28d)    │
│  • WearableTrendService (>= 3 observation d) │
│  • SleepMetricsService / HeartMetricsService │
│  • ActivityMetricsService                    │
│  • RecoveryMetricsService (Non-clinical)     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│         Training Correlation Engine          │
│  • Correlates workouts with sleep/recovery   │
│  • Non-causal observation framing            │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│           Safety & Privacy Gates             │
│  • Intercept acute cardiac & medical queries │
│  • Sanitize PAR-Q & trainer private notes    │
│  • Validate active WEARABLE_DATA consent     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│            Core AI Orchestrator              │
│  • Prompt: wearable_intelligence.v1          │
│  • Schema: WEARABLE_INTELLIGENCE_OUTPUT      │
│  • Deterministic fallback on model error     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│        WearableInsight Store & Cache         │
│  • PostgreSQL persistence (WearableInsight)  │
│  • Redis TTL cache (30 min)                  │
│  • Member Feedback (Helpful / Not Helpful)   │
└──────────────────────────────────────────────┘
```

---

## Core Components

### 1. Telemetry Aggregation Engines
- `WearableMetricsService`: Aggregates 28-day window into structured DTOs for sleep, activity, heart, and recovery.
- `WearableBaselineService`: Computes rolling averages across 7d, 14d, and 28d windows. Classifies quality as `NORMAL_DATA`, `PARTIAL_DATA`, or `INSUFFICIENT_DATA`.
- `WearableTrendService`: Calculates linear movement across at least 3 observation days. Categorizes direction (`UP`, `DOWN`, `STABLE`) and confidence (`HIGH`, `MEDIUM`, `LOW`).
- `RecoveryMetricsService`: Qualitative classification (`GOOD`, `MODERATE`, `LOW`, `INSUFFICIENT_DATA`) based on resting heart rate delta against 7-day baseline and sleep volume adequacy.

### 2. Training Correlation Engine
- Evaluates observable relationships between workouts and telemetry:
  - Sleep duration vs. scheduled workout consistency.
  - Daily steps vs. completed training frequency.
  - Elevated soreness entries in daily check-ins vs. preceding resistance sessions.
- Injects `TRAINING_CORRELATION_DISCLAIMER` into all output payloads.

### 3. Context Engine & Privacy Boundary
- Implemented in `WearableIntelligenceContextService`.
- Context bounded strictly to authorized slices: `MEMBER_PROFILE`, `TRAINING`, `WEARABLE_HEALTH_DATA`.
- Strictly excludes sensitive medical documents, clinical notes, and financial data.

### 4. Safety Gateway
- Implemented in `WearableIntelligenceSafetyService`.
- Rejects clinical diagnostic inquiries without invoking generative LLMs.
- Immediate safe emergency redirection for acute cardiac symptoms or medication requests.

---

## API Surface

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/ai/wearables/summary` | Deterministic telemetry summary | Member |
| `GET` | `/api/v1/ai/wearables/recovery` | Qualitative recovery readiness | Member |
| `GET` | `/api/v1/ai/wearables/trends` | Multi-day rolling metric trends | Member |
| `GET` | `/api/v1/ai/wearables/sleep` | Aggregated sleep metrics | Member |
| `GET` | `/api/v1/ai/wearables/activity` | Daily activity & step metrics | Member |
| `GET` | `/api/v1/ai/wearables/training-correlation` | Workout & telemetry correlations | Member |
| `POST` | `/api/v1/ai/wearables/insight` | AI synthesized recovery insight | Member |
| `GET` | `/api/v1/ai/wearables/insights` | Historical insight audit trail | Member |
| `POST` | `/api/v1/ai/wearables/feedback` | Member insight feedback | Member |
| `GET` | `/api/v1/ai/wearables/privacy` | Privacy & data ownership breakdown | Member |
| `GET` | `/api/v1/ai/wearables/trainer/client/:memberId` | Scoped client activity summary | Assigned Trainer |
