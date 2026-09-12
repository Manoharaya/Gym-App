# Free Trials & Onboarding

Trial mechanics for new gym organisations evaluating FitCore.

## Configuration
- Plans define `trialDays` (default 14 days, configurable up to 30 or 60 days).
- When an organisation subscribes with `startTrial = true`, status is set to `TRIALING`.
- `trialStart` and `trialEnd` timestamps define the grace evaluation window.

## Trial Expiration
When a trial concludes:
- If valid payment credentials exist, the subscription transitions to `ACTIVE` and the initial billing invoice is issued.
- If no valid payment method is on file, status transitions to `EXPIRED` or `PAST_DUE`.
- FitCore never charges without explicit confirmation.
