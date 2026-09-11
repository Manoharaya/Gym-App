# Resource & Capacity Metrics Registry

## 1. Overview
The FitCore Resource Intelligence engine uses a canonical in-memory metric catalog registered in `ResourceMetricRegistry`. Every metric adheres to strict enterprise standards: explicit mathematical formulas, typed units, declared sources of truth, minimum statistical sample thresholds, and zero-denominator safety specifications.

---

## 2. Canonical Metrics Catalog

| Metric Key | Domain | Unit | Direction | Minimum Sample | Zero-Denominator Behavior | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `resource.overall_utilisation` | RESOURCES | PERCENTAGE | UP_IS_GOOD | 10 records | `NOT_COMPARABLE` | Operational hours booked relative to total facility opening hours. |
| `resource.trainer.utilisation` | TRAINING | PERCENTAGE | UP_IS_GOOD | 5 records | `NOT_COMPARABLE` | Total PT and class hours delivered relative to available scheduled working hours. |
| `resource.room.utilisation` | RESOURCES | PERCENTAGE | UP_IS_GOOD | 10 records | `NOT_COMPARABLE` | Operating studio hours occupied by group fitness sessions or workshops. |
| `resource.class.fill_rate` | BOOKINGS | PERCENTAGE | UP_IS_GOOD | 5 records | `NOT_COMPARABLE` | Percentage of class capacity claimed by confirmed member bookings. |
| `resource.class.attendance_utilisation` | ATTENDANCE | PERCENTAGE | UP_IS_GOOD | 5 records | `NOT_COMPARABLE` | Actual physical attendance relative to configured studio class capacity. |
| `resource.class.waitlist_pressure` | BOOKINGS | PERCENTAGE | DOWN_IS_GOOD | 5 records | `NOT_COMPARABLE` | Ratio of waitlisted members relative to session capacity. |
| `resource.class.no_show_rate` | BOOKINGS | PERCENTAGE | DOWN_IS_GOOD | 5 records | `NOT_COMPARABLE` | Proportion of booked members who failed to check in without canceling. |
| `resource.equipment.utilisation` | EQUIPMENT | PERCENTAGE | UP_IS_GOOD | 5 records | `NOT_COMPARABLE` | Usage and booking frequency for high-demand equipment pieces. |

---

## 3. Mathematical Formula Standards

### 3.1 Zero-Denominator Safety
Whenever a denominator evaluates to zero (e.g., zero scheduled classes, zero available shift hours, or unconfigured capacity):
1. The numeric `value` is explicitly set to `null`.
2. The KPI trend `direction` evaluates to `'NOT_COMPARABLE'`.
3. The `dataQuality` flag drops to `'INSUFFICIENT_DATA'`.
4. A human-readable `sampleSizeCaveat` is attached: `"Denominator is zero. Calculation is undefined."`

### 3.2 Small Sample Size Caveats
To prevent volatile conclusions drawn from limited records:
- If `denominator < minimumSample` (e.g., fewer than 5 bookings or fewer than 10 operating hours), the metric value is preserved, but an advisory warning is appended:
  `"Small sample size (X records). Value should be interpreted with caution."`
- The `dataQuality` is lowered from `HIGH` to `MEDIUM` or `LOW`.
