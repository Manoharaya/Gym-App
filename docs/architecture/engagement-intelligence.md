# Member Engagement Intelligence Architecture

## Overview
The **Member Engagement Intelligence** module (`services/api/src/ai/features/engagement-intelligence/`) establishes the data-grounded intelligence layer for tracking member momentum, detecting behavioral shifts, and evaluating retention risk across FitCore.

## Architecture Flow

```text
Raw Platform Activity
  ├── Attendance (CheckIn, AttendanceRecord)
  ├── Bookings (Booking, WaitlistEntry)
  ├── Training (Workout, TrainingPlan)
  ├── Goals (TrainingGoal)
  ├── Nutrition (FoodLog aggregated consistency)
  ├── Daily Check-Ins (DailyCheckIn frequency)
  ├── Wearables (WearableSyncLog, HealthDataRecord consistency)
  └── App Activity (EngagementEvent intentional taxonomy)
        ↓
Deterministic Signals Engine (EngagementSignalService)
        ↓
Personal Historical Baseline Engine (MemberEngagementBaselineService)
        ↓
Member Engagement Profile & Level (MemberEngagementProfileService)
        ↓
Multi-Pillar Trend Detection (EngagementTrendService)
        ↓
Retention Risk Foundation (RetentionRiskService)
        ↓
AI Context & Sensitive Data Exclusion (EngagementContextService)
        ↓
AI Orchestrator & Output Validation (engagement_intelligence.v1)
        ↓
Role-Based Presentation
  ├── Member: "Your Fitness Momentum" (Supportive UI, no churn labels)
  ├── Personal Trainer: Client Engagement Momentum & Suggested Follow-up
  └── Management: Aggregate Organisation & Outlet Analytics
```

## Core Modules & Services

### 1. Signal Collectors (`signals/`)
- `attendance-signals.service.ts`: Gym turnstiles, class attendance, PT sessions, no-shows.
- `booking-signals.service.ts`: Bookings, cancellations, waitlists, frequency.
- `workout-signals.service.ts`: Workouts scheduled vs completed, adherence percentage.
- `membership-signals.service.ts`: Commercial status (read-only; never mutates membership).
- `app-engagement.service.ts`: Records intentional app events (`APP_OPENED`, `LOGIN`, etc.).
- `checkin-signals.service.ts`: Check-in completion rate and consistency.
- `wearable-signals.service.ts`: High-level sync consistency and activity days (no raw clinical data).
- `engagement-signal.service.ts`: Orchestrates all signal collectors into a unified bundle.

### 2. Baseline & Profile Engines (`profile/`)
- `member-engagement-baseline.service.ts`: 28-day historical baseline vs 7-day recent window. Evaluates personal deviations rather than generic population averages.
- `member-engagement-profile.service.ts`: Weighted scoring producing deterministic Engagement Level (`VERY_LOW`, `LOW`, `MODERATE`, `HIGH`, `VERY_HIGH`, `INSUFFICIENT_DATA`).

### 3. Trend Detection (`trends/`)
- `engagement-trend.service.ts`: Evaluates 14 trend types across attendance, adherence, bookings, app activity, goals, check-ins, and overall momentum. Requires minimum observation threshold.

### 4. Retention Risk Foundation (`risk/`)
- `retention-risk.service.ts`: Computes risk state (`INSUFFICIENT_DATA`, `LOW`, `MODERATE`, `ELEVATED`, `HIGH`).
- `risk-explanation.service.ts`: Generates human-readable contributing reasons separating observable facts from risk interpretation.

### 5. AI Synthesis & Safety (`services/`, `safety/`, `prompts/`, `schemas/`)
- `engagement_intelligence.v1.ts`: Prompt enforcing data grounding, non-judgmental tone, and strict exclusion of medical/psychological terms.
- `engagement-output.schema.ts`: JSON schema validating structured output.
- `engagement-safety.service.ts`: Intercepts prompt injections and sanitizes model output.

### 6. Read-Only AI Tools (`tools/`)
- `getEngagementSummary`
- `getEngagementTrends`
- `getAttendanceEngagement`
- `getWorkoutEngagement`
- `getBookingEngagement`
- `getRetentionRisk` (Staff/Trainer only)
