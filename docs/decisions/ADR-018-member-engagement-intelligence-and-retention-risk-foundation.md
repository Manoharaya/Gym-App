# ADR-018: Member Engagement Intelligence & Retention Risk Foundation

## Status
Accepted

## Context
FitCore required an intelligence layer to quantify member engagement across gym visits, workouts, bookings, goals, daily check-ins, app activity, and wearable syncs. Previous systems lacked an objective, data-grounded mechanism to detect early engagement weakening and momentum shifts before members churn. However, building an autonomous churn-prediction system with automated campaigns or cancellations would introduce high risks of hallucinations, demographic bias, and unauthorized state mutations.

## Decision
We implemented a **deterministic-first, data-grounded Member Engagement Intelligence layer**:

1. **Source of Truth Consumption**:
   The engine strictly reads from existing domain entities (`CheckIn`, `AttendanceRecord`, `Booking`, `Workout`, `TrainingGoal`, `MemberMembership`, `DailyCheckIn`, `EngagementEvent`, `WearableSyncLog`). It never mutates or overwrites source domains.

2. **Personal Historical Baseline (Self-Comparison)**:
   Rather than comparing members to arbitrary population averages, activity is evaluated against each member's personal historical baseline (28-day window vs 7-day window). A member who historically visits once a week and continues to do so is correctly classified as `STABLE`, avoiding false churn flags.

3. **Multi-Pillar Trend Engine**:
   Evaluates 14 explicit trend types across attendance, workout adherence, bookings, app activity, goals, and check-ins. Trends strictly require a minimum observation threshold (at least 3 baseline events and 7 observation days) to prevent volatile single-event triggers.

4. **Deterministic Engagement Health Classification**:
   Member engagement is scored and categorized into `VERY_LOW`, `LOW`, `MODERATE`, `HIGH`, `VERY_HIGH`, or `INSUFFICIENT_DATA`. It is explicitly labeled **Engagement Level** (never "Health Score" or psychological state).

5. **Retention Risk Foundation**:
   Evaluates retention risk (`INSUFFICIENT_DATA`, `LOW`, `MODERATE`, `ELEVATED`, `HIGH`). The system strictly distinguishes **Observed Signal** from **Risk Interpretation** and never claims certainty (e.g. never states "This member will churn").

6. **Member vs Staff Visibility Boundary**:
   - **Members** view an encouraging, supportive **"Your Fitness Momentum"** screen (`MemberEngagementScreen.tsx`). Churn risk labels are strictly forbidden from member view.
   - **Retention Risk** is strictly restricted to internal staff and assigned trainers.

7. **Strict Fairness Rule**:
   The retention risk engine strictly excludes and never infers race, religion, ethnicity, gender, sexual orientation, disability, medical diagnoses (PAR-Q), or medications. Automated invariance tests verify identical output when demographic/medical attributes vary.

8. **No Autonomous State Mutations**:
   The system produces advisory intelligence only. It never autonomously cancels/suspends memberships, books/cancels classes, modifies workouts, or sends automated SMS/email messages.

9. **Future ML Model Insertion Boundary**:
   The deterministic risk scoring engine acts as a stable foundation that can be supplemented or replaced by trained ML models in future phases without altering API or frontend contracts.

## Consequences
- Clean separation between observable platform facts and AI interpretation.
- Complete compliance with fairness, anti-discrimination, and privacy principles.
- Zero risk of hallucinated churn campaigns or accidental membership cancellations.
