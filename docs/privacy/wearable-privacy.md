# Wearable Privacy & Data Governance

## 1. Provider Isolation & Disconnection
When a member disconnects an active wearable (Apple HealthKit, Google Health Connect, Garmin, Whoop, Fitbit):
- Future synchronization is stopped immediately.
- Stored OAuth access and refresh tokens are wiped from the database.
- An audit event is recorded.
- Historical biometric records remain subject to the configured 2-year retention policy unless explicit deletion is initiated.

## 2. Zero Credential Exposure
Client applications never receive raw provider tokens, client secrets, or OAuth credentials. Only high-level connection statuses (`CONNECTED`, `DISCONNECTED`, `SYNC_ERROR`) and telemetry summaries are surfaced.
