# Multi-Outlet Metrics Registry & Operational Aggregation

## 1. Overview
The Multi-Outlet Intelligence engine relies on canonical metric definitions registered in `OutletMetricRegistry` to ensure consistency across reporting, mobile interfaces, and AI grounding. Every metric is typed with domain, aggregation behavior, normalisation rules, and directionality.

---

## 2. Multi-Outlet Metric Catalog

| Metric Key | Domain | Unit | Direction | Normalisation Support | Baseline Comparison | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `outlet.membership.active_members` | MEMBERSHIP | COUNT | UP_IS_GOOD | ABSOLUTE | Previous 30 days | Count of active and trial memberships with origin at the outlet |
| `outlet.membership.net_growth` | MEMBERSHIP | COUNT | UP_IS_GOOD | ABSOLUTE, PERCENTAGE | Previous 30 days | Net change in active members (`New + Reactivated - Cancelled`) |
| `outlet.membership.growth_rate` | MEMBERSHIP | PERCENTAGE | UP_IS_GOOD | PERCENTAGE | Prior baseline | Velocity of net membership base expansion |
| `outlet.sales.new_leads` | SALES | COUNT | UP_IS_GOOD | ABSOLUTE, PER_LEAD | Previous 30 days | Inbound prospect leads attributed to the outlet |
| `outlet.sales.conversions` | SALES | COUNT | UP_IS_GOOD | ABSOLUTE | Previous 30 days | Leads converting to active paying members |
| `outlet.sales.conversion_rate` | SALES | PERCENTAGE | UP_IS_GOOD | PERCENTAGE | Historical avg | Ratio of converted leads to total leads (`%`) |
| `outlet.finance.gross_revenue` | FINANCE | CURRENCY | UP_IS_GOOD | ABSOLUTE, PER_ACTIVE_MEMBER | Prior period | Total gross monetary inflow attributed to outlet |
| `outlet.finance.net_revenue` | FINANCE | CURRENCY | UP_IS_GOOD | ABSOLUTE, PER_ACTIVE_MEMBER | Prior period | Gross revenue less refunds and chargebacks |
| `outlet.finance.revenue_per_member` | FINANCE | CURRENCY | UP_IS_GOOD | PER_ACTIVE_MEMBER | Prior period | `Net Revenue / Active Members` (ARPU per outlet) |
| `outlet.finance.refund_rate` | FINANCE | PERCENTAGE | DOWN_IS_GOOD | PERCENTAGE | Historical avg | Ratio of refund value to gross revenue |
| `outlet.attendance.total_visits` | ATTENDANCE | COUNT | UP_IS_GOOD | ABSOLUTE, PER_ACTIVE_MEMBER | Prior period | Physical gate and check-in events recorded at outlet |
| `outlet.attendance.visits_per_member` | ATTENDANCE | RATIO | UP_IS_GOOD | PER_ACTIVE_MEMBER | Prior period | Average facility visit frequency per active member |
| `outlet.bookings.fill_rate` | BOOKINGS | PERCENTAGE | UP_IS_GOOD | PERCENTAGE | Prior period | Ratio of attended class spots to total scheduled capacity |
| `outlet.bookings.no_show_rate` | BOOKINGS | PERCENTAGE | DOWN_IS_GOOD | PERCENTAGE | Prior period | Bookings where member did not attend or cancel |
| `outlet.engagement.avg_score` | ENGAGEMENT | SCORE | UP_IS_GOOD | ABSOLUTE | Historical avg | Multi-factor member workout logging & app engagement score (0–100) |
| `outlet.retention.high_risk_count` | RETENTION | COUNT | DOWN_IS_GOOD | ABSOLUTE | Prior period | Active members classified in HIGH churn risk tier |
| `outlet.retention.risk_percentage` | RETENTION | PERCENTAGE | DOWN_IS_GOOD | PERCENTAGE | Prior period | High-risk member population as % of active base |

---

## 3. Strict Revenue Attribution Rules

FitCore enforces rigorous revenue attribution to prevent financial misallocation across branches:
1. **Direct Attribution**: Revenue from a membership payment or point-of-sale invoice is attributed directly to the member's `originOutletId`.
2. **Transfer Handling**: If a member changes home gyms, historical revenue remains attributed to the origin outlet at transaction time, preserving accounting accuracy.
3. **Unattributed Revenue**: Any transaction without an associated origin outlet is explicitly segregated into `unattributedRevenue` by currency. It is never silently absorbed or arbitrarily split among outlets.
4. **Multi-Currency Siloing**: Outlets operating in different sovereign currencies (e.g. Kathmandu in `NPR`, Sydney in `AUD`) are grouped into distinct currency buckets. The platform strictly prohibits cross-currency summation.
