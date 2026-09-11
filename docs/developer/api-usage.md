# FitCore API Usage Analytics & Observability

## 1. Overview
The Developer Platform automatically collects fine-grained telemetry for every API call to give gym developers and franchise administrators total visibility into traffic patterns, latency percentiles, error spikes, and endpoint utilization.

## 2. Aggregated Analytics Endpoint
Query aggregated analytics for a developer application across any time window:

```http
GET /api/v1/developer/applications/:applicationId/analytics?from=2026-09-01T00:00:00Z&to=2026-09-11T00:00:00Z HTTP/1.1
Authorization: Bearer <Admin_JWT>
```

Response:
```json
{
  "success": true,
  "data": {
    "totalRequests": 14250,
    "successRequests": 14108,
    "errorRequests": 142,
    "averageLatencyMs": 42.6,
    "topEndpoints": [
      { "endpoint": "/api/v1/public/classes", "count": 8200 },
      { "endpoint": "/api/v1/public/members", "count": 3950 },
      { "endpoint": "/api/v1/public/bookings", "count": 2100 }
    ],
    "statusCodeDistribution": {
      "200": 13908,
      "201": 200,
      "400": 45,
      "401": 32,
      "429": 65
    }
  }
}
```

## 3. Developer Request Logs (Zero Credential Leaks)
Inspect the most recent 100 API requests executed under an application:

```http
GET /api/v1/developer/applications/:applicationId/logs HTTP/1.1
Authorization: Bearer <Admin_JWT>
```

### Redaction Guarantees:
Every logged request is strictly cleansed:
- Raw API keys are redacted (e.g. `fc_live_...9876`).
- OAuth Bearer tokens, secrets, client credentials, and passwords are permanently stripped before persistence.
- Health PII and credit card payloads are never written to audit tables.
