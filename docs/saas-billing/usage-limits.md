# Usage Limits & Guardrails

Real-time limit checking and guardrail evaluations.

## Centralized Limit Verification
All resource creation commands in the platform (e.g., creating a new outlet, enrolling a member, spawning an AI conversational session) verify quotas via `SaasUsageLimitService`:

```typescript
const check = await this.saasLimitService.checkOutletLimit(orgId);
if (!check.allowed) {
  throw new ForbiddenException(check.reason);
}
```

## Fail-Closed Paradigm
If an organisation’s subscription cannot be verified or an entitlement definition is missing from an active plan, the engine fails closed with status `PLAN_REQUIRED`.
