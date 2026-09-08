# Engagement Intelligence — Fairness, Safety & Privacy Policy

## 1. Fairness & Anti-Discrimination Commitments
The FitCore Retention Risk and Engagement engine enforces strict mathematical invariance with respect to protected and sensitive characteristics:

- **Strict Exclusion**: Race, religion, ethnicity, gender, sexual orientation, disability status, age, medical conditions, PAR-Q questions, and prescription medications are strictly excluded from all signal collection, baseline calculations, trend detections, and retention risk scoring.
- **No Inference**: The system does not attempt to infer or construct proxies for protected characteristics from behavioral metadata.
- **Fairness Testing**: Automated test suites verify that retention risk scores and classifications remain 100% identical when demographic or medical attributes vary.

## 2. Privacy & Data Minimization
- **Source Data Sanitization**: When assembling context for AI narrative generation, sensitive data (medical clearances, private trainer notes, credit card numbers, authentication credentials) is stripped via `SensitiveDataSanitizerService`.
- **Aggregated Telemetry**: Nutrition tracking is represented only as logging frequency; raw food items, calories, and personal dietary restrictions are omitted. Wearable data is represented only as sync frequency and active days; raw health metrics are excluded.
- **Multi-Tenant Isolation**: Every database query, Redis cache key, and AI tool execution enforces strict tenant ID and member ownership boundaries. Cross-tenant access is strictly blocked at controller, service, and data layers.

## 3. Role-Based Access Control (RBAC)
- **Member Access**: Members have access only to their personal "Fitness Momentum" and positive progress indicators. Internal retention risk scores and churn metrics are strictly hidden from member view.
- **Personal Trainer Scope**: Personal trainers can view engagement summaries only for members with an active `TrainerClientAssignment`.
- **Staff / Manager Scope**: Outlet and organisation managers can access aggregate metrics and operational retention risk registers for follow-up coordination without accessing private medical notes.

## 4. AI Safety & Non-Autonomous Boundaries
- **No Autonomous Messaging**: The system produces internal workflow states (`NO_ACTION`, `FOLLOW_UP_RECOMMENDED`, `FOLLOW_UP_IN_PROGRESS`, `REENGAGED`) for staff visibility, but never sends automated SMS, email, or WhatsApp messages.
- **No Autonomous Commercial Mutations**: AI never suspends, cancels, or renews memberships, and never modifies billing or bookings autonomously.
- **No Psychological / Medical Diagnoses**: The system strictly avoids clinical terminology (e.g. depression, anxiety, burnout, clinical fatigue). Model responses are automatically validated and sanitized against disallowed clinical terms.
- **Prompt Injection Defense**: All user-supplied prompts and queries are screened for jailbreak patterns and adversarial instructions.
