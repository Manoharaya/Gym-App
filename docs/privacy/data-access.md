# Member Data Access View

## 1. Overview
The Data Access service aggregates data across disparate domain entities (`User`, `MemberProfile`, `Membership`, `Booking`, `AttendanceRecord`, `Workout`, `FoodLog`, `HealthScreening`, `WearableConnection`, `ConsentRecord`) into an intuitive, human-readable view.

## 2. Security Boundaries
- **Tenant Scoped**: Data access queries are strictly bound to the authenticated user's `organisationId`.
- **Identity Isolation**: The authenticated session context determines the `memberId`. Client-supplied IDs are never trusted.
- **Zero Secret Leakage**: Database foreign keys, password hashes, payment card tokens, staff internal notes, and clinical diagnostic files are strictly excluded from the view.
