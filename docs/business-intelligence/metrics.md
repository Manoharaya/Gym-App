# Business Intelligence Metric Registry & Canonical Definitions

## Overview
All business metrics in FitCore are centrally cataloged in the `MetricRegistryService` and exposed through `/api/v1/business-intelligence/metrics`. This prevents ad-hoc metric reinterpretation across mobile dashboards, web interfaces, and backend microservices.

---

## Canonical Metric Inventory

| Metric Key | Domain | Unit | Aggregation | Scope Support | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `membership.active_members` | MEMBERSHIP | COUNT | CURRENT | Org & Outlet | Total active and trial member memberships |
| `membership.new_members` | MEMBERSHIP | COUNT | SUM | Org & Outlet | Newly activated memberships within period |
| `membership.cancelled_members` | MEMBERSHIP | COUNT | SUM | Org & Outlet | Memberships cancelled within period |
| `membership.reactivated_members` | MEMBERSHIP | COUNT | SUM | Org & Outlet | Members resuming after prior cancellation |
| `membership.net_member_change` | MEMBERSHIP | COUNT | CALCULATION | Org & Outlet | `New + Reactivated - Cancelled` |
| `membership.growth_rate` | MEMBERSHIP | PERCENTAGE | CALCULATION | Org & Outlet | `(Net Change / Prior Active) * 100` |
| `sales.new_leads` | SALES | COUNT | SUM | Org & Outlet | Prospect leads created in period |
| `sales.qualified_leads` | SALES | COUNT | SUM | Org & Outlet | Leads meeting qualification threshold |
| `sales.conversions` | SALES | COUNT | SUM | Org & Outlet | Leads/opportunities converted to active members |
| `sales.conversion_rate` | SALES | PERCENTAGE | RATIO | Org & Outlet | `(Conversions / Conversion Denominator) * 100` |
| `sales.pipeline_value` | SALES | CURRENCY | SUM | Org & Outlet | Total estimated value of open opportunities |
| `sales.speed_to_lead` | SALES | SECONDS | AVERAGE | Org & Outlet | Avg elapsed time from lead creation to first contact |
| `finance.gross_revenue` | FINANCE | CURRENCY | SUM | Org & Outlet | Total gross inflow from successful transactions |
| `finance.refunds` | FINANCE | CURRENCY | SUM | Org & Outlet | Total refunded payments processed |
| `finance.net_revenue` | FINANCE | CURRENCY | CALCULATION | Org & Outlet | `Gross Revenue - Refunds` |
| `finance.payment_success_rate`| FINANCE | PERCENTAGE | RATIO | Org & Outlet | `(Succeeded / Total Attempts) * 100` |
| `finance.outstanding_balance` | FINANCE | CURRENCY | SUM | Org & Outlet | Unpaid balance on open/overdue invoices |
| `finance.overdue_invoices` | FINANCE | COUNT | COUNT | Org & Outlet | Count of past-due unpaid invoices |
| `attendance.total_visits` | ATTENDANCE | COUNT | SUM | Org & Outlet | Physical check-in access events recorded |
| `attendance.unique_visitors` | ATTENDANCE | COUNT | COUNT_DISTINCT | Org & Outlet | Unique active members visiting at least once |
| `attendance.frequency` | ATTENDANCE | RATIO | RATIO | Org & Outlet | `Total Visits / Unique Active Members` |
| `attendance.peak_hour` | ATTENDANCE | STRING | MODE | Org & Outlet | Hour interval with highest facility volume |
| `bookings.total_bookings` | BOOKINGS | COUNT | SUM | Org & Outlet | Class and session reservations |
| `bookings.attendance_rate` | BOOKINGS | PERCENTAGE | RATIO | Org & Outlet | `(Attended / Completed Sessions) * 100` |
| `bookings.no_show_rate` | BOOKINGS | PERCENTAGE | RATIO | Org & Outlet | `(No Shows / Bookings) * 100` |
| `bookings.fill_rate` | BOOKINGS | PERCENTAGE | RATIO | Org & Outlet | `(Booked Spots / Total Capacity) * 100` |
| `training.sessions_delivered`| TRAINING | COUNT | SUM | Org & Outlet | Personal training sessions delivered |
| `training.completion_rate` | TRAINING | PERCENTAGE | RATIO | Org & Outlet | `(Completed Sessions / Scheduled Sessions) * 100` |
| `training.active_clients` | TRAINING | COUNT | COUNT_DISTINCT | Org & Outlet | Unique members assigned to active trainers |
| `engagement.active_members` | ENGAGEMENT | COUNT | COUNT_DISTINCT | Org & Outlet | Members logging workouts or check-ins |
| `engagement.avg_score` | ENGAGEMENT | SCORE | AVERAGE | Org & Outlet | Rolling multi-factor member engagement score (0–100) |
| `engagement.workouts_logged` | ENGAGEMENT | COUNT | SUM | Org & Outlet | Total workout sessions completed |
| `retention.retention_rate` | RETENTION | PERCENTAGE | CALCULATION | Org & Outlet | `100 - Churn Rate` |
| `retention.churn_rate` | RETENTION | PERCENTAGE | CALCULATION | Org & Outlet | `(Cancelled / (Prior Active + New)) * 100` |
| `retention.high_risk_count` | RETENTION | COUNT | COUNT | Org & Outlet | Members categorized in HIGH churn risk tier |
| `retention.follow_up_queue` | RETENTION | COUNT | COUNT | Org & Outlet | Active retention intervention tasks |
| `communication.sent_count` | COMMUNICATION | COUNT | SUM | Org & Outlet | Outbound email, SMS, and WhatsApp messages |
| `communication.delivery_rate`| COMMUNICATION | PERCENTAGE | RATIO | Org & Outlet | `(Delivered / Sent) * 100` |
| `communication.response_rate`| COMMUNICATION | PERCENTAGE | RATIO | Org & Outlet | `(Responses / Delivered) * 100` |
| `ai.total_requests` | AI | COUNT | SUM | Org & Outlet | Total AI inferences processed across features |
| `ai.success_rate` | AI | PERCENTAGE | RATIO | Org & Outlet | `(Successful Inferences / Total Requests) * 100` |
| `ai.receptionist_convos` | AI | COUNT | SUM | Org & Outlet | Autonomous AI front-desk conversations |

---

## Directionality Semantics

Each metric maintains directional polarity to ensure visual consistency across the dashboard:
* **UP_IS_GOOD**: Higher is favorable (e.g. `membership.net_member_change`, `finance.net_revenue`, `sales.conversion_rate`, `bookings.fill_rate`).
* **UP_IS_BAD**: Higher is unfavorable (e.g. `membership.cancelled_members`, `finance.refunds`, `finance.overdue_invoices`, `bookings.no_show_rate`, `retention.high_risk_count`).
* **NEUTRAL**: Informational without inherent polarity (e.g. `attendance.peak_hour`, `sales.speed_to_lead`).

---

## Zero-Denominator & Indeterminate State Rules

1. **Zero Prior Value**: When evaluating percentage changes where the baseline prior period is 0:
   * `pctChange` is set to `null` (never `Infinity` or `NaN`).
   * `direction` is set to `NOT_COMPARABLE`.
   * A cautionary caveat is attached: `"Previous period had 0 baseline value; percentage is not comparable."`
2. **Identical Zero Values**: If both current and prior values are 0:
   * `pctChange` is `0`.
   * `direction` is `UNCHANGED`.
3. **Missing Telemetry**: If an operational domain has no events recorded in the requested window, metrics return `0` with data quality flagged as `INSUFFICIENT_DATA`.
