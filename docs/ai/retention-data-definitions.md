# Canonical Retention Data Definitions (FitCore AI Retention Agent)

## 1. Architectural Directive

The FitCore AI Retention Agent adheres to an explicit, non-negotiable architectural data pipeline:

```text
OBSERVED DATA → DERIVED METRIC → TREND → RISK SIGNAL → AI INTERPRETATION → RECOMMENDATION
```

### Core Operating Rules
1. **AI Is Never The Source of Truth**: The AI Retention Agent must never invent, reinterpret, extrapolate, or ambiguously define retention signals.
2. **Deterministic Pre-Computation**: All numbers, trends, differences, and thresholds are computed deterministically by backend services prior to AI invocation.
3. **Strict Privacy Boundaries**: Raw health vitals (HRV, resting heart rate, sleep scores, calories burned) and clinical/nutritional intake (calories, macronutrients, medical diagnoses, PAR-Q answers) are **PROHIBITED** from retention risk scoring.
4. **Non-Causal Attribution**: All member actions following an intervention are recorded as **observed re-engagement following outreach**, never as *caused by outreach*.

---

## 2. Source-of-Truth Domain Mapping

| Source Domain | Responsible Service | Responsibility |
|---|---|---|
| **Access Control** | `AttendanceService` | Turnstile badge swipes, QR check-ins, physical attendance |
| **Bookings & Sessions** | `BookingService` | Class reservations, waitlist promotions, cancellations, no-shows |
| **Workout Tracking** | `WorkoutService` | Prescribed workouts, logged sessions, adherence percentages |
| **Membership & Billing** | `MembershipService` | Membership status, tiers, terms, renewal state, expiration windows |
| **Identity & App Engagement**| `EngagementService` | App logins, session activity, UI actions |
| **Daily Check-Ins** | `DailyCheckInService` | Check-in participation rate (strictly non-clinical participation) |
| **Nutrition Tracking** | `NutritionService` | Meal log event frequency (engagement only, zero calories/macros) |
| **Wearable Integration** | `WearableService` | Device connection status and sync frequency (zero raw vitals) |
| **Goal Tracking** | `ProgressService` | Active training goals, milestone updates |
| **Communications** | `CommunicationService` | Outreach history, delivery receipts, contact frequency, cooldowns |

---

## 3. Metric Definitions Dictionary

---

### 1. `lastActivityAt`
* **Definition**: The most recent qualifying member physical or digital interaction timestamp.
* **Source**: `AttendanceService`, `WorkoutService`, `BookingService`, `DailyCheckInService`, `EngagementService`
* **Calculation**: `MAX(checkIn.checkedInAt, attendance.checkedInAt, workout.completedAt, booking.bookedAt, dailyCheckIn.createdAt, session.createdAt)`
* **Observation Window**: Lifetime (trailing scan)
* **Baseline**: N/A
* **Allowed Values**: ISO 8601 UTC Timestamp (`string`) or `null`
* **Data-Quality Requirements**: Excludes automated system updates, batch sweeps, or staff administrative edits.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `"2026-09-02T08:30:00.000Z"` (GYM_CHECK_IN)

---

### 2. `inactivityDays`
* **Definition**: Number of full calendar days since the member's most recent qualifying activity, calculated in the member's local outlet timezone.
* **Source**: `RetentionMetricsEngineService`
* **Calculation**: `currentLocalDate - lastActivityLocalDate` (using `Intl.DateTimeFormat` with outlet timezone).
* **Observation Window**: Current moment vs `lastActivityAt`
* **Baseline**: N/A
* **Allowed Values**: Non-negative integer (`0, 1, 2, ...`) or `null` if no qualifying activity exists.
* **Data-Quality Requirements**: When `null`, classified as `NO_ACTIVITY_DATA`. New members are never automatically classified as inactive.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `12` (Member last checked in 12 calendar days ago in Australia/Perth timezone)

---

### 3. `attendanceFrequency`
* **Definition**: Total count of attended physical visits (turnstile check-ins, group classes, PT sessions) during a defined observation window.
* **Source**: `AttendanceService`
* **Calculation**: `COUNT(checkIns WHERE status = 'GRANTED') + COUNT(attendance WHERE status = 'CHECKED_IN')` within `[windowStart, windowEnd]`
* **Observation Window**: Explicitly configured: `7D`, `14D`, `30D`, `60D`, `90D` (Default: `30D`)
* **Baseline**: Evaluated against member's personal historical baseline window
* **Allowed Values**: Integer $\ge 0$
* **Data-Quality Requirements**: Physical check-ins on the same day can be deduplicated or counted per distinct facility session.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `4` (4 visits in the last 30 days)

---

### 4. `attendanceBaseline`
* **Definition**: Member-specific historical attendance frequency over an equivalent prior comparison period.
* **Source**: `AttendanceService`
* **Calculation**: `COUNT(qualifyingVisits)` within `[baselineStart, baselineEnd]`, where `baselineDays = windowDays` and `baselineEnd = windowStart`.
* **Observation Window**: Prior equivalent window (e.g., prior 30 days)
* **Baseline**: Personal historical attendance (never organization or cohort average).
* **Allowed Values**: Integer $\ge 0$ or `INSUFFICIENT_DATA` if member tenure $< 14$ days.
* **Data-Quality Requirements**: Requires member tenure $\ge$ observation window length to establish full baseline.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `10` (Member attended 10 times in the prior 30-day baseline period)

---

### 5. `attendanceTrend`
* **Definition**: Categorical trajectory of physical attendance comparing current window to personal baseline.
* **Source**: `RetentionMetricsEngineService`
* **Calculation**:
  - `IMPROVING`: `current - baseline >= 1` AND `pctDiff >= +15%`
  - `DECLINING`: `current - baseline <= -1` AND `pctDiff <= -20%`
  - `STABLE`: Within $(-20\%, +15\%)$
  - `INSUFFICIENT_DATA`: Zero visits across both windows or tenure $< 14$ days.
* **Observation Window**: `30D` current vs `30D` prior baseline
* **Baseline**: Prior equivalent window
* **Allowed Values**: `'IMPROVING'`, `'STABLE'`, `'DECLINING'`, `'INSUFFICIENT_DATA'`
* **Data-Quality Requirements**: Never classified as `DECLINING` from one single missed visit.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `'DECLINING'` (Current: 2 visits, Baseline: 8 visits, Diff: -6 visits / -75%)

---

### 6. `workoutAdherence`
* **Definition**: Relationship between scheduled workouts and completed workouts within the observation window.
* **Source**: `WorkoutService`
* **Calculation**: `(completedScheduledWorkouts / eligibleScheduledWorkouts) * 100`. Excludes workouts cancelled by trainer/gym and workouts scheduled in the future.
* **Observation Window**: `30D`
* **Baseline**: Prior 30-day adherence
* **Allowed Values**: Float $0.0 - 100.0$ (%) or `100.0` with `INSUFFICIENT_DATA` if 0 workouts scheduled.
* **Data-Quality Requirements**: Overdue workouts past their scheduled date are counted as non-completed.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `42.8%` (3 completed out of 7 eligible scheduled workouts)

---

### 7. `workoutAdherenceTrend`
* **Definition**: Directional trend of workout completion adherence across comparable observation periods.
* **Source**: `RetentionMetricsEngineService`
* **Calculation**: Compares current adherence percentage to baseline adherence percentage.
* **Observation Window**: `30D` vs Prior `30D`
* **Baseline**: Prior period adherence
* **Allowed Values**: `'IMPROVING'`, `'STABLE'`, `'DECLINING'`, `'INSUFFICIENT_DATA'`
* **Data-Quality Requirements**: Minimum 3 scheduled workouts required for reliable trend.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `'DECLINING'` (Current: 42.8%, Baseline: 85.0%)

---

### 8. `bookingEngagement`
* **Definition**: Detailed reservation behavior tracking bookings created, attended, cancelled, waitlisted, and missed.
* **Source**: `BookingService`
* **Calculation**: Aggregates `Booking` records grouped by status. A cancellation is not considered disengagement if the member subsequently rebooks.
* **Observation Window**: `30D`
* **Baseline**: Prior period booking count
* **Allowed Values**: Structured metrics (`bookingsCreated`, `bookingsAttended`, `bookingsCancelled`, `waitlistJoins`, `bookingsMissed`, `bookingFrequency`)
* **Data-Quality Requirements**: Differentiates between late cancellations and valid policy cancellations.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `bookingsCreated: 6, bookingsAttended: 4, bookingsCancelled: 2`

---

### 9. `bookingTrend`
* **Definition**: Trajectory of class booking frequency and attendance.
* **Source**: `RetentionMetricsEngineService`
* **Calculation**: Compares current booking frequency against prior period.
* **Observation Window**: `30D`
* **Baseline**: Prior period
* **Allowed Values**: `'IMPROVING'`, `'STABLE'`, `'DECLINING'`, `'INSUFFICIENT_DATA'`
* **Data-Quality Requirements**: A single cancelled class is insufficient evidence of decline.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `'STABLE'`

---

### 10. `noShowRate`
* **Definition**: Percentage of eligible booked class or session reservations where the member failed to attend without notice.
* **Source**: `BookingService`
* **Calculation**: `(noShows / eligibleBookedSessions) * 100`. Excludes sessions cancelled by the gym, cancellations within policy notice, and unpromoted waitlist entries.
* **Observation Window**: `30D`
* **Baseline**: Historical average
* **Allowed Values**: Float $0.0 - 100.0$ (%)
* **Data-Quality Requirements**: Zero eligible bookings yields 0% rate with `INSUFFICIENT_DATA` quality.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `25.0%` (1 no-show across 4 eligible sessions)

---

### 11. `appEngagement`
* **Definition**: Measure of qualifying member interactions within the FitCore mobile application (logins, session opens, AI coach interactions, check-ins).
* **Source**: `EngagementService`
* **Calculation**: Sum of qualifying digital events.
* **Observation Window**: `30D`
* **Baseline**: Prior period app actions
* **Allowed Values**: Non-negative integer count
* **Data-Quality Requirements**: Explicit boundary: App engagement is NOT equated with physical gym attendance. High physical attendance with low app usage is healthy.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `24` actions in last 30 days

---

### 12. `appEngagementTrend`
* **Definition**: Directional trend of digital application interactions.
* **Source**: `RetentionMetricsEngineService`
* **Calculation**: Compares current app action count to historical baseline.
* **Observation Window**: `30D`
* **Baseline**: Prior 30 days
* **Allowed Values**: `'IMPROVING'`, `'STABLE'`, `'DECLINING'`, `'INSUFFICIENT_DATA'`
* **Data-Quality Requirements**: Requires authentic session tokens.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `'STABLE'`

---

### 13. `checkInEngagement`
* **Definition**: Member participation and completion rate in holistic daily check-ins.
* **Source**: `DailyCheckInService`
* **Calculation**: `(completedDailyCheckIns / windowDays) * 100`
* **Observation Window**: `30D`
* **Baseline**: Prior completion rate
* **Allowed Values**: Completion percentage ($0.0 - 100.0$) and counts (`started`, `completed`, `skipped`).
* **Data-Quality Requirements**: **Strict Privacy Directive**: Check-in responses (mood, soreness, stress, notes) are **NEVER** used as medical information or raw churn scoring. Only participation is tracked.
* **Privacy Classification**: `INTERNAL` (participation); `SENSITIVE_HEALTH` (response content - excluded)
* **Whether AI May Use It**: Participation metrics only; Content strictly prohibited.
* **Whether Staff May View It**: Participation metrics only.
* **Example**: `completionRate: 60.0%` (18 check-ins in 30 days)

---

### 14. `goalEngagement`
* **Definition**: Tracking of member interaction with training goals (active goals, milestone updates, completions).
* **Source**: `ProgressService`
* **Calculation**: Count of active goals and timestamp of last goal interaction.
* **Observation Window**: Current active snapshot
* **Baseline**: N/A
* **Allowed Values**: Counts and dates
* **Data-Quality Requirements**: Motivation or personality traits are never inferred from lack of goal interaction.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `activeGoalsCount: 2, lastGoalInteractionAt: "2026-08-20T14:00:00Z"`

---

### 15. `nutritionEngagement`
* **Definition**: Level of engagement with nutrition tracking features (food logs, meal plan views, coach interactions).
* **Source**: `NutritionService`
* **Calculation**: `COUNT(foodLogs) + COUNT(mealPlanViews) + COUNT(coachInteractions)` within window.
* **Observation Window**: `30D`
* **Baseline**: Prior period
* **Allowed Values**: Event counts
* **Data-Quality Requirements**: **Strict Privacy Directive**: Caloric intake, macros, body composition, allergies, and dietary restrictions are **PROHIBITED** from retention risk calculations.
* **Privacy Classification**: `INTERNAL` (counts); `SENSITIVE_HEALTH` (dietary contents - excluded)
* **Whether AI May Use It**: Event counts only.
* **Whether Staff May View It**: Event counts only.
* **Example**: `totalNutritionEvents: 14`

---

### 16. `wearableEngagement`
* **Definition**: Wearable device connectivity and synchronization frequency.
* **Source**: `WearableService`
* **Calculation**: Connection boolean (`isConnected`), provider name, and weekly sync frequency.
* **Observation Window**: `7D` / `30D`
* **Baseline**: N/A
* **Allowed Values**: `isConnected` (boolean), `syncFrequencyWeekly` (integer).
* **Data-Quality Requirements**: **Strict Privacy Directive**: Raw biometric data (HRV, resting heart rate, sleep scores, calories burned) must **NEVER** silently become retention predictors.
* **Privacy Classification**: `INTERNAL` (connectivity); `SENSITIVE_HEALTH` (vitals - excluded)
* **Whether AI May Use It**: Connectivity status and sync frequency only.
* **Whether Staff May View It**: Connectivity status only.
* **Example**: `isConnected: true, syncFrequencyWeekly: 5`

---

### 17. `membershipContext`
* **Definition**: Objective commercial status of member contract (plan tier, status, start/end dates, auto-renewal).
* **Source**: `MembershipService`
* **Calculation**: Active `MemberMembership` record query.
* **Observation Window**: Current snapshot
* **Baseline**: N/A
* **Allowed Values**: `status` (`'ACTIVE'`, `'SUSPENDED'`, `'EXPIRED'`), `daysUntilExpiration` (integer), `isAutoRenew` (boolean).
* **Data-Quality Requirements**: Membership expiration is an observed commercial condition; it is **NOT** equated with member churn.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `plan: "Full Access Annual", daysUntilExpiration: 18, isAutoRenew: true`

---

### 18. `membershipExpirationWindow`
* **Definition**: Standardized operational classification of contract expiration proximity.
* **Source**: `RetentionMetricsEngineService`
* **Calculation**:
  - `EXPIRED`: `daysUntilExpiration <= 0`
  - `EXPIRING_7_DAYS`: `1 <= days <= 7`
  - `EXPIRING_14_DAYS`: `8 <= days <= 14`
  - `EXPIRING_30_DAYS`: `15 <= days <= 30`
  - `ACTIVE`: `> 30` days or auto-renewing.
* **Observation Window**: Forward-looking expiration date
* **Baseline**: N/A
* **Allowed Values**: `'ACTIVE'`, `'EXPIRING_30_DAYS'`, `'EXPIRING_14_DAYS'`, `'EXPIRING_7_DAYS'`, `'EXPIRED'`
* **Data-Quality Requirements**: Configurable by organization policy; never hardcoded.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `'EXPIRING_30_DAYS'`

---

### 19. `memberLifecycleStage`
* **Definition**: Objective tenure and activity lifecycle phase determined purely by deterministic business rules.
* **Source**: `RetentionMetricsEngineService`
* **Calculation**:
  - `NEW_MEMBER`: Tenure $\le 30$ days
  - `EARLY_MEMBERSHIP`: Tenure $31 - 90$ days
  - `ACTIVE_MEMBER`: Tenure $> 90$ days with regular activity
  - `LONG_TERM_MEMBER`: Tenure $> 365$ days
  - `RETURNING_MEMBER`: Resumed activity after documented absence
  - `REACTIVATED_MEMBER`: Formally reactivated via Day 27 recovery plan.
* **Observation Window**: Member tenure & inactivity
* **Baseline**: N/A
* **Allowed Values**: Valid `MemberLifecycleStage` enum
* **Data-Quality Requirements**: AI is never permitted to assign or reclassify lifecycle stages.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `'EARLY_MEMBERSHIP'`

---

### 20. `reengagementSignal`
* **Definition**: Verified physical or booking activity observed following a period of reduced engagement or inactivity.
* **Source**: `RetentionOutcomeService` / `RetentionMetricsEngineService`
* **Calculation**: Attendance check-in, completed workout, or class booking occurring within 14 days of an outreach. Opening the mobile app once is **NOT** counted as re-engagement.
* **Observation Window**: 14 days following outreach
* **Baseline**: Pre-outreach inactivity
* **Allowed Values**: Boolean (`isReengaged`), `reengagementAt` (timestamp), `signalType` (activity enum).
* **Data-Quality Requirements**: Requires verified physical check-in or booked session.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `isReengaged: true, signalType: "GYM_CHECK_IN", reengagementAt: "2026-09-04T07:15:00Z"`

---

### 21. `retentionRisk`
* **Definition**: Deterministic decision-support risk classification.
* **Source**: `RetentionRiskService` (Day 26)
* **Calculation**: Evaluated from verified attendance decline, no-shows, and inactivity days.
* **Observation Window**: Trailing 28 days
* **Baseline**: Personal baseline
* **Allowed Values**: `'INSUFFICIENT_DATA'`, `'LOW'`, `'MODERATE'`, `'ELEVATED'`, `'HIGH'`
* **Data-Quality Requirements**: It is a decision-support classification, **NOT** a probability of cancellation. Must never be displayed as `"80% chance of churn"`.
* **Privacy Classification**: `INTERNAL` (Staff only; Never exposed to member)
* **Whether AI May Use It**: Yes (Cannot override deterministic value)
* **Whether Staff May View It**: Yes
* **Example**: `'ELEVATED'`

---

### 22. `retentionRiskTrend`
* **Definition**: Trajectory of retention risk relative to previous evaluations.
* **Source**: `RiskFactorService` (Day 26)
* **Calculation**: Comparison of current risk factors and positive signals against prior assessment.
* **Observation Window**: Consecutive evaluations
* **Baseline**: Previous risk assessment
* **Allowed Values**: `'IMPROVING'`, `'STABLE'`, `'WORSENING'`, `'INSUFFICIENT_DATA'`
* **Data-Quality Requirements**: Based strictly on underlying deterministic metrics.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `'WORSENING'`

---

### 23. `retentionRiskFactor`
* **Definition**: Grounded, evidence-backed factor contributing to retention risk.
* **Source**: `RiskFactorService`
* **Calculation**: Deterministic rule evaluation (e.g., attendance drop $> 40\%$, consecutive no-shows $\ge 2$).
* **Observation Window**: `28D` / `30D`
* **Baseline**: Personal baseline comparison
* **Allowed Values**: Typed object (`type`, `severity`, `observedValue`, `baselineValue`, `difference`, `observationWindow`, `source`, `evidence`).
* **Data-Quality Requirements**: AI must never create unsupported numerical evidence.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes (AI explains; does not fabricate)
* **Whether Staff May View It**: Yes
* **Example**:
  ```json
  {
    "type": "ATTENDANCE_DECLINE",
    "severity": "HIGH",
    "observedValue": "2 visits / 30D",
    "baselineValue": "8 visits / 30D",
    "difference": "-6 visits (-75%)",
    "source": "AttendanceService",
    "evidence": ["Member attended 2 times in last 30 days vs 8 times in prior baseline window"]
  }
  ```

---

### 24. `positiveRetentionSignal`
* **Definition**: Documented positive member behavior that balances or mitigates risk factors.
* **Source**: `RiskFactorService`
* **Calculation**: Evaluation of recent workout completions, bookings, goal progress, and app check-ins.
* **Observation Window**: Trailing 14 days
* **Baseline**: Personal history
* **Allowed Values**: Typed object (`type`, `observation`, `timeframe`, `evidence`).
* **Data-Quality Requirements**: Positive signals must always be presented alongside negative signals to prevent one-sided bias.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `type: "RECENT_WORKOUT", observation: "Member logged a full-body workout yesterday."`

---

### 25. `dataQuality`
* **Definition**: Assessment of historical telemetry completeness, recency, and source reliability.
* **Source**: `RetentionMetricsEngineService`
* **Calculation**:
  - `HIGH`: Member tenure $\ge 60$ days, activity logs present across multiple domains.
  - `MEDIUM`: Member tenure $30 - 59$ days.
  - `LOW`: Member tenure $14 - 29$ days.
  - `INSUFFICIENT_DATA`: Member tenure $< 14$ days or zero activity records.
* **Observation Window**: Full member tenure
* **Baseline**: N/A
* **Allowed Values**: `'HIGH'`, `'MEDIUM'`, `'LOW'`, `'INSUFFICIENT_DATA'`
* **Data-Quality Requirements**: Explicitly passed into AI prompt to prevent overconfident extrapolation on new members.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `'HIGH'`

---

### 26. `cooldownStatus`
* **Definition**: Tracking of recent retention outreach to prevent message fatigue and member annoyance.
* **Source**: `CommunicationService` / `RetentionWorkflowService`
* **Calculation**: Checks if member received any retention outreach in the previous 14 days (or organization-configured cooldown period).
* **Observation Window**: 14 calendar days trailing
* **Baseline**: N/A
* **Allowed Values**: `isCooldownActive` (boolean), `cooldownUntil` (timestamp), `cooldownReason` (string).
* **Data-Quality Requirements**: Fully configurable per organization; never hardcoded universal rule.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes (Prevents generating drafts for members in cooldown)
* **Whether Staff May View It**: Yes
* **Example**: `isCooldownActive: true, cooldownUntil: "2026-09-18T10:00:00Z"`

---

### 27. `contactFrequency`
* **Definition**: Rolling count of all outbound communications across all channels to safeguard member attention.
* **Source**: `CommunicationService`
* **Calculation**: `COUNT(communications)` sent in last 24 hours, 7 days, and 30 days.
* **Observation Window**: `24H`, `7D`, `30D`
* **Baseline**: Policy caps
* **Allowed Values**: Structured count summary
* **Data-Quality Requirements**: Includes all communication categories (marketing, transactional, retention, reminders).
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `communicationsLast24h: 1, communicationsLast7d: 2, communicationsLast30d: 5`

---

### 28. `outcomeAttribution`
* **Definition**: Scientific, non-causal standard for recording member re-engagement following an intervention.
* **Source**: `RetentionOutcomeService`
* **Calculation**: Observed re-engagement event timestamped after outreach dispatch.
* **Observation Window**: 14 days post-dispatch
* **Baseline**: Pre-outreach state
* **Allowed Values**: Standardized text phrasing using **"FOLLOWING OUTREACH"** (Never *"CAUSED BY OUTREACH"*).
* **Data-Quality Requirements**: System must never assert that the AI outreach caused the member to return without a randomized controlled trial.
* **Privacy Classification**: `INTERNAL`
* **Whether AI May Use It**: Yes
* **Whether Staff May View It**: Yes
* **Example**: `"Member attended gym check-in 3 days following outreach delivery."`

---

## 4. Prohibited Metrics & Safety Guardrails

The following categories of data are **STRICTLY PROHIBITED** from retention risk scoring, prompts, or AI synthesis:

| Prohibited Category | Specific Examples | Reason for Prohibition |
|---|---|---|
| **Raw Biometrics & Vitals** | Heart Rate Variability (HRV), Resting Heart Rate, VO2 Max, ECG records | Sensitive medical data; clinical inference out of gym scope |
| **Sleep & Recovery Scores** | Deep sleep minutes, REM sleep, Sleep scores | Health data boundaries; not validated churn predictors |
| **Nutritional Consumption** | Calories consumed, macro grams, restriction logs | Eating disorder risk; non-clinical fitness platform boundary |
| **Medical / PAR-Q Answers** | Medical conditions, injury diagnoses, physician notes | Legal and privacy liability; strict HIPAA/GDPR health protection |
| **Payment Card Details** | PAN, CVV, bank account numbers | PCI-DSS security compliance |
| **Churn Probability Percentages**| "84% likelihood to churn", "Churn score: 0.92" | Unvalidated statistical claims; dehumanizing staff presentation |

---

## 5. Retention Data Versioning & Retention Policy

- **`analysisVersion`**: Incremented when the analytical schema or pipeline changes. Current: `1`.
- **`dataVersion`**: Incremented when the deterministic metrics engine recalculates signals. Current: `1`.
- **Staleness Rule**: If underlying attendance or activity data changes, previous analysis records are marked stale after 72 hours.
- **Data Minimization**: Raw member telemetry stays in its respective originating domain table (`CheckIn`, `Workout`, `Booking`). Retention agent persistence stores only derived, sanitized metrics and human-approved communication artifacts.
