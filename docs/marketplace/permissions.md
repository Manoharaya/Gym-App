# Marketplace Permissions & Health PII Isolation

## 1. Permission Catalog
Marketplace applications request granular, least-privilege permissions:
* `members:read` / `members:write`: Access member profiles, contact info, and status.
* `bookings:read` / `bookings:write`: Query and schedule personal training sessions and class reservations.
* `classes:read` / `classes:write`: View timetable, instructor schedules, and capacities.
* `checkins:read` / `checkins:write`: Record and validate physical access events.
* `payments:read` / `payments:write`: Invoicing summaries and transaction logs.
* `communications:send`: Send notifications, SMS, or emails to members.
* `devices:access`: Hardware reader communication and IoT telemetry.
* `webhooks:receive`: Subscribe to platform events.

## 2. Sensitive Health PII Isolation Boundary
Biometric, wearable, and medical survey data is quarantined under:
* `health:parq:read`
* `health:biometrics:read`
* `health:wearables:read`

### Strict Medical Quarantine Rules:
1. An organization installing a marketplace application **CANNOT** grant carte-blanche access to member medical histories or live wearable biometrics.
2. The installation dialog mandates explicit legal acknowledgment (`consentHealthPii: true`).
3. Even when consented at the tenant level, individual members must grant direct per-user consent through their mobile application before biometric streams are accessed.
