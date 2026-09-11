# Incident Response Foundation

## Threat Response Runbooks

### 1. Token Compromise (Refresh Token Replay)
- **Detection**: Reusing an invalidated refresh token triggers `REFRESH_TOKEN_REUSE_DETECTED`.
- **Response**: Mark session `COMPROMISED`, revoke entire token family, raise HIGH alert, terminate session.
- **Audit**: Verify `SecurityEvent` and notify affected user via Communication Engine.

### 2. Brute-Force Attack
- **Detection**: 5 consecutive failed authentications trigger lockout.
- **Response**: Account key temporarily blocked for 15 minutes. Responses provide zero indication of whether the email exists.
- **Audit**: Log `LOGIN_FAILURE` and track IP addresses.

### 3. Mass Privilege Escalation Attempt
- **Detection**: Request attempting to alter security ceilings or self-assign admin roles.
- **Response**: Reject with 403, raise CRITICAL alert.
