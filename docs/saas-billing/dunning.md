# SaaS Dunning & Collections

Managing failed SaaS invoice payments gracefully.

## Distinct From Member Dunning
Gym member recurring billing (Day 42) deals with consumer gym dues. Day 55 SaaS Dunning deals strictly with **FitCore billing the Gym Organisation**.

## Retry Schedule & Grace Period
- Standard Retry Sequence: Day 0 (Immediate), Day 2, Day 5, Day 8.
- Configurable `gracePeriodDays` (default 7 days).
- If payment remains uncollected after grace expiration, status transitions to `SUSPENDED`.

## Member Protection Guarantee
SaaS suspension restricts administrative platform access (reporting, bulk exports, configuring new classes). It **NEVER** immediately revokes physical door credentials or locks gym members out of clubs.
