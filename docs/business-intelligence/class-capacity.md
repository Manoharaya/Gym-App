# Class Capacity & Waitlist Demand Intelligence

## 1. Overview
Group fitness classes represent high-visibility member touchpoints that drive community retention. The Class Capacity module tracks booking fill rates, physical attendance check-ins, member no-shows, and queued waitlists to detect uncaptured revenue and scheduling bottlenecks.

---

## 2. Core Metrics Formulation

### 2.1 Booking Fill Rate
Measures upfront demand velocity:
$$\text{Fill Rate (\%)} = \left(\frac{\text{Confirmed Bookings}}{\text{Configured Capacity}}\right) \times 100$$
- Includes bookings with status `CONFIRMED`, `CHECKED_IN`, and `COMPLETED`.

### 2.2 Attendance Utilisation
Measures actual physical space occupancy:
$$\text{Attendance Utilisation (\%)} = \left(\frac{\text{Checked-In Members}}{\text{Configured Capacity}}\right) \times 100$$
- Includes verified records in `AttendanceRecord` with status `CHECKED_IN` or `COMPLETED`.

### 2.3 No-Show Rate
Quantifies missed capacity caused by non-canceling members:
$$\text{No-Show Rate (\%)} = \left(\frac{\text{Confirmed Bookings} - \text{Checked-In Members}}{\text{Confirmed Bookings}}\right) \times 100$$

### 2.4 Waitlist Pressure Ratio & Classification
Signals unserved member demand:
$$\text{Waitlist Pressure Ratio (\%)} = \left(\frac{\text{Active Waitlist Entries}}{\text{Configured Capacity}}\right) \times 100$$

| Waitlist Queue Count | Waitlist Pressure | Operational Impact | Recommended Action |
| :--- | :--- | :--- | :--- |
| **>= 10 members** | `CRITICAL` | Massive uncaptured demand; member frustration likely. | Add parallel section immediately or move to largest studio. |
| **5 – 9 members** | `HIGH` | Consistent overflow beyond studio limits. | Schedule duplicate class in adjacent time slot. |
| **1 – 4 members** | `MODERATE` | Minor queue; likely absorbed by last-minute cancellations. | Send automated SMS reminders to confirmed members to cancel early. |
| **0 members** | `NONE` | Capacity fully accommodates demand. | No action required. |

---

## 3. Real-World Variance Example
Consider an evening HIIT class with a configured capacity of 20:
- **Confirmed Bookings**: 20 members (100% Fill Rate)
- **Active Waitlist**: 6 members (30% Waitlist Pressure Ratio, classified as `HIGH`)
- **Physical Check-Ins**: 5 members (25% Attendance Utilisation)
- **No-Shows**: 15 members (75% No-Show Rate)

**Management Insight**: The class appeared full, denying access to 6 eager members on the waitlist. Yet, 75% of studio mats remained empty due to no-shows. Management should implement targeted cancellation windows and late-cancel reminders rather than assuming studio size is inadequate.
