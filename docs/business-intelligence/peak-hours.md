# Peak Hours & Timezone Heatmap Intelligence

## 1. Overview
The Peak Hours engine aggregates facility check-ins, class bookings, and session schedules into a comprehensive **24x7 matrix (168 hourly cells)**. It translates database UTC timestamps into the outlet's authoritative local timezone, ensuring local rush hours are accurately represented.

---

## 2. 168-Cell Grid Representation

The matrix consists of 7 days (Sunday = 0 to Saturday = 6) $\times$ 24 hours of the day (00:00 to 23:00):
- Each cell represents an individual `PeakHourSlotDto`.
- Metrics captured per cell:
  - `hourOfDay` (0–23)
  - `dayOfWeek` (0–6)
  - `dayName` ('Sunday' ... 'Saturday')
  - `utilisationRate` (0% to 100%)
  - `demandLevel` (`PEAK`, `HIGH`, `MODERATE`, `LOW`, `OFF_PEAK`)
  - `totalBookings` (Count of confirmed bookings)
  - `totalCapacity` (Sum of session capacities scheduled during that hour)
  - `waitlistPressureCount` (Count of waitlisted members)
  - `activeSessionsCount` (Number of sessions operating)
  - `accessibleLabel` (Screen-reader friendly descriptive text)

---

## 3. Demand Level Classification

| Demand Level | Average Hourly Utilisation | Visual Indicator | Typical Operational Profile |
| :--- | :--- | :--- | :--- |
| `PEAK` | **>= 85%** | Crimson / Deep Red | Post-work weekday rush (17:00–19:30); Saturday morning (08:30–11:00). High facility density. |
| `HIGH` | **70% – 84%** | Amber / Orange | Early morning pre-work window (06:30–08:30); Lunchtime HIIT sessions (12:00–13:30). |
| `MODERATE` | **45% – 69%** | Yellow / Gold | Mid-morning classes (09:30–11:30); Late evening wind-down (19:30–21:00). |
| `LOW` | **20% – 44%** | Teal / Soft Blue | Early afternoon (13:30–16:00); Weekend late afternoons. |
| `OFF_PEAK` | **< 20%** | Slate / Dark Grey | Late night (21:00–05:00); Early Sunday mornings. Idle capacity available. |

---

## 4. Timezone Projection Guarantee
- Authoritative outlet timezone (e.g. `'Australia/Sydney'`, `'Asia/Kathmandu'`, or `'Australia/Perth'`) is resolved from the database `Outlet.timezone` record.
- UTC session timestamps are formatted into outlet local time using `Intl.DateTimeFormat` or timezone offset arithmetic, guaranteeing that daylight saving transitions and international branches display correct operational hours.
