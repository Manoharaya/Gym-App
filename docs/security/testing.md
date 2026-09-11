# Security Testing Strategy

## Test Domains
1. **MFA Lifecycle**: TOTP enrollment, clock tolerance (±30s), recovery code single-use, regeneration, brute-force lockout.
2. **Session Security**: Session creation, individual revocation, revoke-all, refresh token rotation, token replay anomaly detection.
3. **Device Management**: Fingerprinting, trust toggling, device revocation, MFA bypass prevention on trusted devices.
4. **IP Restrictions**: CIDR validation, allowlist/denylist matching, hierarchical inheritance, hard ceilings, fail-closed on administrative surfaces.
5. **Step-Up Authentication**: Short-lived challenge generation, verification via password/MFA, single-use consumption.
6. **Telemetry & Alerts**: Event logging, metadata sanitization verification, alert workflows.
7. **Tenant Isolation**: Proof that Org A cannot view or mutate Org B security resources.
