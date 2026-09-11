# Data Classification Standard

FitCore categorizes all persisted and in-flight information into five structured security classifications.

## Classifications

### 1. PUBLIC
- **Definition**: Information intended for unrestricted public consumption.
- **Examples**: Gym outlet opening hours, public class schedules, membership pricing tiers, public blog articles.
- **Controls**: Cached via CDN, public read access, no authentication required.

### 2. INTERNAL
- **Definition**: Non-public operational data internal to club staff and systems, without sensitive personal attributes.
- **Examples**: Facility access turnstile logs, attendance counts, booking confirmation IDs, operational audit metadata.
- **Controls**: Authenticated session required, tenant-scoped, staff role checks.

### 3. PERSONAL
- **Definition**: Information identifiable to an individual member, customer, or employee.
- **Examples**: Full name, email address, telephone numbers, preferred name, workout history, nutrition logs, personal goals.
- **Controls**: Tenant isolation, member-self authorization, encrypted in transit, exportable on request.

### 4. SENSITIVE
- **Definition**: Confidential financial, identification, or contractual records requiring heightened protection.
- **Examples**: Masked payment card numbers (last 4 digits only), invoice line items, tax invoices, uploaded identity verification documents.
- **Controls**: Step-up authentication for export/deletion, signed object-storage URLs, statutory accounting retention holds.

### 5. HIGHLY_SENSITIVE
- **Definition**: Special category data, including health indicators, clinical clearance documents, and continuous biometric telemetry.
- **Examples**: Pre-exercise PAR-Q medical answers, physician clearance certificates, continuous resting heart rate, sleep architecture, ECG/SpO2 readings.
- **Controls**: Explicit consent required, AES-256-GCM encryption at rest, strict redaction from general staff views, exclusion from AI context unless explicitly authorized.
