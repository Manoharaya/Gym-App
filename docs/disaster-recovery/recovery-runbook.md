# Disaster Recovery Operational Runbook

## Phase 1: Incident Declaration & Assessment

1. **Declare DR Incident**:
   - Platform operator or on-call engineer navigates to Superadmin Console &rarr; Platform Operations &rarr; Disaster Recovery.
   - Or invokes API: `POST /api/v1/platform-admin/disaster-recovery/incidents`
   - Set severity: `SEV0_CRITICAL`.
2. **Isolate Compromised Systems**:
   - If security compromise / ransomware is suspected:
     - Sever network egress from application pods to prevent command-and-control communication.
     - Revoke compromised database and KMS service credentials.

---

## Phase 2: Trusted Backup Selection

1. **Query Verified Backups**:
   ```bash
   pnpm exec ts-node scripts/disaster-recovery/verify-backup.ts <candidate_backup_path>
   ```
2. **Verify SHA-256 Signature**:
   - Ensure the candidate backup's SHA-256 hash matches the authoritative record in the offline backup registry.
   - If latest backup is corrupt, select the next most recent verified backup and compute Observed RPO.

---

## Phase 3: Restoration Execution

1. **Restore PostgreSQL Database**:
   ```bash
   pnpx tsx scripts/disaster-recovery/restore-database.ts <backup_file_path> --target-env DR_SANDBOX
   ```
2. **Apply Database Migrations**:
   ```bash
   pnpm --filter @fitcore/api exec prisma migrate status
   ```
3. **Hydrate Redis Datastore**:
   - Reload AOF/RDB persistent dump for BullMQ queue state.

---

## Phase 4: Validation Gates (Before Opening Traffic!)

1. **Execute Data Integrity Audit**:
   ```bash
   pnpx tsx scripts/disaster-recovery/validate-recovery.ts
   ```
   - Must return `PASS` with 0 foreign-key violations and 0 orphaned records.
2. **Reconcile In-Flight Payments**:
   - Run `DisasterRecoveryReconciliationService.reconcileUnknownPayments()`.
   - Ensure zero duplicate charges against completed idempotency keys.
3. **Re-Apply Privacy Tombstones (Day 53 Compliance)**:
   - Run `DisasterRecoveryReconciliationService.reconcilePrivacyState()`.
   - Verify erased accounts remain anonymized.

---

## Phase 5: Traffic Resumption & Monitoring

1. **Switch Ingress / DNS**:
   - Update Route 53 / Cloudflare DNS records to point to restored host infrastructure.
2. **Warm Application & Cache**:
   - Verify health probe: `GET /health/ready` returns HTTP 200.
3. **Resolve DR Incident**:
   - Update incident status to `RESOLVED` with observed RTO and RPO metrics.
