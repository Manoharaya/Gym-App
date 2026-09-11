# Resource & Capacity Metric Definitions Dictionary

## 1. Scope & Purpose
This dictionary provides the canonical enterprise definitions for all Resource & Capacity metrics in FitCore. These definitions govern data aggregation pipelines, REST APIs, CSV exports, mobile visualizations, and AI advisory prompts.

---

## 2. Canonical Metrics Dictionary

### 2.1 Overall Resource Utilisation
- **Metric Key**: `resource.overall_utilisation`
- **Domain**: `RESOURCES`
- **Definition**: Percentage of total operational time or capacity during which physical resources are booked.
- **Formula**:
  $$\text{Utilisation (\%)} = \left(\frac{\text{Booked Capacity-Hours}}{\text{Available Operating Capacity-Hours}}\right) \times 100$$
- **Numerator**: Booked Capacity-Hours across all active physical spaces.
- **Denominator**: Available Operating Capacity-Hours ($14 \text{ hours/day} \times \text{Days} \times \text{Configured Space Capacity}$).
- **Source**: `Resource`, `ClassSession`, `Booking`.
- **Time Window**: Configurable (Daily, 7d, 30d, Custom).
- **Unit**: `PERCENTAGE`
- **Minimum Sample**: 10 records
- **Zero Denominator Behavior**: Returns `null`, direction `'NOT_COMPARABLE'`, caveat appended.
- **Interpretation**: Values between 65% and 85% represent healthy, balanced spatial allocation. Values > 90% indicate saturation; values < 40% represent idle unmonetized real estate.
- **Known Limitations**: Assumes uniform booking session lengths unless explicit actual check-in/out timestamps are collected.

---

### 2.2 Trainer Utilisation
- **Metric Key**: `resource.trainer.utilisation`
- **Domain**: `TRAINING`
- **Definition**: Ratio of hours spent delivering personal training or scheduled group classes relative to total available working shift hours.
- **Formula**:
  $$\text{Trainer Utilisation (\%)} = \left(\frac{\text{PT Booked Hours} + \text{Class Booked Hours}}{\text{Available Working Shift Hours}}\right) \times 100$$
- **Numerator**: Delivered and confirmed training hours across PT and group fitness.
- **Denominator**: Available working shift hours (calculated from `TrainerAvailability`).
- **Source**: `TrainerProfile`, `TrainerAvailability`, `PersonalTrainingSession`, `ClassSession`.
- **Time Window**: Configurable
- **Unit**: `PERCENTAGE`
- **Minimum Sample**: 5 records
- **Zero Denominator Behavior**: Returns `null`, direction `'NOT_COMPARABLE'`.
- **Interpretation**: Workloads > 85% signal imminent burnout and lack of scheduling elasticity. Workloads < 30% signal idle, unmonetized labor availability.
- **Known Limitations**: Does not capture non-teaching administrative prep time.

---

### 2.3 Room & Studio Utilisation
- **Metric Key**: `resource.room.utilisation`
- **Domain**: `RESOURCES`
- **Definition**: Percentage of available operating studio hours occupied by active classes, private rentals, or workshops.
- **Formula**:
  $$\text{Room Utilisation (\%)} = \left(\frac{\text{Occupied Studio Hours}}{\text{Available Studio Operating Hours}}\right) \times 100$$
- **Numerator**: Occupied session hours.
- **Denominator**: Total available operating hours (days in period $\times$ 14h/day).
- **Source**: `Resource`, `ClassSession`.
- **Time Window**: Configurable
- **Unit**: `PERCENTAGE`
- **Minimum Sample**: 10 records
- **Zero Denominator Behavior**: Returns `null`, direction `'NOT_COMPARABLE'`.
- **Interpretation**: Identifies studio space bottlenecks during peak windows versus underutilized open floor time.
- **Known Limitations**: Does not account for informal, unreserved member stretching or floor warm-up.

---

### 2.4 Class Booking Fill Rate
- **Metric Key**: `resource.class.fill_rate`
- **Domain**: `BOOKINGS`
- **Definition**: Proportion of scheduled class capacity claimed by confirmed member bookings.
- **Formula**:
  $$\text{Fill Rate (\%)} = \left(\frac{\text{Confirmed Bookings Count}}{\text{Configured Class Capacity}}\right) \times 100$$
- **Numerator**: Confirmed member bookings count (`CONFIRMED`, `CHECKED_IN`, `COMPLETED`).
- **Denominator**: Configured class session capacity limit.
- **Source**: `ClassSession`, `Booking`.
- **Time Window**: Configurable
- **Unit**: `PERCENTAGE`
- **Minimum Sample**: 5 records
- **Zero Denominator Behavior**: Returns `null`, direction `'NOT_COMPARABLE'`.
- **Interpretation**: Measures upfront booking demand velocity prior to session start.
- **Known Limitations**: Does not reflect whether members physically attended (see Class Attendance Utilisation).

---

### 2.5 Class Attendance Utilisation
- **Metric Key**: `resource.class.attendance_utilisation`
- **Domain**: `ATTENDANCE`
- **Definition**: Actual physical attendance relative to configured studio class capacity limit.
- **Formula**:
  $$\text{Attendance Utilisation (\%)} = \left(\frac{\text{Physically Checked-In Members}}{\text{Configured Class Capacity}}\right) \times 100$$
- **Numerator**: Checked-in members count (`CHECKED_IN`, `COMPLETED`).
- **Denominator**: Configured class capacity limit.
- **Source**: `ClassSession`, `AttendanceRecord`.
- **Time Window**: Configurable
- **Unit**: `PERCENTAGE`
- **Minimum Sample**: 5 records
- **Zero Denominator Behavior**: Returns `null`, direction `'NOT_COMPARABLE'`.
- **Interpretation**: Reveals true operational physical space efficiency after member no-shows and cancellations.
- **Known Limitations**: Delayed gate scans or manual check-in overrides can introduce transient reporting latency.

---

### 2.6 Class Waitlist Pressure Rate
- **Metric Key**: `resource.class.waitlist_pressure`
- **Domain**: `BOOKINGS`
- **Definition**: Ratio of queued waitlist members relative to configured class capacity limit.
- **Formula**:
  $$\text{Waitlist Pressure (\%)} = \left(\frac{\text{Active Waitlist Entries Count}}{\text{Configured Class Capacity}}\right) \times 100$$
- **Numerator**: Active waitlisted members count (`PENDING`, `ACTIVE`).
- **Denominator**: Configured class capacity limit.
- **Source**: `ClassSession`, `WaitlistEntry`.
- **Time Window**: Configurable
- **Unit**: `PERCENTAGE`
- **Minimum Sample**: 5 records
- **Zero Denominator Behavior**: Returns `null`, direction `'NOT_COMPARABLE'`.
- **Interpretation**: Quantifies unmet member demand. Classes with waitlist pressure > 25% represent immediate candidates for parallel section scheduling or room upgrades.
- **Known Limitations**: Members may queue for multiple waitlisted slots simultaneously.

---

### 2.7 Class No-Show Rate
- **Metric Key**: `resource.class.no_show_rate`
- **Domain**: `BOOKINGS`
- **Definition**: Proportion of confirmed bookings where the member failed to check in without prior cancellation.
- **Formula**:
  $$\text{No-Show Rate (\%)} = \left(\frac{\text{Confirmed Bookings} - \text{Checked-In Members}}{\text{Confirmed Bookings}}\right) \times 100$$
- **Numerator**: Unattended confirmed bookings.
- **Denominator**: Total confirmed bookings count.
- **Source**: `ClassSession`, `Booking`, `AttendanceRecord`.
- **Time Window**: Configurable
- **Unit**: `PERCENTAGE`
- **Minimum Sample**: 5 records
- **Zero Denominator Behavior**: Returns `null`, direction `'NOT_COMPARABLE'`.
- **Interpretation**: Identifies booking churn that artificially inflates class fill rate while leaving physical mats empty.
- **Known Limitations**: Relies on accurate check-in recording by front desk or instructor.

---

### 2.8 Equipment Utilisation Rate
- **Metric Key**: `resource.equipment.utilisation`
- **Domain**: `EQUIPMENT`
- **Definition**: Proportion of bookable machine or bay hours actively utilized in scheduled member sessions.
- **Formula**:
  $$\text{Equipment Utilisation (\%)} = \left(\frac{\text{Occupied Machine Hours}}{\text{Available Operating Machine Hours}}\right) \times 100$$
- **Numerator**: Total reserved hours across sessions.
- **Denominator**: Total bookable equipment operating hours.
- **Source**: `Resource`, `ClassSession`, `Booking`.
- **Time Window**: Configurable
- **Unit**: `PERCENTAGE`
- **Minimum Sample**: 5 records
- **Zero Denominator Behavior**: Returns `null`, direction `'NOT_COMPARABLE'`.
- **Interpretation**: Guides preventative maintenance scheduling and high-demand equipment asset procurement.
- **Known Limitations**: Does not capture informal unreserved gym floor usage.
