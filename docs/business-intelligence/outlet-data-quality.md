# Multi-Outlet Data Quality & Telemetry Freshness

## 1. Overview
Comparative analytics across physical locations is only as good as the underlying telemetry and transaction reporting. The `OutletDataQualityService` continuously audits the completeness, freshness, and synchronization consistency of operational data across every outlet.

---

## 2. Quality Evaluation Dimensions

| Dimension | Measured Indicator | High Quality Threshold | Low Quality / Warning Trigger |
| :--- | :--- | :--- | :--- |
| **Telemetry Coverage** | Ratio of active members with check-ins or workout logs | >= 65% coverage | < 30% coverage (missing physical gate data) |
| **Data Freshness** | Elapsed time since last recorded transaction or check-in | < 30 minutes | > 12 hours during operational hours |
| **Revenue Attribution** | Ratio of transactions tied to an origin outlet | >= 99% attributed | Unattributed revenue > 5% |
| **Sample Size Sufficiency** | Minimum records for percentage calculations | >= 10 records / >= 5 leads | < 5 records (triggers advisory caveats) |

---

## 3. Data Freshness Status Tiers

Freshness metadata is attached to all multi-outlet executive responses:
* `REAL_TIME`: Synchronized within the last 5 minutes.
* `NEAR_REAL_TIME`: Synchronized within the last 30 minutes.
* `HOURLY`: Aggregated within the last 1–2 hours.
* `DAILY`: Historical batch snapshot.
* `STALE`: Outlets with synchronization lag exceeding operational tolerances.
