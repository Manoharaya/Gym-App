# AI Wearable Intelligence REST API Reference

Base Path: `/api/v1/ai/wearables`  
Security: Bearer JWT Token (`Authorization: Bearer <token>`)

---

## Endpoints

### 1. `GET /ai/wearables/summary`
Returns comprehensive aggregated telemetry including sleep, activity, heart, recovery, trends, and correlations.
- **Query Params**:
  - `refresh` (optional boolean): Force refresh cached summary.
- **Response**: `200 OK` (`WearableIntelligenceSummaryDto`)

### 2. `GET /ai/wearables/recovery`
Returns qualitative recovery readiness assessment and baseline comparisons.
- **Response**: `200 OK` (`RecoverySummaryDto`)

### 3. `GET /ai/wearables/trends`
Returns detected rolling trends (direction, strength, confidence).
- **Response**: `200 OK` (`WearableTrendDto[]`)

### 4. `GET /ai/wearables/sleep`
Returns sleep metrics including duration, consistency, and 7-day/14-day averages.
- **Response**: `200 OK` (`SleepMetricsDto`)

### 5. `GET /ai/wearables/activity`
Returns step counts, active calories, distance, and weekly workout frequency.
- **Response**: `200 OK` (`ActivityMetricsDto`)

### 6. `GET /ai/wearables/training-correlation`
Returns non-causal correlations between workouts and recovery metrics.
- **Response**: `200 OK` (`TrainingCorrelationDto[]`)

### 7. `POST /ai/wearables/insight`
Generates grounded, safe AI recovery guidance and insights.
- **Headers**:
  - `idempotency-key` (optional string): Request deduplication key.
- **Body**: `WearableInsightQueryDto`
- **Response**: `200 OK` (`{ insight: WearableIntelligenceResponseDto; insightId?: string; cached: boolean }`)

### 8. `GET /ai/wearables/insights`
Retrieves past generated wearable insights.
- **Query Params**:
  - `limit` (optional number, default 10).
- **Response**: `200 OK` (`WearableInsight[]`)

### 9. `POST /ai/wearables/feedback`
Submits member feedback (Helpful / Not Helpful) on an insight.
- **Body**: `WearableInsightFeedbackDto`
- **Response**: `200 OK` (`{ success: boolean; message: string }`)

### 10. `GET /ai/wearables/privacy`
Returns transparency breakdown of active consent, connected providers, and trainer boundaries.
- **Response**: `200 OK` (`WearablePrivacyViewDto`)

### 11. `GET /ai/wearables/trainer/client/:memberId`
Scoped trainer summary of client wearable telemetry.
- **Auth**: Requires `TRAINER` role and active `TrainerClientAssignment`.
- **Response**: `200 OK` (`WearableTrainerClientSummaryDto`)
