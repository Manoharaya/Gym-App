# Workflow Builder & Simulation Guide

This guide explains how to construct, simulate, and publish automated engagement workflows.

---

## 1. Creating a Workflow

A workflow definition consists of:
1. **Metadata**: Name, description, category, approval mode.
2. **Trigger Configuration**: Trigger type, parameters, declarative leaf/compound conditions.
3. **Audience Filter**: Target member statuses, tenure ranges, assigned trainers, tags.
4. **Safety Policy**: Cooldown duration, cooldown scope, quiet hours settings.
5. **Stop Conditions**: Criteria that automatically halt in-progress workflows (e.g., check-in detected).
6. **Action Sequence**: Ordered list of actions, delays, parameters, and approval flags.

### Example: Creating via REST API

```http
POST /api/v1/automation/workflows
Content-Type: application/json
x-organisation-id: org_12345

{
  "name": "14-Day Inactivity Check-in",
  "description": "Engages inactive members with supportive check-in and staff follow-up.",
  "triggerType": "INACTIVITY_DAYS_REACHED",
  "approvalMode": "CONFIGURABLE",
  "triggerConfig": {
    "triggerType": "INACTIVITY_DAYS_REACHED",
    "parameters": { "inactivityDays": 14 },
    "conditions": {
      "field": "inactivityDays",
      "operator": "GREATER_THAN_OR_EQUAL",
      "value": 14,
      "fieldType": "NUMBER"
    }
  },
  "audienceFilter": {
    "membershipStatuses": ["ACTIVE"]
  },
  "stopConditions": {
    "stopIfActivityDetected": true
  },
  "safetyPolicy": {
    "cooldownHours": 168,
    "cooldownScope": "MEMBER_AND_WORKFLOW",
    "respectQuietHours": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00"
  },
  "actions": [
    {
      "id": "step_1_sms",
      "type": "SEND_COMMUNICATION",
      "params": {
        "channel": "SMS",
        "message": "Hi {{firstName}}, we missed you at the gym! Need any help getting back into your routine?",
        "messageNepali": "नमस्ते {{firstName}}, बितेका दुई हप्तामा तपाईंलाई जिममा देख्न पाइएन! आफ्नो दिनचर्या पुनः सुरु गर्न कुनै मद्दत चाहिन्छ?"
      },
      "requireApproval": false
    },
    {
      "id": "step_2_staff_task",
      "type": "CREATE_STAFF_TASK",
      "params": {
        "title": "Inactivity check-in: {{firstName}} {{lastName}}",
        "description": "Review workout history and give a gentle check-in call.",
        "priority": "MEDIUM"
      },
      "requireApproval": false
    }
  ]
}
```

---

## 2. Versioning & Immutability

- Every workflow is created with **Version 1** (`status: DRAFT`).
- When actions, trigger criteria, or safety policies are modified via `PATCH /workflows/:id`, the system creates a new immutable version snapshot (`EngagementWorkflowVersion`).
- Running instances maintain a reference to the version snapshot they were created with, ensuring deterministic execution without race conditions.

---

## 3. Simulation & Dry-Run Engine

Before publishing an engagement workflow, gym staff can simulate its execution against any real member profile without triggering real messages or tasks:

```http
POST /api/v1/automation/workflows/:id/dry-run
Content-Type: application/json

{
  "memberId": "member_abc",
  "triggerEventPayload": {
    "inactivityDays": 14
  }
}
```

### Dry-Run Output:
```json
{
  "workflowId": "wf_123",
  "memberId": "member_abc",
  "triggered": true,
  "triggerReason": "Matched trigger criteria",
  "conditionsEvaluated": [
    {
      "field": "inactivityDays",
      "operator": "GREATER_THAN_OR_EQUAL",
      "actualValue": 14,
      "expectedValue": 14,
      "passed": true
    }
  ],
  "actionsPlanned": [
    {
      "stepIndex": 0,
      "actionType": "SEND_COMMUNICATION",
      "params": { "channel": "SMS" },
      "willRequireApproval": false
    }
  ],
  "safeguardChecks": [
    {
      "check": "COOLDOWN_MEMBER_AND_WORKFLOW",
      "passed": true,
      "detail": "Cooldown satisfied: No instances in past 168h."
    }
  ],
  "outcome": "WOULD_EXECUTE"
}
```

---

## 4. Deploying Pre-configured Templates

Gyms can deploy any of the 7 pre-seeded templates with 1-click:

```http
POST /api/v1/automation/templates/instantiate
Content-Type: application/json

{
  "templateKey": "INACTIVE_MEMBER_14D",
  "customName": "Kathmandu Central 14D Inactive Flow"
}
```

---

## 5. AI Workflow Architect Assistant

Staff can generate workflows using natural language prompts:

```http
POST /api/v1/automation/ai/draft
Content-Type: application/json

{
  "intent": "Check in on members who missed their first scheduled workout with an encouraging message in Nepali and notify their trainer",
  "preferredTone": "SUPPORTIVE",
  "language": "ne"
}
```
The AI drafter produces deterministic configurations with pre-validated anti-shaming rules, quiet hours protection, and bilingual English/Nepali copy.
