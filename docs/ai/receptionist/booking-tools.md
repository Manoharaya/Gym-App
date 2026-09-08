# Day 32 — AI Receptionist Booking Tools Specification

This document details the complete interface, validation rules, risk classification, and execution semantics for all 7 booking tools in the FitCore AI Receptionist suite.

---

## 1. Tool Risk Classification Matrix

To maintain zero-trust security and prevent unauthorized or unintended mutations, all receptionist tools are categorized into strict risk tiers:

| Tool Name | Operation Type | Risk Tier | Requires Confirmation Token | Authentication Level Required |
| :--- | :--- | :--- | :--- | :--- |
| `search_class_availability` | Read-only Discovery | **LOW** | No | Prospect or Member |
| `get_booking_details` | Read-only Query | **LOW** | No | Verified Member (Owner) |
| `dry_run_booking` | Simulation Mode | **LOW** | No | Staff / Verified Member |
| `join_waitlist` | State Mutation | **MEDIUM** | Yes | Verified Member |
| `create_booking` | State Mutation | **HIGH** | Yes | Verified Member |
| `cancel_booking` | State Mutation | **HIGH** | Yes | Verified Member (Owner) |
| `reschedule_booking` | State Mutation | **HIGH** | Yes | Verified Member (Owner) |

---

## 2. Tool Specifications

### 2.1. `search_class_availability`

Discovers upcoming class sessions across one or more outlets with dynamic real-time capacity and status calculation.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "outletId": {
      "type": "string",
      "description": "Specific outlet UUID. If omitted in multi-outlet orgs, triggers outlet clarification."
    },
    "className": {
      "type": "string",
      "description": "Fuzzy or exact class type name (e.g., 'HIIT', 'Yoga', 'Pilates')."
    },
    "category": {
      "type": "string",
      "description": "Category filter (e.g., 'Cardio', 'Strength', 'Mind & Body')."
    },
    "trainerName": {
      "type": "string",
      "description": "Trainer name or keyword."
    },
    "date": {
      "type": "string",
      "description": "ISO date string (YYYY-MM-DD) or relative expression ('today', 'tomorrow', 'next monday')."
    },
    "timeRange": {
      "type": "string",
      "enum": ["MORNING", "AFTERNOON", "EVENING", "ALL_DAY"],
      "description": "Time of day window."
    },
    "memberProfileId": {
      "type": "string",
      "description": "Optional member profile UUID to attach personalized eligibility flags to each session."
    }
  }
}
```

#### Output Schema
```json
{
  "sessions": [
    {
      "sessionId": "cs_abc123",
      "className": "Morning HIIT",
      "category": "Cardio",
      "trainerName": "Sarah Trainer",
      "outletName": "Downtown Club",
      "startsAt": "2026-09-09T07:00:00Z",
      "endsAt": "2026-09-09T07:45:00Z",
      "durationMinutes": 45,
      "capacity": 20,
      "confirmedBookings": 12,
      "spotsRemaining": 8,
      "status": "AVAILABLE",
      "waitlistAllowed": true,
      "waitlistCount": 0,
      "eligibility": {
        "eligible": true,
        "reason": "ELIGIBLE"
      }
    }
  ],
  "totalAvailable": 1,
  "requiresOutletClarification": false,
  "availableOutlets": []
}
```

---

### 2.2. `get_booking_details`

Fetches authoritative booking details including session status and cancellation policy evaluation.

#### Input Schema
```json
{
  "type": "object",
  "required": ["bookingId", "memberProfileId"],
  "properties": {
    "bookingId": {
      "type": "string",
      "description": "UUID of the existing booking."
    },
    "memberProfileId": {
      "type": "string",
      "description": "UUID of the member profile requesting details. Enforces tenant and IDOR isolation."
    }
  }
}
```

#### Output Schema
```json
{
  "bookingId": "bk_789xyz",
  "status": "CONFIRMED",
  "className": "Morning HIIT",
  "startsAt": "2026-09-09T07:00:00Z",
  "trainerName": "Sarah Trainer",
  "outletName": "Downtown Club",
  "cancellationPolicy": {
    "canCancel": true,
    "policyWindowHours": 2,
    "deadline": "2026-09-09T05:00:00Z",
    "feeApplies": false,
    "explanation": "Cancellation is allowed up to 2 hours before start."
  }
}
```

---

### 2.3. `create_booking`

Executes a confirmed booking reservation using a verified, single-use confirmation state token.

#### Input Schema
```json
{
  "type": "object",
  "required": ["confirmationToken", "memberProfileId"],
  "properties": {
    "confirmationToken": {
      "type": "string",
      "description": "Cryptographically secure single-use confirmation token."
    },
    "memberProfileId": {
      "type": "string",
      "description": "Verified member profile UUID."
    },
    "notes": {
      "type": "string",
      "description": "Optional notes or requirements from the customer."
    }
  }
}
```

#### Output Schema
```json
{
  "status": "CONFIRMED",
  "bookingId": "bk_12345",
  "className": "Morning HIIT",
  "startsAt": "2026-09-09T07:00:00Z",
  "outletName": "Downtown Club",
  "spotsRemaining": 7,
  "verifiedAt": "2026-09-08T10:30:00Z",
  "instructions": "Please arrive 10 minutes early."
}
```

---

### 2.4. `cancel_booking`

Cancels an existing booking within or outside the policy window after confirmation token validation.

#### Input Schema
```json
{
  "type": "object",
  "required": ["confirmationToken", "memberProfileId"],
  "properties": {
    "confirmationToken": {
      "type": "string",
      "description": "Cryptographically secure single-use confirmation token for CANCEL_BOOKING."
    },
    "memberProfileId": {
      "type": "string",
      "description": "Verified member profile UUID."
    },
    "reason": {
      "type": "string",
      "description": "Reason for cancellation provided by customer."
    }
  }
}
```

#### Output Schema
```json
{
  "status": "CANCELLED",
  "bookingId": "bk_789xyz",
  "className": "Morning HIIT",
  "startsAt": "2026-09-09T07:00:00Z",
  "lateCancellation": false,
  "feeCharged": 0,
  "verifiedAt": "2026-09-08T10:35:00Z"
}
```

---

### 2.5. `reschedule_booking`

Atomically transitions a booking from one class session to another. If target session validation or booking fails, the original spot is preserved.

#### Input Schema
```json
{
  "type": "object",
  "required": ["confirmationToken", "memberProfileId"],
  "properties": {
    "confirmationToken": {
      "type": "string",
      "description": "Single-use confirmation token for RESCHEDULE_BOOKING."
    },
    "memberProfileId": {
      "type": "string",
      "description": "Verified member profile UUID."
    }
  }
}
```

#### Output Schema
```json
{
  "status": "CONFIRMED",
  "originalBookingId": "bk_old_111",
  "newBookingId": "bk_new_222",
  "className": "Morning HIIT Reschedule Target",
  "newStartsAt": "2026-09-10T09:00:00Z",
  "verifiedAt": "2026-09-08T10:40:00Z"
}
```

---

### 2.6. `join_waitlist`

Adds an authenticated member to the waitlist of a full class session.

#### Input Schema
```json
{
  "type": "object",
  "required": ["confirmationToken", "memberProfileId"],
  "properties": {
    "confirmationToken": {
      "type": "string",
      "description": "Single-use confirmation token for WAITLIST_JOIN."
    },
    "memberProfileId": {
      "type": "string",
      "description": "Verified member profile UUID."
    }
  }
}
```

#### Output Schema
```json
{
  "status": "WAITLISTED",
  "waitlistEntryId": "wl_999",
  "position": 1,
  "className": "Vinyasa Flow Yoga",
  "startsAt": "2026-09-09T17:00:00Z",
  "verifiedAt": "2026-09-08T10:45:00Z"
}
```

---

### 2.7. `dry_run_booking`

Simulates the entire booking lifecycle pipeline with zero side effects. No database mutations are committed.

#### Input Schema
```json
{
  "type": "object",
  "required": ["classSessionId"],
  "properties": {
    "classSessionId": {
      "type": "string",
      "description": "Target class session UUID."
    },
    "memberProfileId": {
      "type": "string",
      "description": "Optional member profile UUID to test against."
    }
  }
}
```

#### Output Schema
```json
{
  "identityStatus": "VERIFIED",
  "availabilityStatus": "AVAILABLE",
  "eligibilityStatus": "ELIGIBLE",
  "confirmationRequired": true,
  "productionSideEffect": "NONE",
  "sessionSnapshot": {
    "sessionId": "cs_abc123",
    "name": "Morning HIIT",
    "capacity": 20,
    "spotsRemaining": 8
  }
}
```
