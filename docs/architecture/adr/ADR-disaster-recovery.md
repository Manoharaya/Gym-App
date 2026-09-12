# ADR: Disaster Recovery, Backup & Business Continuity Architecture

## Status
Accepted

## Context
FitCore is an enterprise multi-tenant gym management platform managing members, memberships, payments, turnstile physical access, bookings, and SaaS billing across hundreds of outlets. Any catastrophic failure (e.g. host corruption, ransomware, datacenter outage, administrator error, database corruption) risks business halt, uncollected revenue, physical lockout of gym members, or GDPR compliance violations.

Day 58 establishes a formal, production-grade Disaster Recovery (DR) and Business Continuity (BC) architecture centered on the core principle:
> **"A backup is not a recovery strategy until FitCore has successfully restored from it and verified that the recovered platform is secure, consistent, and capable of performing its critical business operations."**

## Decisions

1. **Backup Lifecycle & Immutability**:
   - Enforce lifecycle: `BACKUP → VERIFY → REPLICATE → RESTORE → VALIDATE → FAILOVER → RECOVER → TEST → DOCUMENT`.
   - Backups are encrypted with AES-256-GCM via KMS keys.
   - Cryptographic SHA-256 integrity checksums are computed immediately on dump creation.
   - Backups support object-lock immutability (`immutableUntil`) to defend against ransomware or malicious insider deletion.

2. **RPO & RTO Invariants**:
   - Target RPO: **15 minutes**; Target RTO: **60 minutes**.
   - No false SLA claims: RPO and RTO are recorded as `NOT MEASURED` unless demonstrated through empirical restore drill testing.
   - Multi-region automated failover is marked `NOT IMPLEMENTED` with manual DNS/replica promotion procedures documented.

3. **Non-Destructive Integrity & Business Auditing**:
   - Post-restore drills run automated non-destructive integrity checks (`DataIntegrityValidatorService` and `BusinessContinuityService`).
   - Invariant: Zero silent modifications or wiping of data during recovery validation.

4. **Payment & Billing Safety**:
   - Payments in `PROCESSING` or `UNKNOWN` state prior to disaster are **never automatically re-charged**.
   - Idempotency key matching prevents duplicate transactions.
   - Provider reconciliation resolves gateway state deterministically.

5. **Privacy Preservation (Day 53)**:
   - Restoring a legacy database backup must never resurrect members erased or forgotten under GDPR/privacy regulations.
   - Privacy tombstones are re-applied post-restore to keep erased profiles anonymized and archived.

6. **Degraded Mode & Fail-Secure Access**:
   - Turnstiles operate on fast cached policies and local reader buffers during network/API outages.
   - AI provider outages degrade to rule-based static templates; core gym operations remain 100% operational.

## Consequences
- Automated restore drills run regularly against isolated sandboxes.
- Strict multi-tenant isolation and RBAC are maintained during disaster recovery operations.
