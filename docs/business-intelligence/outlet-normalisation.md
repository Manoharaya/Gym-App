# Outlet Metric Normalisation & Mathematical Safety

## 1. Principles of Fair Comparison

In multi-outlet operations, comparing raw values directly produces systemic distortion:
* A flagship gym with 2,500 members will inevitably produce more check-ins and revenue than a community branch with 300 members.
* Comparing raw lead counts unfairly penalises smaller markets where customer acquisition cost or market size is different.
* Comparing class attendance without accounting for studio square footage or scheduled capacity is meaningless.

To resolve this, FitCore provides a dual presentation model: **Absolute** vs **Normalised** metrics.

---

## 2. Supported Normalisation Modes

| Normalisation Mode | Calculation Formula | Typical Applications | Unit String |
| :--- | :--- | :--- | :--- |
| `ABSOLUTE` | $V_{raw}$ | Baseline totals, total cash in bank | e.g. `$`, `NPR`, `members` |
| `PER_ACTIVE_MEMBER` | $\frac{V_{raw}}{\text{Active Members}}$ | Revenue per member (ARPU), check-ins/member | `/member` |
| `PER_LEAD` | $\frac{V_{raw}}{\text{Total Leads}}$ | Acquisition efficiency, conversion rate | `/lead` |
| `PER_SESSION` | $\frac{V_{raw}}{\text{Scheduled Classes}}$ | Attendance per class, average capacity fill | `/session` |
| `PERCENTAGE` | $\frac{\text{Numerator}}{\text{Denominator}} \times 100$ | Fill rate, conversion rate, refund rate | `%` |
| `GROWTH_VS_BASELINE`| $\frac{V_{current} - V_{baseline}}{V_{baseline}} \times 100$ | Growth velocity vs historical period | `%` |

---

## 3. Mathematical Safety & Edge Case Handling

### Zero-Denominator Guard
When the denominator in a normalisation calculation is zero or undefined (e.g. 0 active members, 0 leads, 0 scheduled classes):
* The calculation **never throws `DivisionByZero` or outputs `NaN`/`Infinity`**.
* `normalisedValue` is set strictly to `null`.
* `direction` is assigned `'NOT_COMPARABLE'`.
* `percentageChange` is set to `null`.
* The UI displays `N/A` or `-` with an explanatory tooltip.

### Small Sample Size Protection
When metrics are calculated over small sample sizes (< 10 records or < 5 leads):
* Outlets are flagged with a `sampleSizeCaveat` (e.g., *"Small sample size: fewer than 5 leads. Percentage metrics should be interpreted with caution."*).
* `dataQuality` rating is downgraded to `'FAIR'` or `'LOW'`.
* This prevents sudden wild percentage swings (e.g. 1 conversion out of 1 lead = 100% conversion rate) from falsely elevating an outlet to top rank.
