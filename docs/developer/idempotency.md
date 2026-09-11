# FitCore API Idempotency Guide

## 1. Overview
Network blips, client timeouts, and mobile retry logic can inadvertently dispatch duplicate mutating requests. FitCore enforces strict idempotency on state-changing operations (such as class and personal training bookings) using the `Idempotency-Key` HTTP header.

## 2. Header Usage
When making mutating requests, generate a unique V4 UUID or deterministic transaction ID:

```http
POST /api/v1/public/bookings HTTP/1.1
Host: api.fitcore.com
X-Api-Key: fc_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d
Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
Content-Type: application/json

{
  "classSessionId": "sess_morning_hiit_101",
  "memberId": "mem_john_developer_202"
}
```

## 3. Idempotency Behavior
1. **First Attempt**: The system executes the booking logic against the authoritative `BookingService`. The result is committed to the database and cached alongside the idempotency key for 24 hours.
2. **Subsequent Attempts (Identical Key & Parameters)**: The system immediately detects the existing operation and returns the previously generated booking record with HTTP 201/200, without double-booking or debiting member credits a second time.
3. **Concurrent Execution Defense**: If two identical requests arrive at the exact same millisecond, FitCore's distributed lock guarantees only one processes while the other waits or receives a conflict notification.
