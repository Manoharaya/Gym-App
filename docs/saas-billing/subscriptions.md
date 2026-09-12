# Subscriptions Lifecycle

Organisation SaaS subscription state machine and operational transitions.

## Subscription State Machine
- `TRIALING`: Organization is exploring FitCore under an active trial period (typically 14 or 30 days).
- `ACTIVE`: Normal operating subscription in good standing.
- `PAST_DUE`: Invoice payment failed; dunning retry sequence is active.
- `PAUSED`: Temporarily paused subscription.
- `SUSPENDED`: Administrative platform features restricted due to extended delinquency. (Members retain door access).
- `CANCEL_AT_PERIOD_END`: Marked for termination at conclusion of current billing period.
- `CANCELLED`: Subscription terminated.
- `EXPIRED`: Completed trial or replaced by newer upgraded subscription.

## Transition Rules
Transitions must be explicit via authenticated backend services. Direct frontend PATCH manipulation of statuses is strictly rejected.
