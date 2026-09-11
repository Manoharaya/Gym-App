# FitCore Webhooks Guide

## 1. Overview
FitCore Webhooks provide real-time asynchronous push notifications when business events occur inside gym facilities (e.g. new bookings, member cancellations, check-in scans).

## 2. Supported Event Types

| Event Type | Description |
| :--- | :--- |
| `booking.created` | Emitted whenever a member reserves a class spot or personal training session |
| `booking.cancelled` | Emitted when a booking is cancelled by member or staff |
| `member.created` | Emitted upon new member onboarding and registration |
| `member.updated` | Emitted when member profile or contact information changes |
| `attendance.checked_in` | Emitted when a member scans their barcode or badge at gym turnstiles |
| `class.scheduled` | Emitted when a new class session is added to the timetable |
| `class.cancelled` | Emitted if an instructor or studio cancels a class |
| `membership.purchased` | Emitted upon successful membership tier enrollment |

## 3. Webhook Payload Structure
All webhook deliveries adhere to the standard FitCore event envelope:

```json
{
  "id": "evt_1726054890_987654",
  "eventType": "booking.created",
  "organisationId": "org_abc123",
  "timestamp": "2026-09-11T07:00:00.000Z",
  "environment": "PRODUCTION",
  "data": {
    "bookingId": "bk_112233",
    "memberId": "mem_445566",
    "classSessionId": "sess_778899",
    "status": "CONFIRMED"
  }
}
```

## 4. Testing Webhooks in Sandbox
You can trigger safe test webhook deliveries directly from the Developer Console or API:
```bash
POST /api/v1/developer/webhooks/:webhookId/test
```
The test payload contains `"test": true` and synthetic data with zero real member PII, allowing you to safely verify your endpoint's signature verification and HTTP parsing.
