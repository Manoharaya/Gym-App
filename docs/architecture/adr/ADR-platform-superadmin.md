# ADR: Platform Superadmin & Platform Operations Control Plane

## Status
Accepted

## Date
2026-09-12

## Context
As FitCore scales across hundreds of multi-outlet fitness organisations, platform operators require a centralized control plane to inspect tenant health, meter capacity usage, govern AI token volume and costs, manage customer support tickets, control feature flag rollouts, and execute emergency interventions.

Historically, naive administration panels grant unrestricted database access or bypass tenant isolation and security policies. In a high-compliance, privacy-centric health and fitness platform (HIPAA, GDPR, CCPA), unrestricted admin access is unacceptable and creates unacceptable security liabilities.

## Decision
1. **Control Plane, Not Backdoor**:
   The Platform Superadmin layer operates exclusively as an observation and orchestration control plane. It calls existing domain services and never bypasses RBAC, MFA, tenant isolation, or data privacy rules.
2. **Explicit Platform Permissions**:
   Users with the `SUPERADMIN` role are not implicitly omnipotent. Explicit permissions (e.g. `platform.organisations.manage`, `platform.support.manage`, `platform.feature_flags.manage`) and platform scopes (`GLOBAL`, `ORGANISATION`, `OUTLET`, `FUNCTIONAL`) are enforced server-side.
3. **High-Risk Step-Up Verification**:
   Sensitive operational actions (suspending an organisation, toggling critical security flags, modifying platform config, approving support/break-glass access) require single-use `SecurityActionChallenge` tokens.
4. **Time-Limited Support Access**:
   Permanent impersonation is forbidden. Platform engineers receive time-bounded (5–240 min), purpose-justified, auditable temporary access.
5. **Privacy Redaction Invariant**:
   Platform operators inspect aggregate metrics, latency logs, and system health. Member medical documents, PAR-Q surveys, raw biometric feeds, and payment credentials remain strictly redacted.

## Consequences
- **Positive**: Complete operational transparency, audited governance, zero accidental PII leakage, zero backdoors.
- **Trade-off**: High-risk actions require step-up verification, requiring operators to confirm credentials or MFA before executing critical mutations.
