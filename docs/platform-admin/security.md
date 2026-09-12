# Superadmin Security Controls & Boundaries

## Security Guardrails
Platform operators are bound by strict security boundaries:
1. **No Direct DB Access**: All operations must execute through domain services and write audit logs.
2. **Step-Up Authentication**: High-risk actions require `SecurityActionChallenge` verification:
   - `SUSPEND_ORGANISATION`
   - `TOGGLE_CRITICAL_FEATURE_FLAG`
   - `CHANGE_PLATFORM_CONFIG`
   - `SUPPORT_ACCESS_APPROVAL`
   - `BREAK_GLASS_ACCESS`
3. **MFA Enforced**: Superadmin accounts must enforce hardware key or TOTP MFA.
4. **IP Access Policies**: Superadmin routes are protected by enterprise IP allowlists.

## Security Event Telemetry
Mutations generate high-fidelity `SecurityEvent` records:
- `SUPERADMIN_LOGIN`
- `SUPERADMIN_ACTION`
- `ORGANISATION_SUSPENDED`
- `ORGANISATION_REACTIVATED`
- `SUPPORT_ACCESS_GRANTED`
- `SUPPORT_ACCESS_REVOKED`
- `BREAK_GLASS_ACCESS`
- `FEATURE_FLAG_CHANGED`
- `PLATFORM_CONFIG_CHANGED`
