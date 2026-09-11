# Resource & Capacity Intelligence Verification & Testing Suite

## 1. Test Suite Architecture
The Resource & Capacity Intelligence engine is validated through a dedicated end-to-end (E2E) integration test suite located at:
`services/api/test/resource-capacity-intelligence.e2e-spec.ts`.

It runs against the active PostgreSQL database via Prisma, initializing a full NestJS application instance with `ValidationPipe` and `JwtAuthGuard`.

---

## 2. Test Coverage & Verification Matrix (26 Total Assertions)

| Suite # | Functional Domain | Assertions Verified | Test Result |
| :--- | :--- | :--- | :--- |
| **Suite 1** | **Capacity & Utilisation Separation** | Disentangles 100% Booking Fill Rate from 25% Attendance Utilisation; validates zero-denominator safety with `NOT_COMPARABLE` and null value. | **PASS** |
| **Suite 2** | **Trainer Capacity Intelligence** | Validates working hours, PT hours, class hours, and identifies over/under-allocated trainers via service and REST endpoint. | **PASS** |
| **Suite 3** | **Room Capacity Intelligence** | Evaluates operating window (14h/day) vs booked sessions; detects underutilised studios with zero bookings. | **PASS** |
| **Suite 4** | **Waitlist Demand Pressure** | Quantifies unserved demand signals; detects full sessions with active waitlists and high waitlist pressure ratios. | **PASS** |
| **Suite 5** | **Peak-Hour 24x7 Heatmap** | Generates full 7 days $\times$ 24 hours grid (168 slots) mapped to outlet local timezone; verifies summary windows. | **PASS** |
| **Suite 6** | **Bottleneck Detection** | Scans metrics for capacity bottlenecks; verifies concrete evidence, advisory recommendations, and strict human decision required flags. | **PASS** |
| **Suite 7** | **6-Dimension Resource Health** | Evaluates UTILISATION, CAPACITY, DEMAND, AVAILABILITY, CONFLICTS, and DATA_QUALITY; computes status and scores. | **PASS** |
| **Suite 8** | **RBAC & IDOR Security Defenses** | Confirms 403 Forbidden for MEMBER; 403 Forbidden for TRAINER accessing executive overview; prevents cross-outlet IDOR for OUTLET_MANAGER. | **PASS** |
| **Suite 9** | **RFC 4180 CSV Export** | Verifies text/csv response and formula injection defense (prepends `'` to `=`, `+`, `-`, `@`). | **PASS** |
| **Suite 10**| **Grounded AI Advisory & Defense**| Validates grounded advisory with confidence score > 0.7; confirms prompt injection refusal; verifies Nepali language support. | **PASS** |
| **Suite 11**| **REST Endpoints & Registry** | Validates canonical dictionary endpoints, cache freshness headers, comparison matrix, and overview payload. | **PASS** |

---

## 3. Regression Suite Verification
In addition to Day 47 testing, regression suites were executed with zero breakages:
- **Day 46 Multi-Outlet Intelligence**: 23 test assertions (**PASS**)
- **Day 45 Business Intelligence**: 17 test assertions (**PASS**)
- **Total Suite Passing**: 66 end-to-end test assertions.
