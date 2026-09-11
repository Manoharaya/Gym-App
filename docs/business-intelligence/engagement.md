# Engagement Intelligence Domain

## Overview
The **Engagement Intelligence** domain tracks member digital interaction, workout logging frequency, community challenge participation, and biometric wearable synchronizations.

---

## Member Engagement Score (0–100)

FitCore computes a dynamic rolling engagement score for every active member based on multi-factor behavioral signals:

$$\text{Score} = w_1 \cdot \text{Facility Visits} + w_2 \cdot \text{Workouts Logged} + w_3 \cdot \text{Habit Check-Ins} + w_4 \cdot \text{Wearable Telemetry}$$

### Tier Distribution:
* **High Engagement ($\ge 75$)**: Highly active advocates; minimal immediate churn probability.
* **Moderate Engagement ($50 - 74$)**: Steady gym-goers maintaining baseline habits.
* **Low Engagement ($25 - 49$)**: Slipping engagement; candidates for automated check-in reminders.
* **Disengaged ($< 25$)**: Severe churn risk; flagged for trainer or front-desk intervention.

---

## Key Engagement Telemetry Metrics

1. **Workouts Logged**: Total individual exercise sessions recorded via the FitCore mobile app.
2. **Habit & Nutrition Check-Ins**: Daily accountability check-in completions (e.g. hydration, protein targets, sleep).
3. **Challenge Participation**: Total active members enrolled in monthly club challenges.
4. **Wearable Synced Members**: Members synchronizing telemetry (Apple Health, Google Health Connect, Garmin, Whoop).
