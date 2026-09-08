# Mobile Wearable Intelligence Client

## Overview
The mobile app features a dedicated **Recovery & Readiness** experience (`WearableIntelligenceScreen.tsx`) integrated within the Member experience under `WearablesHome` and the `MemberNavigator`.

---

## Screen Architecture: `WearableIntelligenceScreen`

### 1. Header & Navigation
- Back button navigation.
- Header title "Recovery & Readiness" with an `AI ENGINE` badge.
- Quick link to Privacy & Transparency (`WearablePrivacyScreen`).

### 2. Recovery Status Card
- Displays qualitative status:
  - **GOOD**: `Favorable Recovery` (Success Badge)
  - **MODERATE**: `Moderate Recovery` (Warning Badge)
  - **LOW**: `Rest Prioritized` (Danger Badge)
  - **INSUFFICIENT_DATA**: `Building Baseline` (Neutral Badge)
- Clear non-medical explanation grounded in rolling baselines.
- Confidence rating badge.

### 3. AI Telemetry Insights & Training Guidance
- Synthesized summary of recent telemetry.
- Actionable training guidance cards:
  - `TRAIN`: Ready to proceed with scheduled training.
  - `REDUCE_INTENSITY`: Guidance to moderate load or volume.
  - `RECOVER`: Recommendation for restorative rest and mobility.
- Member feedback buttons (Helpful / Not Helpful) calling `POST /ai/wearables/feedback`.

### 4. Metric Highlights
- **Sleep Duration**: Last sleep session vs. 7-day rolling average.
- **Resting Heart Rate**: Latest resting heart rate vs. 7-day average.
- **Daily Steps**: Today's steps vs. 7-day average.
- **Workout Frequency**: Weekly logged workout count.

### 5. Training Correlations
- Displays observed patterns between sleep/activity and gym training sessions.
- Injects non-causal disclaimer on every correlation card.

### 6. Non-Medical Disclaimer Banner
- Prominently positioned banner reminding members that wearable telemetry is for fitness tracking only and does not replace medical advice.

---

## Service Layer: `WearableIntelligenceService`

```typescript
// Example usage in mobile screens
const summary = await WearableIntelligenceService.getSummary();
const insight = await WearableIntelligenceService.generateInsight();
await WearableIntelligenceService.submitFeedback({
  insightId: insight.insightId,
  rating: 'HELPFUL',
});
```
