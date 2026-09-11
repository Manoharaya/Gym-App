# FitCore API Scopes & Permission Hierarchy

## 1. Overview
FitCore enforces fine-grained, least-privilege API authorization using formal **Scopes**. Scopes constrain the capabilities of both API Keys and OAuth 2.0 access tokens.

## 2. Sensitivity Classifications
Every scope is classified into one of three sensitivity tiers:
1. **`STANDARD`**: Low-to-moderate risk read/write operations (e.g. browsing public classes or checking attendance). Can be granted during standard API key generation.
2. **`SENSITIVE`**: Administrative or bulk operations (e.g. member directory export, staff scheduling modifications). Requires elevated administrative role during configuration.
3. **`RESTRICTED`**: Highly confidential health, biometric, medical, or payment data (e.g. `health:read`, `payments:write`). Must NEVER be grouped with general scopes and requires explicit end-user consent.

## 3. Scope Registry Catalog

| Scope | Category | Sensitivity | Description | Explicit Consent |
| :--- | :--- | :--- | :--- | :--- |
| `members:read` | MEMBERS | `STANDARD` | Read member profiles, status, contact info (PII) | No |
| `members:write` | MEMBERS | `SENSITIVE` | Create, update, or deactivate member records | No |
| `classes:read` | CLASSES | `STANDARD` | Read class schedules, timetables, and room capacities | No |
| `classes:write` | CLASSES | `SENSITIVE` | Create, update, or cancel class sessions | No |
| `bookings:read` | BOOKINGS | `STANDARD` | View booking records and attendance status | No |
| `bookings:write` | BOOKINGS | `STANDARD` | Create or cancel class and trainer bookings | No |
| `memberships:read` | MEMBERSHIPS | `STANDARD` | View membership plans, pricing, and tiers | No |
| `trainers:read` | TRAINERS | `STANDARD` | View trainer bios, specializations, and availability | No |
| `attendance:read` | ATTENDANCE | `STANDARD` | View check-in and check-out event history | No |
| `health:read` | HEALTH | `RESTRICTED` | Read wearable metrics, heart rate, and PAR-Q (Isolated) | **YES** |
| `payments:read` | PAYMENTS | `SENSITIVE` | View invoices, payment transactions, and statuses | No |
| `webhooks:manage` | WEBHOOKS | `SENSITIVE` | Create, configure, and delete webhook endpoints | No |

## 4. Privacy Boundary Isolation
> **CRITICAL**: The `health:read` scope is strictly isolated. Even if an application has `members:read`, the Member profile response will NEVER include PAR-Q, injury notes, medical clearance, or wearable metrics. Health data is only exposed through dedicated, quarantined health endpoints requiring `health:read` and active user consent.
