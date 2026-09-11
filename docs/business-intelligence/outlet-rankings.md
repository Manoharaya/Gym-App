# Multi-Outlet Ranking & Categorical Leadership

## 1. No Universal "Best Outlet" Composite Score

A foundational requirement of FitCore's business intelligence design is that **no single universal "best outlet" composite score is calculated or displayed**.

In real-world gym management, composite leaderboards suffer from severe flaws:
* Arbitrary weighting: Weighting revenue at 40% and retention at 30% is subjective and penalises branches with different strategic mandates (e.g. rapid acquisition phase vs mature retention phase).
* Demoralising staff: Ranking a high-performing boutique studio last simply because its gross revenue cannot match a suburban multi-level gym creates counterproductive friction among branch managers.
* Masking acute issues: An outlet with high revenue but surging cancellations could score artificially high on a composite metric, blinding leadership to severe churn risk.

---

## 2. Categorical Leadership Architecture

Instead of a single ladder, FitCore evaluates and surfaces **Categorical Leaders** across distinct operational dimensions:

| Category Leader | Governing Metric | Evaluation Logic | Management Purpose |
| :--- | :--- | :--- | :--- |
| **Revenue Leader** | `finance.net_revenue` | Highest net collected revenue in currency cohort | Identifies primary financial volume engine |
| **Growth Leader** | `membership.net_growth` | Highest net member expansion (New - Cancelled) | Highlights strongest market expansion momentum |
| **Sales Leader** | `sales.conversion_rate` | Highest lead-to-member conversion (min 5 leads) | Surfaces best-performing sales consultation team |
| **Attendance Leader** | `attendance.visits_per_member` | Highest visit cadence per active member | Measures habit formation and member engagement |
| **Class Utilisation Leader** | `bookings.fill_rate` | Highest ratio of attended bookings to capacity | Spotlights group exercise schedule optimization |
| **Engagement Leader** | `engagement.avg_score` | Highest composite app & workout score | Identifies community and digital adoption success |
| **Retention Watch** | `retention.risk_percentage` | Highest proportion of members in high churn risk | Proactively flags locations needing retention support |

---

## 3. Dynamic Normalised Re-Ranking

When viewing metric rankings, management can toggle normalisation modes in real time:
* In `ABSOLUTE` mode, outlets are sorted strictly by total volume.
* In `PER_ACTIVE_MEMBER` mode, the ranking recalculates based on per-member efficiency, allowing smaller community branches to showcase superior operational productivity.
