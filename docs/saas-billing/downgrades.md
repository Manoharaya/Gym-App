# Plan Downgrades & Conflict Prevention

Safe, conflict-aware tier reductions.

## Invariant: No Silent Destruction
When an organisation requests a downgrade to a plan with lower limits (e.g. from 15 outlets down to 1 outlet, or from 5,000 members down to 500 members):
1. The engine checks active database counts across outlets, members, staff, and developer apps.
2. If active resources exceed target plan quotas, the downgrade is **BLOCKED** (`DOWNGRADE_BLOCKED`).
3. Actionable error messages inform the gym administrator exactly which resources must be archived or consolidated prior to downgrade.
4. FitCore never silently deletes clubs, members, or user data.
