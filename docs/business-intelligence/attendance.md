# Attendance & Utilization Intelligence Domain

## Overview
The **Attendance & Utilization Intelligence** domain aggregates physical facility check-ins, turnstile badge swipes, class bookings, and facility peak hour heatmaps.

---

## Core Metrics

### 1. Total Visits
The count of verified access events (`CheckIn` / `AccessEvent`) processed by physical turnstiles, QR readers, and front desk check-in terminals within the date window.

### 2. Unique Active Visitors
The count of distinct active members who checked into the facility at least once during the period.

### 3. Attendance Frequency
$$\text{Attendance Frequency} = \frac{\text{Total Visits}}{\text{Unique Active Visitors}}$$
* A key leading indicator of membership retention: members visiting $\ge 2.5\times$ per week demonstrate a 78% higher 12-month retention rate than members visiting $< 1\times$ per week.

### 4. Peak Utilization & Hourly Heatmaps
Calculates the hourly distribution of visits across 24 hours of the day (00:00 to 23:00) to identify facility congestion peaks:
* **Peak Hour Display**: Rendered as a human-readable interval (e.g., `17:00 - 18:00`).
* **Day-of-Week Distribution**: Identifies peak days (e.g., Monday/Tuesday surges vs. weekend tapering).

---

## Class & Booking Utilization

* **Total Bookings**: Class seats reserved across group fitness sessions.
* **Attendance Rate**:
  $$\text{Attendance Rate} = \frac{\text{Attended Bookings}}{\text{Total Completed Sessions}} \times 100$$
* **No-Show Rate**:
  $$\text{No-Show Rate} = \frac{\text{No-Show Bookings}}{\text{Total Bookings}} \times 100$$
* **Class Fill Rate**:
  $$\text{Fill Rate} = \frac{\text{Booked Spots}}{\text{Total Class Capacity}} \times 100$$
