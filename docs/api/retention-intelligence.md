# API Reference: AI Retention Intelligence

All endpoints are prefixed with `/api/v1/ai/retention` and require a valid staff JWT Bearer token (`JwtAuthGuard`).

---

## 1. GET `/summary`
Retrieve aggregate retention overview and risk distribution across active members.

### Headers:
- `Authorization: Bearer <token>`
- `x-organisation-id: <org-id>` (optional if resolved from user roles)

### Query Parameters:
- `outletId` (string, optional): Filter by outlet.
- `timeframe` (string, optional): Default `'30d'`.

### Response (200 OK):
```json
{
  "organisationId": "org_123",
  "outletId": null,
  "totalActiveMembers": 420,
  "membersWithElevatedRisk": 18,
  "membersWithHighRisk": 7,
  "membersWithDecliningEngagement": 25,
  "membersReengaging": 14,
  "membersRequiringFollowUp": 25,
  "riskDistribution": {
    "HIGH": 7,
    "ELEVATED": 18,
    "MODERATE": 45,
    "LOW": 350,
    "INSUFFICIENT_DATA": 0
  },
  "trendDistribution": {
    "IMPROVING": 14,
    "STABLE": 381,
    "WORSENING": 25,
    "INSUFFICIENT_DATA": 0
  },
  "interventionDistribution": {
    "TRAINER_CHECK_IN": 12,
    "GOAL_REVIEW": 6,
    "TRAINING_RESTART": 4,
    "CLASS_RECOMMENDATION": 3,
    "PERSONAL_TRAINING_FOLLOW_UP": 0,
    "RECOVERY_SUPPORT": 0,
    "APP_ENGAGEMENT": 0,
    "NUTRITION_ENGAGEMENT": 0,
    "MEMBERSHIP_CONVERSATION": 0,
    "GENERAL_SUPPORT": 0,
    "NO_ACTION": 0,
    "INSUFFICIENT_DATA": 0
  },
  "openTasksCount": 8,
  "completedTasksCount": 32,
  "calculatedAt": "2026-09-08T04:47:00.000Z"
}
```

---

## 2. GET `/risk`
Get deterministic retention risk score and trend for a single member.

### Query Parameters:
- `memberId` (string, required): Target member profile ID.
- `refresh` (boolean, optional): Force cache bypass and recalculation.

### Response (200 OK):
```json
{
  "memberId": "mp_alex_01",
  "organisationId": "org_123",
  "riskLevel": "ELEVATED",
  "contributingReasons": [
    "Gym attendance decreased by 65% relative to personal baseline (0.5 vs 3.0 visits/week).",
    "No workouts completed in the past 14 days."
  ],
  "observedSignals": [
    {
      "source": "ATTENDANCE",
      "metric": "visitsLast28d",
      "currentValue": 2,
      "baselineValue": 12,
      "deltaPct": -83.3,
      "indicator": "NEGATIVE"
    }
  ],
  "workflowState": "FOLLOW_UP_RECOMMENDED",
  "dataQuality": "SUFFICIENT_DATA",
  "assessedAt": "2026-09-08T04:47:00.000Z",
  "trend": "WORSENING"
}
```

---

## 3. GET `/factors`
Get explainable, structured risk factors with platform evidence and positive signals.

### Query Parameters:
- `memberId` (string, required): Target member profile ID.

### Response (200 OK):
```json
{
  "primaryFactors": [
    {
      "type": "ATTENDANCE_DECLINE",
      "severity": "HIGH",
      "observation": "Gym attendance decreased from normal baseline of 3.0 visits/week to 0.5 visits/week.",
      "timeframe": "Last 14-28 days",
      "evidence": [
        "Historical Baseline: 3.0 visits/week",
        "Recent Period: 0.5 visits/week",
        "Variance: -83.3%",
        "Total Visits Last 28 Days: 2"
      ]
    }
  ],
  "positiveSignals": [
    {
      "type": "ATTENDANCE_RECOVERY",
      "observation": "Member checked in yesterday after a 12-day lapse.",
      "timeframe": "Last 24 hours",
      "evidence": ["Check-in recorded at 07:15 AM"]
    }
  ],
  "riskTrend": "WORSENING"
}
```

---

## 4. GET `/queue`
Staff retention follow-up queue with filters.

### Query Parameters:
- `outletId` (string, optional)
- `riskLevel` (`HIGH` | `ELEVATED` | `MODERATE` | `LOW`, optional)
- `trainerId` (string, optional)
- `search` (string, optional)
- `limit` (number, default: 50)
- `offset` (number, default: 0)

### Response (200 OK):
```json
{
  "items": [
    {
      "memberId": "mp_alex_01",
      "memberName": "Alex Mercer",
      "memberEmail": "member@secondwind.com.au",
      "avatarUrl": null,
      "outletId": "out_01",
      "outletName": "Second Wind Perth Central",
      "riskLevel": "HIGH",
      "riskTrend": "WORSENING",
      "primaryReason": "Gym visits declined 80% vs baseline",
      "recommendedIntervention": "TRAINER_CHECK_IN",
      "interventionPriority": "HIGH",
      "assignedTrainer": {
        "id": "tr_marcus",
        "name": "Marcus Brody"
      },
      "lastVisit": "2026-08-25T08:00:00.000Z",
      "lastWorkout": "2026-08-24T09:30:00.000Z",
      "lifecycleStage": "ACTIVE_MEMBER",
      "activeTask": null
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

## 5. POST `/analyze`
Generate or retrieve AI-powered retention analysis.

### Request Body:
```json
{
  "memberId": "mp_alex_01",
  "promptQuery": "Focus on workout adherence after recent ankle soreness",
  "forceRecalculate": false
}
```

### Headers:
- `idempotency-key: <uuid>` (optional)

### Response (200 OK):
```json
{
  "analysis": {
    "summary": "Alex is an established member with an 83% drop in attendance over the past 2 weeks relative to his 3x/week personal baseline. No workouts logged since August 24.",
    "risk": {
      "level": "HIGH",
      "trend": "WORSENING"
    },
    "confidence": "HIGH",
    "primaryFactors": [...],
    "positiveSignals": [...],
    "recommendedInterventions": [
      {
        "type": "TRAINER_CHECK_IN",
        "priority": "HIGH",
        "reason": "Alex has missed 5 scheduled strength sessions. Coach Marcus should check in on recovery and schedule.",
        "suggestedActionPlan": "Discuss session cadence and program modifications."
      }
    ],
    "suggestedStaffNote": "Followed up with Alex regarding training frequency."
  },
  "analysisId": "ret_anlz_abc123",
  "cached": false,
  "generatedBy": "AI"
}
```

---

## 6. POST `/feedback`
Submit staff rating and feedback on AI recommendations.

### Request Body:
```json
{
  "memberId": "mp_alex_01",
  "analysisId": "ret_anlz_abc123",
  "rating": "HELPFUL",
  "comment": "Accurate recommendation; helped coach re-engage client.",
  "category": "ACCURACY"
}
```

---

## 7. POST `/follow-ups`
Create human follow-up task.

### Request Body:
```json
{
  "memberId": "mp_alex_01",
  "interventionType": "TRAINER_CHECK_IN",
  "priority": "HIGH",
  "assignedStaffId": "usr_marcus",
  "title": "Check in on training consistency",
  "notes": "Discuss session schedule and goal progress",
  "dueAt": "2026-09-12T00:00:00.000Z"
}
```

---

## 8. PATCH `/follow-ups/:id`
Update follow-up task status, assignment, or completion.

### Request Body:
```json
{
  "status": "COMPLETED",
  "notes": "Spoke with member after morning workout. Re-aligned schedule for Tuesdays/Thursdays."
}
```
*(Or for dismissal: `{"status": "DISMISSED", "dismissalReason": "Member resolved with coach directly."}`)*
