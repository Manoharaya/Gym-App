# Trainer Capacity & Scheduling Intelligence

## 1. Overview
The Trainer Capacity module evaluates the operational workload of fitness trainers, personal training coaches, and group fitness instructors. It balances member service availability against staff burnout, ensuring sustainable labor allocation across branches.

---

## 2. Capacity & Workload Decomposition

### 2.1 Available Working Hours
Derived authoritatively from `TrainerAvailability`:
- **Recurring Weekly Availability**: Sum of hours configured across active days of week ($(\text{End Time} - \text{Start Time}) \times \text{Weeks}$).
- **Specific Date Overrides**: Ad-hoc shifts added for specific calendar dates.
- **Default Fallback**: If no explicit availability record exists in the system, a standard 40-hour full-time equivalent (FTE) baseline is assumed.

### 2.2 Workload Breakdown
1. **Personal Training (`PT`) Hours**:
   - Extracted from `PersonalTrainingSession` where `status` in `['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']`.
   - Distinctly tracks completed, canceled, and member no-show hours.
2. **Group Class (`CLASS`) Hours**:
   - Extracted from `ClassSession` where `trainerId` matches instructor.
   - Calculates session duration ($(\text{Ends At} - \text{Starts At})$).
3. **Combined Scheduled Hours**:
   $$\text{Booked Hours} = \text{PT Booked Hours} + \text{Class Booked Hours}$$

### 2.3 Utilisation Metrics
- **PT Utilisation**: $\left(\frac{\text{PT Booked Hours}}{\text{Available Working Hours}}\right) \times 100$
- **Class Utilisation**: $\left(\frac{\text{Class Booked Hours}}{\text{Available Working Hours}}\right) \times 100$
- **Combined Utilisation**: $\left(\frac{\text{Booked Hours}}{\text{Available Working Hours}}\right) \times 100$

---

## 3. Allocation Health Classifications

| Combined Utilisation | Classification | Operational Finding | Action Advisory |
| :--- | :--- | :--- | :--- |
| **> 85%** | `OVER_ALLOCATED` | Trainer is operating near maximum capacity. High risk of fatigue, diminished session quality, and scheduling conflicts. | Restrict new client intake; distribute group classes to secondary trainers; audit rest periods. |
| **30% – 85%** | `BALANCED` | Healthy distribution between billable delivery, client engagement, and recovery. | Maintain current schedule; monitor client retention. |
| **< 30%** | `UNDER_ALLOCATED` | Low billable utilization; excess unmonetized shift availability. | Assign new prospective leads; schedule introduction clinics or workshops during idle gaps. |

---

## 4. RBAC & IDOR Safeguards
- **Trainer Self-Service**: When an authenticated user with `TRAINER` role calls `GET /api/v1/resource-capacity-intelligence/trainers`, they receive only their own workload analytics.
- **Cross-Trainer Isolation**: Querying another trainer's ID without `ORGANISATION_OWNER` or `OUTLET_MANAGER` privileges triggers `403 Forbidden`.
