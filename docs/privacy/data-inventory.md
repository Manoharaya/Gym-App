# Personal Data Inventory

FitCore maintains a cataloged personal data inventory across 24 distinct categories.

| Category | Domain | Entity | Classification | Purpose | Retention | Deletion Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IDENTITY** | `auth` | `User` | PERSONAL | ACCOUNT_MANAGEMENT | Duration of Account | ANONYMIZE |
| **PROFILE** | `members` | `MemberProfile` | PERSONAL | MEMBERSHIP_MANAGEMENT | Duration of Membership | ANONYMIZE |
| **HEALTH** | `health` | `HealthScreening` | HIGHLY_SENSITIVE | HEALTH_SCREENING | 7 Years (Statutory Healthcare) | DELETE |
| **MEDICAL_DOCUMENT** | `health` | `MedicalClearance` | HIGHLY_SENSITIVE | HEALTH_SCREENING | 7 Years (Statutory Healthcare) | DELETE |
| **WEARABLE** | `wearables` | `HealthDataRecord` | HIGHLY_SENSITIVE | WEARABLE_SYNC | 2 Years | DELETE |
| **FITNESS** | `progress` | `BodyMeasurement` | PERSONAL | TRAINING | Duration of Membership | DELETE |
| **TRAINING** | `training-plans`| `Workout` | PERSONAL | TRAINING | Duration of Membership | DELETE |
| **NUTRITION** | `nutrition` | `FoodLog` | PERSONAL | NUTRITION | Duration of Membership | DELETE |
| **ATTENDANCE** | `attendance` | `AttendanceRecord`| INTERNAL | ACCESS_CONTROL | 3 Years | ANONYMIZE |
| **BOOKING** | `bookings` | `Booking` | INTERNAL | BOOKING | 3 Years | ANONYMIZE |
| **MEMBERSHIP** | `memberships` | `MemberMembership`| INTERNAL | MEMBERSHIP_MANAGEMENT | 7 Years (Tax statutory) | RETAIN |
| **PAYMENT** | `payments` | `PaymentTransaction`| SENSITIVE | PAYMENT_PROCESSING | 7 Years (Tax statutory) | RETAIN |
| **FINANCIAL** | `payments` | `Invoice` | SENSITIVE | LEGAL_COMPLIANCE | 7 Years (Tax statutory) | RETAIN |
| **COMMUNICATION** | `communication`| `Communication` | PERSONAL | COMMUNICATION | 1 Year | DELETE |
| **AI_INTERACTION** | `ai` | `AIRequest` | PERSONAL | AI_PERSONALIZATION | 90 Days | DELETE |
| **ENGAGEMENT** | `engagement` | `EngagementProfile`| INTERNAL | MEMBERSHIP_MANAGEMENT | Duration of Membership | DELETE |
| **RETENTION** | `retention` | `RetentionAnalysis`| INTERNAL | ANALYTICS | 1 Year | ANONYMIZE |
| **SECURITY** | `security` | `SecurityEvent` | INTERNAL | SECURITY | 2 Years | RETAIN |
| **DEVICE** | `security` | `UserDevice` | PERSONAL | SECURITY | Duration of Account | DELETE |
| **AUDIT** | `audit` | `AuditLog` | INTERNAL | LEGAL_COMPLIANCE | 7 Years (Statutory Audit) | RETAIN |
| **DOCUMENT** | `documents` | `MemberDocument` | SENSITIVE | ACCOUNT_MANAGEMENT | Duration of Membership | DELETE |
| **CONSENT** | `consent` | `ConsentRecord` | INTERNAL | LEGAL_COMPLIANCE | Indefinite Legal Evidence | RETAIN |
| **MARKETING** | `communications`| `CommPreference` | PERSONAL | MARKETING | Duration of Account | DELETE |
| **CONTACT** | `members` | `MemberProfile` | PERSONAL | ACCOUNT_MANAGEMENT | Duration of Account | ANONYMIZE |
