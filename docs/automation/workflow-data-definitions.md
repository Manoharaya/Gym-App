# Workflow Data Definitions & Taxonomy

This document establishes the canonical data taxonomy and definitions used across the Automated Engagement Workflows Engine.

---

## 1. Triggers Taxonomy

| Trigger Type | Description | Qualifying Payload / Criteria |
| :--- | :--- | :--- |
| `INACTIVITY_DAYS_REACHED` | Member has not visited the facility for $N$ consecutive days. | `{ inactivityDays: number }` |
| `ATTENDANCE_DROP_PERCENT` | Member's 4-week attendance dropped by $\ge X\%$ compared to baseline. | `{ dropPercent: number, baselineVisits: number }` |
| `CLASS_MISSED` | Member missed a booked group class without timely cancellation. | `{ classSessionId: string, className: string }` |
| `MULTIPLE_SESSIONS_MISSED`| Member missed 2+ consecutive booked sessions. | `{ sessionsMissed: number }` |
| `MEMBERSHIP_EXPIRING` | Membership expiration date is within $N$ days. | `{ daysUntilExpiration: number, expiryDate: string }` |
| `MEMBER_REENGAGED` | Member checks in after $\ge 14$ days of prolonged inactivity. | `{ previousInactivityDays: number }` |
| `WORKOUT_MILESTONE_REACHED`| Member logged their 25th, 50th, 100th workout. | `{ milestoneCount: number }` |
| `SCHEDULED_WORKOUT_MISSED`| Member missed an uncompleted scheduled workout in their plan. | `{ scheduledWorkoutId: string, title: string }` |
| `DAILY_CHECKIN_MISSED` | Member failed to submit daily check-in for $N$ days. | `{ checkInStreakLost: boolean }` |
| `MEMBER_BIRTHDAY` | Member's date of birth matches today. | `{ dateOfBirth: string }` |
| `MEMBERSHIP_ANNIVERSARY` | Member's anniversary of joining the facility. | `{ yearsActive: number }` |
| `GOAL_ACHIEVED` | Member marked an active training goal as achieved. | `{ goalId: string, goalTitle: string }` |
| `ONBOARDING_STEP_COMPLETED`| Member finished an onboarding milestone. | `{ step: string }` |
| `CUSTOM_EVENT` | Domain or custom event dispatched via API. | User-defined payload |

---

## 2. Condition Operators

| Operator | Type Compatibility | Semantics |
| :--- | :--- | :--- |
| `EQUALS` | String, Number, Boolean | Exact equality (case-insensitive string comparison) |
| `NOT_EQUALS` | String, Number, Boolean | Inverted equality |
| `GREATER_THAN` | Number | Numeric strictly greater than |
| `GREATER_THAN_OR_EQUAL` | Number | Numeric greater than or equal |
| `LESS_THAN` | Number | Numeric strictly less than |
| `LESS_THAN_OR_EQUAL` | Number | Numeric less than or equal |
| `IN` | String, Number, Array | Element belongs to array |
| `NOT_IN` | String, Number, Array | Element does not belong to array |
| `CONTAINS` | String, Array | String substring or array contains value |
| `NOT_CONTAINS` | String, Array | Inverted substring or array exclusion |
| `BETWEEN` | Number | Closed interval $[value, valueTo]$ |
| `IS_TRUE` / `IS_FALSE` | Boolean | Boolean verification |
| `IS_NULL` / `IS_NOT_NULL` | Any | Null / undefined presence check |

---

## 3. Actions Taxonomy

| Action Type | Execution Target | Human Approval Supported |
| :--- | :--- | :--- |
| `SEND_COMMUNICATION` | Central Communication Engine (`CommunicationOrchestratorService`) | Yes (`requireApproval: true`) |
| `CREATE_STAFF_TASK` | Staff follow-up task queue (`RetentionOutreach`) | Yes |
| `SEND_IN_APP_NOTIFICATION` | In-app notification for member | No |
| `NOTIFY_ASSIGNED_TRAINER` | In-app push notification for assigned coach | No |
| `NOTIFY_MANAGER` | In-app escalation for outlet manager | No |
| `ADD_ENGAGEMENT_NOTE` | Internal engagement audit timeline | No |
| `ADD_MEMBER_TAG` | Member metadata tagging | No |
| `REMOVE_MEMBER_TAG` | Member metadata untagging | No |
| `DELAY` | Scheduled deferred step execution | No |

---

## 4. Safety & Cooldown Scopes

| Cooldown Scope | Scope Granularity |
| :--- | :--- |
| `MEMBER` | Member cannot trigger *any* workflow during the cooldown period. |
| `WORKFLOW` | The workflow cannot trigger for *any* member during the cooldown period. |
| `MEMBER_AND_WORKFLOW` (Default) | The member cannot trigger *this specific* workflow again within cooldown. |
| `ORGANISATION` | Organisation-wide execution rate limit. |

---

## 5. Non-Causal Analytics Taxonomy

| Metric | Definition |
| :--- | :--- |
| `subsequentVisitsFollowingWorkflow` | Total facility check-ins recorded for the member *after* workflow completion. |
| `subsequentBookingsFollowingWorkflow` | Total class/PT bookings made by the member *after* workflow completion. |
| `engagementTrendFollowingWorkflow` | Categorized as `INCREASED`, `STABLE`, `DECREASED`, or `INSUFFICIENT_DATA`. |

> [!IMPORTANT]
> Non-causal terminology is strictly mandated across all API responses, dashboards, and reports. Never state or imply that the workflow caused the outcome.
