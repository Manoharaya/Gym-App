# Accounting Security, Multi-Tenancy & Data Privacy

## 1. Multi-Tenant Isolation (Organisation Scoping)

- Every accounting resource (`AccountingConnection`, `AccountingMapping`, `AccountingTaxMapping`, `AccountingExternalReference`, `AccountingSyncJob`, `AccountingConflict`) is strictly indexed by `organisationId`.
- Organisation A cannot:
  - View or modify Organisation B's connection, credentials, or OAuth tokens.
  - Trigger sync jobs or reconciliation runs for Organisation B.
  - View Organisation B's mappings, conflicts, or reconciliation reports.
- Tenant isolation is enforced at the database query level; requests without a verified organisation scope throw `ForbiddenException(403)`.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Role | Connection & OAuth | Mappings & Tax | Trigger Sync & Resync | Reconciliation & Conflicts | Export Reports |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SUPERADMIN** | Yes (Platform) | Yes (Platform) | Yes (Platform) | Yes (Platform) | Yes (Platform) |
| **ORGANISATION_OWNER** | Full | Full | Full | Full | Full |
| **FINANCE** | View / Reconnect | Full | Full | Full | Full |
| **OUTLET_MANAGER** | Read-only (Own Club) | Read-only (Own Club) | None | Read-only (Own Club) | None |
| **RECEPTION** | No (403) | No (403) | No (403) | No (403) | No (403) |
| **TRAINER** | No (403) | No (403) | No (403) | No (403) | No (403) |
| **MEMBER** | No (403) | No (403) | No (403) | No (403) | No (403) |

---

## 3. Strict Health Data Privacy Boundary

Accounting platforms are general ledgers, not electronic health record (EHR) systems.

The `AccountingNormalizerService` strictly sanitizes all payloads before external transmission:
- **Allowed Fields**: Member First Name, Last Name, Billing Email, Billing Street, City, State, Postal Code, Country.
- **Prohibited Fields (Never Transmitted)**:
  - Physical Activity Readiness Questionnaire (PAR-Q) answers
  - Injury histories, medical notes, doctor clearances
  - Wearable metrics (heart rate, VO2 max, sleep, strain, steps)
  - Private trainer notes, workout logs, body composition measurements
  - AI chat transcripts, receptionist conversations, retention risk scores

Automated tests assert that synchronized customer objects contain zero biometric or clinical fields.
