# Security, Safety, Fairness & Privacy: Reactivation Intelligence (Day 27)

## 1. Safety Guardrails & Prohibited Content

The `ReactivationSafetyService` enforces programmatic safeguards before any reactivation assessment or recommendation is generated or stored:

### Non-Clinical & Non-Psychological Boundaries
- **Prohibited Mental Health Claims:** AI is strictly prohibited from inferring or referencing clinical mental health conditions (`depression`, `clinical depression`, `anxiety`, `bipolar`, `ptsd`, `eating disorder`, `adhd`, `burnout`).
- **Non-Diagnostic:** The platform never issues injury or medical diagnoses (`torn rotator cuff`, `diagnosed with`, `medical condition`).
- **Enforcement:** Detected diagnostic language is automatically sanitized to neutral fitness terminology (e.g. `observed routine changes`, `routine adjustments`).

### Commercial Integrity & Discount Prohibitions
- **Zero Commercial Concessions:** To protect gym revenue and prevent algorithmic discrimination, AI cannot offer discounts, price cuts, waived signup fees, or free membership months.
- **Enforcement:** Prohibited commercial terms (`discount`, `% off`, `free membership`, `waive fee`, `price cut`, `refund`, `free month`) are filtered out. If `MEMBERSHIP_REVIEW` is recommended, it is constrained to a satisfaction and scheduling check-in without pricing alterations.

---

## 2. Privacy By Design: Member vs Staff Data Isolation

### Strict Member Privacy (Zero Churn / Risk Exposure)
Members visiting the FitCore platform must never be exposed to internal predictive telemetry.
- **Member Endpoint:** `GET /api/v1/ai/reactivation/member-state` returns strictly:
  - `recoveryState`: Non-stigmatizing routine status (`EARLY_REENGAGEMENT`, `REENGAGED`, etc.).
  - `inactivityDays`: Days away count.
  - `suggestedFocus`: Encouraging wellness/training focus (e.g. `Training Restart`, `General Activity`).
- **Hidden Telemetry:** Risk scores, churn likelihoods, risk levels (`HIGH`, `ELEVATED`), disengagement barriers, and staff follow-up statuses are completely stripped.

### Staff Queue (Role-Based Access Control)
- **Role Enforcement:** Access to `/api/v1/ai/reactivation/*` (except member-state) is strictly restricted to authorized staff:
  - `SUPERADMIN`
  - `ORGANISATION_OWNER`
  - `OUTLET_MANAGER`
  - `RECEPTIONIST`
  - `TRAINER`
- **Trainer Client Scoping:** A trainer (`TRAINER` role) can only access recovery profiles and create recovery plans for members actively assigned to them via `TrainerClientAssignment`. Attempting to access unassigned members returns `403 Forbidden`.

---

## 3. Multi-Tenant Isolation

- Every database query for `MemberReactivationProfile` and `MemberRecoveryPlan` filters by `organisationId`.
- Cross-tenant requests (e.g., Staff in Org A requesting a plan or member in Org B) are blocked with `ForbiddenException` or `NotFoundException`.
- All AI read tools (`getMemberRecoveryState`, `getReactivationTrainingHistory`, etc.) validate tenant boundaries before querying data.

---

## 4. Comprehensive Audit Trail

All state machine transitions emit structured records to `AuditService`:
- `RECOVERY_PLAN_CREATED`
- `RECOVERY_PLAN_APPROVED`
- `RECOVERY_PLAN_ACTIVATED`
- `RECOVERY_PLAN_COMPLETED`
- `RECOVERY_PLAN_DISMISSED`
- `RECOVERY_PLAN_EXPIRED`
- `REACTIVATION_FEEDBACK_SUBMITTED`
