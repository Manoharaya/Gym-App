# API Reference: AI Reactivation & Member Recovery

All routes are prefixed with `/api/v1/ai/reactivation`. Authentication via JWT Bearer token is required. Multi-tenant scoping via `x-organisation-id` header or user role token.

---

## 1. GET `/summary`
Retrieve aggregate reactivation metrics and distribution by recovery strategy and state.

- **Access:** Staff only (`SUPERADMIN`, `ORGANISATION_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST`, `TRAINER`)
- **Query Parameters:**
  - `outletId` (optional): Filter metrics by specific gym location.
- **Response `200 OK`:**
```json
{
  "totalActiveMembers": 1250,
  "eligibleMembersCount": 84,
  "membersInReactivationCount": 42,
  "reengagedMembersCount": 18,
  "followupsPendingApprovalCount": 12,
  "followupsInProgressCount": 24,
  "averageInactivityDaysBeforeRecovery": 21.4,
  "recoveryRatePercent": 42.8,
  "strategyDistribution": {
    "TRAINING_RESTART": 14,
    "GOAL_RESET": 9,
    "PERSONAL_TRAINER_CHECK_IN": 7
  },
  "recoveryStateDistribution": {
    "NO_RECOVERY_SIGNAL": 25,
    "EARLY_REENGAGEMENT": 10,
    "PARTIAL_REENGAGEMENT": 5,
    "STABLE_REENGAGEMENT": 2,
    "REENGAGED": 18
  }
}
```

---

## 2. GET `/queue`
Retrieve prioritized staff follow-up items for disengaged or recovering members.

- **Access:** Staff only
- **Query Parameters:**
  - `outletId` (optional)
  - `recoveryState` (optional)
  - `reactivationStatus` (optional)
  - `strategyType` (optional)
  - `assignedStaffId` (optional)
  - `limit` (default: 20)
  - `offset` (default: 0)
- **Response `200 OK`:**
```json
{
  "items": [
    {
      "memberId": "cuid-member-1",
      "memberName": "Alex Mercer",
      "memberEmail": "alex@example.com",
      "inactivityDays": 21,
      "riskLevel": "ELEVATED",
      "riskTrend": "WORSENING",
      "recoveryState": "NO_RECOVERY_SIGNAL",
      "primaryBarrier": "No meaningful activity recorded for 21 days",
      "recommendedStrategy": "TRAINING_RESTART",
      "strategyPriority": "HIGH",
      "recoveryPlanStatus": "PENDING_APPROVAL",
      "activePlanId": "cuid-plan-101"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

---

## 3. GET `/members/:memberId`
Retrieve detailed reactivation profile and active recovery plan for a member.

- **Access:** Authorized staff (Trainers scoped to assigned clients).
- **Response `200 OK`:**
```json
{
  "profile": {
    "id": "cuid-prof-1",
    "memberId": "cuid-member-1",
    "memberName": "Alex Mercer",
    "lifecycleState": "INACTIVE",
    "recoveryState": "NO_RECOVERY_SIGNAL",
    "inactivityDays": 21,
    "recommendedStrategy": "TRAINING_RESTART",
    "primaryBarriers": [
      {
        "type": "LONG_INACTIVITY",
        "observation": "No meaningful activity recorded for 21 days",
        "evidence": ["Last activity: GYM_VISIT on 2026-08-18"]
      }
    ],
    "positiveSignals": []
  },
  "activePlan": {
    "id": "cuid-plan-101",
    "status": "PENDING_APPROVAL",
    "strategy": "TRAINING_RESTART",
    "priority": "HIGH",
    "reason": "Return after 3 weeks away",
    "suggestedStaffMessage": "Hey Alex, ready for a light 20-min return workout?"
  }
}
```

---

## 4. POST `/plans`
Create a human-approved `MemberRecoveryPlan`.

- **Access:** Staff only
- **Body:**
```json
{
  "memberId": "cuid-member-1",
  "strategyType": "TRAINING_RESTART",
  "priority": "HIGH",
  "targetChannel": "TRAINER_MESSAGE",
  "recommendedAction": "Schedule light return workout",
  "draftMessage": "Hey Alex! Ready to jump back in with an easy 20-min session?",
  "staffNotes": "Member returning after vacation"
}
```

---

## 5. POST `/plans/:planId/transition`
Transition a recovery plan status through the state machine.

- **Access:** Staff only
- **Body:**
```json
{
  "targetStatus": "APPROVED",
  "notes": "Approved by trainer for morning outreach"
}
```
*(For `DISMISSED` status, `dismissalReason` is mandatory).*

---

## 6. POST `/feedback`
Submit staff feedback on AI recovery strategies.

- **Access:** Staff only
- **Body:**
```json
{
  "memberRecoveryPlanId": "cuid-plan-101",
  "feedback": "ACCEPTED",
  "comments": "Great recommendation. Member scheduled workout immediately."
}
```

---

## 7. GET `/member-state` (Member Privacy Endpoint)
Retrieve encouraging, privacy-safe recovery status for the authenticated member.

- **Access:** Authenticated member (`MEMBER` role).
- **Response `200 OK`:**
```json
{
  "recoveryState": "RECOVERING",
  "inactivityDays": 16,
  "suggestedFocus": "Training Restart"
}
```
*(Zero internal churn, risk levels, or prediction scores exposed).*
