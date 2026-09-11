# Authentication Risk Detection

## Purpose
`AuthenticationRiskService` provides deterministic, signal-based evaluation of incoming login and access attempts.

---

## Evaluated Signals
1. `REFRESH_TOKEN_REUSE`: Score +90 (Immediate session termination).
2. `EXCESSIVE_FAILED_ATTEMPTS`: Score +50 (Account protection lockout).
3. `NEW_UNTRUSTED_DEVICE`: Score +20 (Triggers step-up/MFA challenge).
4. `ADMIN_ACCOUNT_ACCESS`: Score +15 (Elevated scrutiny for administrative roles).
5. `RECENT_HIGH_SEVERITY_SECURITY_EVENTS`: Score +25 (Recent security incidents for this user).

---

## Risk Levels & Actions
| Risk Score | Risk Level | Recommended Action |
|:---|:---|:---|
| 0–24 | `LOW` | `ALLOW` |
| 25–49 | `MODERATE` | `REQUIRE_MFA` |
| 50–79 | `HIGH` | `REQUIRE_MFA` / `CHALLENGE` |
| 80–100 | `CRITICAL` | `LOCK_ACCOUNT` / `REVOKE_SESSION` |
