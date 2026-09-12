# Platform Feature Flags & Deterministic Rollout Engine

## Scope & Inheritance
Feature flags support multi-level evaluation:
```text
Platform Default
    ↓
Organisation Override
    ↓
Outlet Override
    ↓
User Override (Highest Priority)
```

## Rollout Strategies
1. **ALL**: Enabled globally for all entities.
2. **NONE**: Disabled globally.
3. **SELECTED_ORGANISATIONS**: Explicit assignment records for targeted gyms.
4. **SELECTED_OUTLETS**: Branch-specific rollouts.
5. **PERCENTAGE**: Deterministic percentage rollout (0% to 100%).

## Deterministic Hashing
Percentage evaluation uses deterministic SHA-256 hashing:
```text
hash = SHA256(`${flagKey}:${entityId}`)
score = parseInt(hash.substring(0, 8), 16) % 100
enabled = score < rolloutPercentage
```
This guarantees that a given member or organisation consistently receives the same feature status across requests without random flickering.

## Security Ceiling Protection
Feature flags cannot bypass authentication, authorization, tenant isolation, or data protection ceilings. Prohibited flag keys include:
- `security.bypass_auth`
- `security.disable_mfa`
- `security.disable_tenant_isolation`
- `privacy.disable_consent`
- `billing.bypass_payment`

Toggling security-critical flags requires step-up authentication.
