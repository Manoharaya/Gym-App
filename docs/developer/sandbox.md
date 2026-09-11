# FitCore Developer Sandbox & Synthetic Datasets

## 1. Overview
The FitCore Sandbox environment provides a safe, fully functional clone of the FitCore platform where developers can experiment, build, and test applications without affecting real gym members, charging real credit cards, or mutating production timetables.

## 2. Sandbox Key Characteristics
- **API Keys**: Prefixed with `fc_test_...`
- **Data Isolation**: Synthetic member records, simulated instructors, test class schedules, and mock check-in scans.
- **Payment Mocking**: All Stripe/payment flows automatically succeed in test mode without financial settlement.
- **Safe Webhooks**: Webhook test triggers send simulated event payloads tagged with `"test": true` containing zero member PII.
- **Rate Limit Tier**: Evaluated under the `SANDBOX` tier (60 requests/minute).

## 3. Checking Sandbox Status
Developers can inspect the state of their sandbox environment and available synthetic datasets:

```http
GET /api/v1/developer/sandbox/status HTTP/1.1
Authorization: Bearer <Admin_or_Developer_JWT>
```

Response:
```json
{
  "success": true,
  "data": {
    "environment": "SANDBOX",
    "ready": true,
    "syntheticDatasets": {
      "members": 50,
      "classes": 12,
      "trainers": 8,
      "membershipPlans": 4
    },
    "features": {
      "mockPayments": true,
      "safeWebhooks": true,
      "isolatedTenancy": true
    }
  }
}
```
