# Wearables Integration API Documentation

All endpoints are rooted under `/api/v1/wearables` and require a valid Bearer JWT.

## 1. Provider Capabilities
- `GET /api/v1/wearables/providers`
  - Returns supported wearable platforms with Wave 1 vs Wave 2 status and capability matrices.
- `GET /api/v1/wearables/providers/:provider`
  - Returns capability metadata for a specific provider.

## 2. Connection Lifecycle
- `POST /api/v1/wearables/connect`
  - Connects a wearable provider.
  - Enforces Day 4 `WEARABLE_DATA` consent.
  - Encrypts access tokens and refresh tokens via AES-256-GCM.
- `GET /api/v1/wearables/connections`
  - Lists active wearable connections for the calling member.
- `GET /api/v1/wearables/connections/:id`
  - Retrieves detailed connection metadata and sync status.
- `POST /api/v1/wearables/connections/:id/sync`
  - Triggers data sync. Accepts optional native SDK batches (`records`).
  - Completely idempotent.
- `POST /api/v1/wearables/connections/:id/reauthorize`
  - Reauthorizes an expired or disconnected provider.
- `POST /api/v1/wearables/connections/:id/disconnect`
  - Disconnects provider and invalidates credentials.

## 3. Health Telemetry Queries & Summaries
- `GET /api/v1/wearables/data`
  - Query paginated normalized telemetry records with filters (`dataType`, `provider`, `startDate`, `endDate`, `page`, `limit`).
- `GET /api/v1/wearables/data/summary`
  - Retrieves deterministic daily and weekly aggregated metrics.

## 4. Privacy Transparency & Self-Service Deletion
- `GET /api/v1/wearables/privacy`
  - Returns member privacy view (active consent, held categories, trainer visibility rules, retention policies).
- `DELETE /api/v1/wearables/data`
  - Self-service data deletion foundation for Day 49 Privacy Centre (`connectionId` or `provider` or full member purge).

## 5. Trainer Client Scoped Telemetry
- `GET /api/v1/wearables/trainer/client/:memberId`
  - Returns high-level summarized activity for assigned personal training client.
  - Requires active `TrainerClientAssignment`.
