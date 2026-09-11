# Session Lifecycle & Security

## Overview
FitCore enforces server-side session management coupled with short-lived JWT access tokens and rotatable refresh tokens.

---

## Session Model
Each session in `Session` (`sessions`) tracks:
- `id`: CUID identifier
- `userId`: Bound user
- `organisationId`: Current tenant scope
- `status`: `ACTIVE`, `EXPIRED`, `REVOKED`, `COMPROMISED`
- `authMethod`: `PASSWORD`, `MFA`, `OAUTH`, `API_KEY`
- `mfaVerified`: Boolean set only after successful MFA verification
- `deviceId`: Bound device fingerprint
- `lastUsedAt`: Timestamp of last activity
- `expiresAt`: Absolute expiration deadline

---

## Session Revocation
- **Single Session**: Terminates target session and its refresh tokens.
- **Revoke Other Sessions**: Terminates all sessions except the caller's active session.
- **Revoke All Sessions**: Required on password changes or security method modifications.
- **Device Revocation**: Unlinking a device terminates all sessions associated with that device.
