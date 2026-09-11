# Resource Utilisation Intelligence

## 1. Overview
Resource utilisation measures how effectively physical facilities, equipment, studios, and staff are engaged during active operating windows. FitCore evaluates utilisation across two primary dimensions:
1. **Temporal Utilisation (Time-Based)**: Proportion of available facility hours during which the resource is booked or in use.
2. **Volumetric Utilisation (Capacity-Based)**: Proportion of theoretical participant volume occupied during active sessions.

---

## 2. Calculation Methodology

### 2.1 Operating Time Utilisation
For any bookable physical resource (studio, court, room):
$$\text{Time Utilisation (\%)} = \left(\frac{\sum \text{Duration of Active Booked Sessions (Hours)}}{\text{Facility Operational Window (Hours)}}\right) \times 100$$
- Standard operational window defaults to 14 hours/day (e.g., 06:00 to 20:00).
- Multi-day periods aggregate: $\text{Available Hours} = \text{Days} \times 14$.

### 2.2 Capacity Utilisation
$$\text{Capacity Utilisation (\%)} = \left(\frac{\sum \text{Actual Attendees Across Sessions}}{\sum \text{Maximum Configured Session Capacities}}\right) \times 100$$

---

## 3. Utilisation Thresholds & Status Flags

| Range | Status | Operational Interpretation | Recommended Management Action |
| :--- | :--- | :--- | :--- |
| **> 90%** | `SATURATED` | Extreme demand; scheduling strain; limited flexibility for maintenance or schedule adjustments. | Consider adding parallel sessions, upgrading to higher-capacity rooms, or pricing adjustments. |
| **70% – 90%** | `OPTIMAL` | Healthy, balanced utilization. High member engagement with manageable equipment wear. | Maintain current schedule; monitor customer satisfaction. |
| **40% – 69%** | `MODERATE` | Adequate operational cadence; potential for incremental capacity expansion. | Introduce targeted class formats or personal training promotional slots. |
| **< 40%** | `UNDERUTILISED` | Low engagement; idle resource space incurring fixed overhead costs. | Consolidate low-attendance slots, convert studio to multi-purpose use, or promote off-peak passes. |

---

## 4. REST Endpoints
- `GET /api/v1/resource-capacity-intelligence/utilisation`: Returns top utilised, underutilised, and average facility utilisation metrics.
- Supports filtering by `outletId`, `resourceType`, `timeRange`, `startDate`, and `endDate`.
