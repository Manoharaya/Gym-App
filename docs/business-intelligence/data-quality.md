# Data Quality, Freshness & Integrity Engine

## Overview
Executive business dashboards must never present misleading metrics. The `DataQualityService` attaches deterministic trust ratings, sample size warnings, and mathematical safeguards to all BI payloads.

---

## Data Freshness Ratings

Every operational domain reports its data freshness:
* **EXCELLENT**: Data synchronized within the last 5 minutes.
* **GOOD**: Data synchronized within the last 60 minutes.
* **FAIR**: Data synchronized within the last 24 hours.
* **STALE**: Data has not updated in $> 24$ hours; indicates background worker latency.

---

## Small Sample Size Safeguards

Aggregating percentages over small samples produces volatile, misleading indicators (e.g. 1 conversion out of 1 lead yields 100% conversion rate).

### Threshold Rules:
* **Sample Threshold**: If a rate metric is derived from $< 10$ records (or $< 5$ leads in sales), the system:
  1. Lowers the quality rating to `MEDIUM` or `LOW`.
  2. Injects an explicit cautionary caveat:
     `"Small sample size (< 10 records). Metric is advisory and may exhibit high volatility."`
  3. Displays a warning badge on the mobile executive screen.

---

## Zero-Denominator Mathematical Safety

Percentage calculations protect against division-by-zero artifacts:
* `pctChange`: Returned as `null`, never `Infinity` or `NaN`.
* `direction`: Tagged as `'NOT_COMPARABLE'`.
* `caveat`: Explains that the prior period had zero base value.

```json
{
  "metricKey": "membership.new",
  "label": "New Members",
  "current": 15,
  "previous": 0,
  "difference": 15,
  "percentageDifference": null,
  "direction": "NOT_COMPARABLE",
  "caveat": "Previous period had 0 baseline value; percentage is not comparable."
}
```
