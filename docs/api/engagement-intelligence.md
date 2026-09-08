# Engagement Intelligence API Reference

Base path: `/api/v1/ai/engagement`

All requests require Bearer token authentication (`Authorization: Bearer <jwt>`) and tenant context (`x-organisation-id` header or token payload).

---

## Endpoints

### 1. Get Member Engagement Summary
`GET /api/v1/ai/engagement/summary`

Returns the deterministic member engagement profile, frequencies, and adherence.

**Query Parameters:**
- `memberId` (optional, staff/trainer only): Target member ID.
- `refresh` (optional, boolean): Bypass cache and recalculate.

**Response (200 OK):**
```json
{
  "memberId": "clx...",
  "organisationId": "clx...",
  "lastAppActivity": "2026-09-08T00:10:00.000Z",
  "lastGymVisit": "2026-09-07T18:30:00.000Z",
  "lastWorkout": "2026-09-07T19:15:00.000Z",
  "lastBooking": "2026-09-05T09:00:00.000Z",
  "lastCheckIn": "2026-09-08T00:05:00.000Z",
  "attendanceFrequency": 2.75,
  "workoutAdherence": 85,
  "bookingFrequency": 1.25,
  "appEngagement": 9.5,
  "goalEngagement": 65,
  "nutritionEngagement": 4.0,
  "wearableEngagement": 6.5,
  "overallEngagement": "HIGH",
  "trend": "IMPROVING",
  "calculatedAt": "2026-09-08T00:15:00.000Z"
}
```

---

### 2. Get Engagement Trends
`GET /api/v1/ai/engagement/trends`

Returns multi-pillar trend items comparing recent activity to personal baseline.

**Response (200 OK):**
```json
[
  {
    "trendType": "ATTENDANCE_IMPROVING",
    "direction": "IMPROVING",
    "metric": "Gym & Class Visits",
    "baselineValue": 1.5,
    "recentValue": 3.0,
    "deltaPercent": 100,
    "confidence": "HIGH",
    "description": "Gym visits increased by 100% compared to recent historical weekly baseline.",
    "observationCount": 8
  }
]
```

---

### 3. Get Retention Risk Foundation
`GET /api/v1/ai/engagement/retention-risk?memberId=<memberId>`

*Restricted to authorized staff, managers, and trainers.*

**Response (200 OK):**
```json
{
  "memberId": "clx...",
  "organisationId": "clx...",
  "riskLevel": "ELEVATED",
  "observedSignals": [
    {
      "category": "ATTENDANCE",
      "observation": "Gym visits decreased from 3.0/week to 1.0/week over the last 7 days.",
      "timeframe": "Last 7 days"
    },
    {
      "category": "TRAINING",
      "observation": "Workout completion is currently at 33% adherence (1 of 3 completed).",
      "timeframe": "Last 28 days"
    }
  ],
  "contributingReasons": [
    "Gym visits decreased from 3.0/week to 1.0/week over the last 7 days.",
    "Workout completion is currently at 33% adherence (1 of 3 completed)."
  ],
  "workflowState": "FOLLOW_UP_RECOMMENDED",
  "dataQuality": "SUFFICIENT_DATA",
  "assessedAt": "2026-09-08T00:15:00.000Z"
}
```

---

### 4. Generate AI Engagement Insight
`POST /api/v1/ai/engagement/insight`

**Request Body:**
```json
{
  "memberId": "clx...",
  "promptQuery": "How can I maintain consistency during a busy work week?"
}
```

**Response (200 OK):**
```json
{
  "insight": {
    "summary": "Recent engagement is classified as HIGH with an accelerating momentum trajectory.",
    "observedSignals": [],
    "engagementInterpretation": {
      "level": "HIGH",
      "trend": "IMPROVING"
    },
    "retentionRisk": {
      "level": "LOW",
      "reasons": ["Gym visits and workout adherence are consistent with baseline."]
    },
    "recommendedActions": [
      {
        "type": "TRAINING",
        "recommendation": "Maintain your 2-to-3 session weekly rhythm with quick 25-minute routines."
      }
    ],
    "confidence": "HIGH"
  },
  "insightId": "clx...",
  "cached": false
}
```

---

### 5. Record App Engagement Event
`POST /api/v1/ai/engagement/events`

**Request Body:**
```json
{
  "eventType": "WORKOUT_COMPLETED",
  "metadata": { "workoutId": "clx..." }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "eventId": "clx..."
}
```

---

### 6. Get Aggregate Analytics
`GET /api/v1/ai/engagement/analytics?outletId=<optional>`

*Restricted to staff and managers.*

**Response (200 OK):**
```json
{
  "organisationId": "clx...",
  "timeframe": "LAST_28_DAYS",
  "activeMembers": 120,
  "engagedMembers": 85,
  "decliningMembers": 18,
  "elevatedRiskMembers": 12,
  "inactiveMembers": 35,
  "reactivatedMembers": 0,
  "averageVisitsPerMember": 2.4,
  "averageWorkoutAdherence": 76,
  "bookingActivityCount": 340,
  "appEngagementScore": 72,
  "checkInCompletionRate": 0,
  "engagementLevelDistribution": {
    "VERY_HIGH": 30,
    "HIGH": 55,
    "MODERATE": 40,
    "LOW": 15,
    "VERY_LOW": 10,
    "INSUFFICIENT_DATA": 5
  },
  "retentionRiskDistribution": {
    "LOW": 95,
    "MODERATE": 25,
    "ELEVATED": 18,
    "HIGH": 12,
    "INSUFFICIENT_DATA": 5
  },
  "generatedAt": "2026-09-08T00:15:00.000Z"
}
```

---

### 7. Scoped Trainer Client View
`GET /api/v1/ai/engagement/trainer/clients/:memberId`

*Restricted to assigned personal trainers.*

**Response (200 OK):**
```json
{
  "memberId": "clx...",
  "firstName": "Alex",
  "lastName": "Member",
  "engagementLevel": "HIGH",
  "trend": "IMPROVING",
  "lastGymVisit": "2026-09-07T18:30:00.000Z",
  "lastWorkout": "2026-09-07T19:15:00.000Z",
  "workoutsCompletedLast30d": 12,
  "attendanceVisitsLast30d": 14,
  "workoutAdherencePercent": 85,
  "observedSignals": [],
  "suggestedFollowUp": "Member is highly engaged! Consider introducing new milestones or celebrating achievements."
}
```
