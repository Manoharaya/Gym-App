# Architecture Decision Record: Advanced Security Foundation (Day 52)

## Context
FitCore requires production-grade hardening for multi-outlet fitness enterprises. Vulnerabilities such as account takeover, token replay, credential stuffing, and session hijacking must be neutralized without disrupting existing business logic or creating fragmented authentication systems.

## Decision
1. **Extend Existing Auth & Policy Systems**: Do not build a second auth system or policy engine. Enhance existing `AuthService`, `Session`, and Day 51 `EnterprisePolicy`.
2. **Native Node.js Crypto for TOTP**: Implement RFC 6238 directly using Node's standard `crypto` module, eliminating external native dependency risks and ensuring zero secret leakage.
3. **AES-256-GCM Secret Encryption**: Encrypt all MFA secrets at rest using authenticated AES-256-GCM.
4. **Single-Use Refresh Token Rotation**: Invalidate old refresh tokens immediately on rotation; detect replay anomalies and terminate compromised token families.
5. **Fail-Closed Administrative IP Defense**: Default to DENY on administrative surfaces if IP policy resolution cannot determine trust state.
6. **Step-Up Authentication**: Enforce short-lived, single-use `SecurityActionChallenge` tokens for high-risk mutations.

## Consequences
- Elevates security posture to enterprise compliance readiness.
- Hardens against replay and credential theft.
- Establishes clean hooks for Day 53 Privacy & Compliance Center.
