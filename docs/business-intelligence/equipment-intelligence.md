# Equipment Capacity & Utilization Intelligence

## 1. Overview
The Equipment Intelligence module tracks bookable machines, premium training bays, and specialized gear (e.g. Pilates Reformers, Olympic lifting platforms, recovery compression boots, and smart cycle bikes). It provides visibility into utilization density, maintenance downtime, and scheduling conflicts.

---

## 2. Core Metrics & Tracking

1. **Total Usage Hours**: Aggregated operating hours during which the machine was reserved or utilized in active sessions.
2. **Booking Frequency**: Number of distinct reservations associated with the machine over the period.
3. **Utilisation Rate**: Proportion of bookable hours actively engaged.
4. **Maintenance Status**:
   - `ACTIVE`: Fully operational.
   - `MAINTENANCE`: Temporarily out of service for servicing or repairs.
   - `RESERVED`: Dedicated to scheduled events or VIP bookings.
   - `INACTIVE`: Decommissioned or offline.
5. **Conflict Tracking**: Number of concurrent booking collision attempts prevented by system concurrency guards.

---

## 3. High Demand vs Underused Equipment Flags

- **`isHighDemand: true`**:
  - Utilisation rate exceeds 80%, or booking frequency exceeds 35 sessions per week.
  - Advisory: Prioritize preventative maintenance during off-peak hours (e.g., 22:00 to 05:00) to avoid disruption.
- **`isUnderused: true`**:
  - Utilisation rate falls below 20% across active operating weeks.
  - Advisory: Evaluate repositioning equipment on the floor, bundling with personal training packages, or replacing with higher-velocity assets.

---

## 4. API Endpoints
- `GET /api/v1/resource-capacity-intelligence/equipment`: Lists all equipment assets with status, utilization percentage, maintenance status, and peak usage periods.
