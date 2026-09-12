# Privacy Preservation & Anti-Resurrection Recovery Guide

## 1. The Backup-Privacy Conflict (Day 53 Integration)

Under GDPR (Article 17: Right to Erasure) and Privacy compliance established in Day 53:
- When a member requests account erasure, FitCore deletes or anonymizes their PII (name, email, medical notes, phone).
- However, historical database backups taken *before* the deletion request will still contain that personal data in un-anonymized form.

```text
Day 50 Backup (Contains John Doe PII)
          │
          ▼
Day 52 Member submits GDPR "Right to Erasure" ──► PII Anonymized & Tombstoned in DB
          │
          ▼
Day 58 Disaster Strikes ──► Restoring Day 50 Backup would resurrect John Doe!
```

---

## 2. Anti-Resurrection Strategy: Privacy Tombstones

FitCore prevents the resurrection of erased member records through **Privacy Tombstone Reconciliation**:

1. **Privacy Tombstone Ledger**:
   - An append-only, tamper-proof record of erased user emails/IDs is replicated to off-site cold storage (`s3://fitcore-privacy-tombstones/`).
2. **Post-Restore Reconciliation**:
   - Immediately following any database restore (before opening public ingress), `DisasterRecoveryReconciliationService.reconcilePrivacyState()` is executed.
   - Any user record matching the privacy erasure ledger is immediately re-anonymized (`deleted_[id]@privacy-erased.fitcore.local`, `firstName: 'ANONYMIZED'`), marked with `deletedAt`, and their member profiles are marked `ARCHIVED`.
3. **Audit Verification**:
   - Audit events are written documenting that privacy tombstones were respected post-disaster.
