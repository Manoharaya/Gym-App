# Enterprise Security Policies

## Policy Integration
Day 52 security policies integrate seamlessly with Day 51 `EnterprisePolicy` architecture under category `SECURITY`.

---

## Supported Policy Keys
1. `mfaRequirement`:
   - `OPTIONAL`: Users choose whether to enable MFA.
   - `REQUIRED_FOR_ADMIN`: Mandatory for all managerial and administrative roles.
   - `REQUIRED_FOR_FINANCE`: Mandatory for billing and payment operators.
   - `REQUIRED_FOR_ALL`: Mandatory across the entire organization.
2. `sessionIdleTimeoutMinutes`: Idle period before requiring re-authentication (default 60m).
3. `sessionMaxDurationHours`: Absolute maximum session lifetime (default 12h).
4. `maxFailedLogins`: Maximum invalid attempts before lockout (default 5).
5. `lockoutDurationMinutes`: Lockout duration (default 15m).
6. `stepUpRequiredForSensitiveActions`: Requires re-auth or MFA code before high-risk changes.
