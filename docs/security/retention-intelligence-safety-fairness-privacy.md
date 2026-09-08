# Security, Safety, Fairness & Privacy: AI Retention Intelligence

## 1. Ethical & Responsible AI Principles

FitCore AI Retention Intelligence is engineered under strict human-in-the-loop and fairness constraints:

### A. Non-Autonomous Mandate
- **Zero Autonomous Contact**: AI never automatically dispatches SMS, email, mobile push, or WhatsApp outreach to members.
- **Zero Commercial Actions**: AI cannot alter membership pricing, issue discounts, waive cancellation fees, or modify subscription tiers.
- **Zero Domain Mutations**: AI never modifies training programs, bookings, or attendance records.

### B. Prohibition of Medical & Psychological Diagnostics
- The platform evaluates observable behavioral fitness data only: attendance frequency, class bookings, workout logging, check-ins, and goal tracking.
- Clinical diagnoses, psychological labels (e.g. "depression", "anxiety", "bipolar"), and medical claims are explicitly prohibited and actively sanitized by `RetentionSafetyService`.

### C. Demographic Fairness & Protected Attributes
- Protected demographic attributes (gender, age, race, ethnicity, nationality, sexual orientation) are **strictly excluded** from retention risk calculations and AI context assembly.
- Retention risk algorithms evaluate personal baseline variance (the member compared to themselves), ensuring fairness across different member habits, working schedules, and experience levels.

---

## 2. Privacy & Member Experience Protection

### A. Internal-Only Risk Classification
- Churn predictions and retention risk scores (`HIGH`, `ELEVATED`, `MODERATE`) are strictly confidential to authorized staff.
- Under no circumstances are churn labels exposed on member mobile apps or portals.
- The member mobile app displays **`FitnessMomentumCard`**, focusing purely on encouraging milestones: weekly workouts, streak progress, and positive momentum.

### B. Sensitive Data Exclusion
The following fields are strictly excluded from retention intelligence context:
- Payment credentials, credit card details, bank accounts.
- Password hashes and security tokens.
- PAR-Q medical question answers and physician notes.
- Private personal member journal notes.

---

## 3. Threat Modeling & Input/Output Guardrails

### A. Prompt Injection Defense
`RetentionSafetyService.validateInputText()` screens all user-supplied search queries and custom notes against recognized jailbreak patterns:
- Control sequence overrides ("ignore all previous instructions", "system prompt").
- Mode switching attempts ("developer mode", "unfiltered persona").
- Any detected attempt results in an immediate `BadRequestException` (HTTP 400).

### B. Output Sanitization & Taxonomy Filtering
All model outputs pass through strict post-generation verification:
- Diagnostic terms are stripped and converted to neutral behavioral descriptions ("observed activity changes").
- Commercial/discount promises are intercepted and reformatted into standard renewal satisfaction discussions.
- Unapproved intervention types outside the 12-item controlled taxonomy are discarded.
- Fallback guarantees that if no valid interventions remain, `GENERAL_SUPPORT` is safely applied.

---

## 4. Multi-Tenant Isolation & Role Authorization (RBAC)

### A. Tenant Isolation
- All database queries, caches, and audit logs are scoped by `organisationId`.
- Cross-tenant queries are blocked with `NotFoundException` or `ForbiddenException`.

### B. Staff RBAC
Only authorized staff roles can query retention intelligence:
- `SUPERADMIN`
- `ORGANISATION_OWNER`
- `OUTLET_MANAGER`
- `TRAINER` (scoped to assigned clients)
- `RECEPTION`

Regular members attempting to call retention endpoints receive an immediate `403 Forbidden`.

### C. Scoped Trainer Visibility
Personal trainers have access restricted strictly to members with an active `TrainerClientAssignment`. Requests for unassigned members are rejected with `403 Forbidden`.

---

## 5. Audit Logging & Compliance

Every critical retention action records an immutable audit log:
- `RETENTION_RISK_VIEWED`
- `RETENTION_ANALYSIS_VIEWED`
- `RETENTION_RECOMMENDATION_GENERATED`
- `RETENTION_FOLLOWUP_CREATED`
- `RETENTION_FOLLOWUP_UPDATED`
- `RETENTION_FOLLOWUP_COMPLETED`
- `RETENTION_AI_FEEDBACK_SUBMITTED`
