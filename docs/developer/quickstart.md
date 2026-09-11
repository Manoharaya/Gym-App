# FitCore Developer Quick Start Guide

Get up and running with the FitCore Public API in 5 minutes.

---

## 1. Create a Developer Application

In the FitCore Developer Portal (or via API):

```bash
curl -X POST https://api.fitcore.io/api/v1/developer/applications \
  -H "Authorization: Bearer <YOUR_ADMIN_SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Gym Companion",
    "environment": "SANDBOX",
    "allowedScopes": ["members:read", "classes:read", "bookings:read", "bookings:write"]
  }'
```

Save the generated `clientId` (e.g. `fc_client_xxxx`) and `clientSecret` (e.g. `fc_sec_xxxx`). Note that `clientSecret` is only shown once.

---

## 2. Generate a Sandbox API Key

```bash
curl -X POST https://api.fitcore.io/api/v1/developer/applications/fc_client_xxxx/api-keys \
  -H "Authorization: Bearer <YOUR_ADMIN_SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Development Key",
    "environment": "SANDBOX",
    "scopes": ["classes:read", "bookings:write"]
  }'
```

Response:
```json
{
  "apiKey": {
    "keyPrefix": "fc_test_90fa31...",
    "environment": "SANDBOX",
    "status": "ACTIVE"
  },
  "plainKey": "fc_test_90fa31e45902bc4a81d723..."
}
```

---

## 3. Make Your First Public API Request

Query all scheduled gym classes:

```bash
curl -X GET https://api.fitcore.io/api/v1/public/classes \
  -H "X-Api-Key: fc_test_90fa31e45902bc4a81d723..."
```

Response:
```json
{
  "data": [
    {
      "id": "cls_101",
      "name": "Morning Functional Strength",
      "classType": "STRENGTH",
      "trainerName": "Coach Sarah",
      "roomName": "Studio A",
      "startsAt": "2026-09-12T07:00:00.000Z",
      "endsAt": "2026-09-12T07:45:00.000Z",
      "capacity": 15,
      "bookedCount": 8,
      "isFull": false,
      "status": "SCHEDULED"
    }
  ],
  "meta": {
    "requestId": "req_1726058000_abc",
    "page": 1,
    "limit": 20,
    "total": 1,
    "hasMore": false
  }
}
```

---

## 4. Book a Class Session (Idempotent)

```bash
curl -X POST https://api.fitcore.io/api/v1/public/bookings \
  -H "X-Api-Key: fc_test_90fa31e45902bc4a81d723..." \
  -H "Idempotency-Key: my_unique_order_ref_992" \
  -H "Content-Type: application/json" \
  -d '{
    "classSessionId": "cls_101",
    "memberId": "mem_001"
  }'
```

---

## 5. Move to Production

1. Review granted scopes for Least Privilege.
2. Generate a Production API key (`fc_live_...`).
3. Configure your HTTPS webhook endpoint.
4. Verify HMAC signatures using your webhook secret.
