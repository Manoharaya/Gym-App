# FitCore Health Data Protection & Privacy Architecture

## Overview

Member health and medical data (PAR-Q responses, health screenings, injury histories, and physician medical clearance certificates) constitute sensitive personal health information. FitCore enforces strict technical and administrative safeguards to protect this data in compliance with GDPR, HIPAA, and Australian Privacy Principles (APP).

```mermaid
graph TD
    Client[Mobile / Web Client] -->|TLS 1.3 / Authenticated JWT| API[FitCore API Gateway]
    API --> PermGuard[PermissionsGuard & TenantGuard]
    
    subgraph Access Partitioning
        PermGuard -->|Member Access| OwnData[Self Data Only (IDOR Check)]
        PermGuard -->|Staff Role: Reception| BasicProfile[Basic Profile Only (403 on Health Docs)]
        PermGuard -->|Staff Role: Trainer/Manager| ScreeningView[Screening & Injury Read]
    end

    subgraph Storage & Logging Safeguards
        API --> Sanitizer[Log Sanitization Filter]
        Sanitizer --> Audit[System Logs: Zero Health PII]
        API --> Storage[Signed URL Storage Abstraction]
        Storage --> EncryptedFiles[(Physical Document Storage)]
    end
```

---

## 1. Access Control Matrix for Health Entities

| Role | PAR-Q Responses | Health Screening | Injury Records | Medical Clearance Certs |
|---|---|---|---|---|
| **Member (Self)** | Read / Write | Read / Write | Read / Write | Read / Write |
| **Member (Other)** | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Superadmin** | Read / Review | Read / Review | Read / Review | Read / Review |
| **Organisation Admin** | Read / Review | Read / Review | Read / Review | Read / Review |
| **Outlet Manager** | Read / Review | Read / Review | Read / Review | Read / Review (Scoped) |
| **Trainer** | Read / Flagged | Read Only | Read / Update Notes | Read Only |
| **Reception Staff** | Check Status (Cleared/Pending) | ❌ Restricted | ❌ Restricted | ❌ 403 Forbidden |

### Strict Reception Guard
Reception staff require visibility over check-in status (e.g. whether a member is cleared to exercise), but **must never** inspect detailed physician notes, pathology, or medical clearance documents. The FitCore storage controller rejects document download requests for `MEDICAL_CLEARANCE` types when invoked by `RECEPTION` users with `403 Forbidden: Reception staff cannot access medical clearance documents`.

---

## 2. Zero Health Logging Policy

Application logging frameworks (`Pino`, `NestJS Logger`) strictly sanitize all payloads before recording:
- Question answers (e.g. "Do you have heart trouble?", "Are you on blood pressure medications?") are never logged.
- Medical condition text, medication names, and allergy lists are redacted from access logs and HTTP telemetry.
- Document binaries and base64 signature strings are excluded from log statements.
- System logs record event occurrence only:
  ```json
  {
    "event": "HEALTH_SCREENING_UPDATED",
    "memberId": "uuid-1234",
    "timestamp": "2026-09-07T00:00:00Z",
    "requestId": "req-9876"
  }
  ```

---

## 3. Storage Security & Path Traversal Defense

Member documents (physician clearances, government IDs, contracts) are handled via a strict storage provider interface:
- **No Direct Public URLs**: Files are stored in secure, private directories or object storage buckets without public read access.
- **Signed URL Access**: Access is only granted through time-limited (15-minute) cryptographic presigned URLs generated server-side following role authorization.
- **Path Traversal Protection**: All object keys and filenames are sanitized:
  ```typescript
  const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeKey = `${organisationId}/${memberId}/${category}/${uuid}-${safeFilename}`;
  ```
- Any key containing `..` or leading slashes is immediately rejected.
