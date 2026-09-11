# Security Event Telemetry

## Distinction: Audit Log vs Security Event
- **AuditLog**: Records business and administrative operations (who created an outlet, who edited a trainer's schedule).
- **SecurityEvent**: Records security telemetry and threat indicators (failed logins, token reuse, rate limiting, MFA activations).

---

## Severity Levels
- `INFO`: `LOGIN_SUCCESS`, `MFA_ENABLED`, `DEVICE_REGISTERED`
- `LOW`: `LOGIN_FAILURE`, `DEVICE_TRUSTED`, `SESSION_REVOKED`
- `MEDIUM`: `MFA_FAILURE`, `RECOVERY_CODE_USED`, `SECURITY_POLICY_CHANGED`
- `HIGH`: `REFRESH_TOKEN_REUSE_DETECTED`, `MFA_DISABLED`, `ACCOUNT_LOCKED`
- `CRITICAL`: `MASS_PERMISSION_ESCALATION`, `BRUTE_FORCE_BREACH_ATTEMPT`

---

## Metadata Sanitization Guarantee
The `SecurityEventService` filters and redacts all parameters containing keywords like `password`, `secret`, `token`, `refreshtoken`, `code`, or `authorization`. Plaintext secrets never enter the telemetry database.
