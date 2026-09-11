# Privacy Incident & Telemetry Foundation

## 1. Security Event Telemetry
Privacy actions automatically emit security events through Day 52's `SecurityEventService`:
- `PRIVACY_REQUEST_CREATED`
- `PRIVACY_REQUEST_VERIFIED`
- `PRIVACY_EXPORT_STARTED`
- `PRIVACY_EXPORT_COMPLETED`
- `PRIVACY_EXPORT_DOWNLOADED`
- `DELETION_REQUEST_CREATED`
- `DELETION_COMPLETED`
- `CONSENT_GRANTED`
- `CONSENT_WITHDRAWN`
- `RETENTION_HOLD_CREATED`
- `RETENTION_HOLD_RELEASED`

## 2. Redaction Invariants
Telemetry metadata strictly redacts:
- Plaintext health questionnaire answers
- Clinical clearance document bodies
- Passwords, MFA secrets, or recovery codes
- Export artifact payloads
- Credit card payment details
