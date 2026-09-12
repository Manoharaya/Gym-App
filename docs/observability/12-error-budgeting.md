# 12 — Error Budgeting Policy

## Concept
Error budgets quantify the acceptable level of failure over a rolling 30-day window:
$$\text{Error Budget} = 100\% - \text{Target SLO}$$
For a 99.95% API availability target, the error budget is 0.05% (equivalent to ~21.6 minutes of downtime per 30 days).

## Burn Rate Alerts
- **1x Burn Rate**: Consumes budget at expected rate. No page.
- **6x Burn Rate**: Consumes 10% of budget in 12 hours. Warning notification.
- **14.4x Burn Rate**: Consumes 2% of budget in 1 hour. PagerDuty on-call alert.

## Engineering Policy on Budget Exhaustion
If the error budget drops below 10%:
1. Feature deployments and non-essential releases are paused.
2. Engineering focus shifts exclusively to reliability, bug fixes, query optimization, and infrastructure hardening.
3. Post-mortem review required prior to lifting deployment freeze.
