# Outlet Health Evaluation & Attention Flag Architecture

## 1. 8-Dimension Objective Health Framework

FitCore evaluates outlet operational health across eight clearly defined, explainable dimensions. Every dimension score is deterministic, mathematical, and grounded in domain facts:

| Dimension Key | Evaluated Signals | Optimal Benchmark | Warning Condition | Attention Required Trigger |
| :--- | :--- | :--- | :--- | :--- |
| `MEMBERSHIP` | Net member change, growth rate | Positive net growth | Net growth < 0 | Severe contraction (> 5% base decline) |
| `SALES` | Inbound leads, conversion rate | Conversion >= 25% | Conversion < 10% or 0 leads | Sustained 0 leads across period |
| `FINANCE` | Net revenue, refund volume | Refund rate < 5% | Refund rate > 15% | Zero collected revenue for active base |
| `ATTENDANCE` | Facility visits per member | >= 2.0 visits/member | < 1.0 visits/member | < 0.5 visits/member (dormancy wave) |
| `BOOKING` | Studio capacity fill rate | Fill rate > 65% | Fill rate < 30% | Fill rate < 15% (idle instructor hours) |
| `ENGAGEMENT` | Average workout logging score | Engagement >= 70 | Engagement < 45 | Engagement < 30 |
| `RETENTION` | High-risk churn member count | Churn risk < 5% | Churn risk > 8% | Churn risk > 15% |
| `OPERATIONS` | Access control & gate latency | Uptime 99.9% | Sync lag > 15 mins | Gate offline or audit sync stopped |

---

## 2. Health Status Tiers

Each outlet and dimension receives an overall status:
* `GOOD` (Score 80–100): Operating nominally with healthy velocity and engagement.
* `STABLE` (Score 65–79): Performing within acceptable operational tolerances.
* `WATCH` (Score 50–64): Exhibiting early signs of friction (e.g. slowing lead velocity, elevated refunds, or slipping attendance).
* `ATTENTION_REQUIRED` (Score < 50 or >= 3 attention flags): Requires leadership review and operational intervention.
* `INSUFFICIENT_DATA`: Telemetry is below minimum threshold for reliable scoring.

---

## 3. Attention Flags vs Punitive Penalties

FitCore's attention flags are strictly non-punitive. They act as automated operational diagnostic aids to direct managerial attention:
* `MEMBERSHIP_DECLINING`: Net member cancellations exceed activations.
* `REVENUE_DECLINING`: Inflow is tracking negative vs baseline.
* `CONVERSION_DECLINING`: Lead conversions are dipping below historical baselines.
* `LEADS_DECLINING`: Top-of-funnel lead creation has stalled.
* `ATTENDANCE_DECLINING`: Visit frequency per active member is weakening.
* `CLASS_UTILISATION_LOW`: Scheduled group workout seats remain unfilled.
* `PAYMENT_FAILURES_INCREASING`: Merchant payment rejection rates are climbing.
* `ENGAGEMENT_DECLINING`: Workout log submissions are dropping.
* `RETENTION_RISK_INCREASING`: Elevated proportion of members entering churn risk tiers.
* `DATA_QUALITY_LOW`: Incomplete telemetry or unsynced access logs.
