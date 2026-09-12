# Database Recovery & Restore Procedures

## 1. Objective & Invariants
Database restoration must strictly adhere to the following operational invariants:
- **Never perform destructive restore testing on production**. All drills use isolated environments or target schemas (`DR_SANDBOX`).
- **Validate migrations before opening traffic**. Restored databases must match the expected Prisma migration state.
- **Enforce foreign-key & business integrity**. A restored database is not valid until validated by `DataIntegrityValidatorService` and `BusinessContinuityService`.

---

## 2. Restore Procedure

```text
[ Disaster Declared / Drill Initiated ]
                   │
                   ▼
       [ Select Trusted Backup Record ]
                   │
                   ▼
     [ Decrypt & Decompress Dump Stream ]
                   │
                   ▼
   [ Stream into Target DR PostgreSQL Instance ]
                   │
                   ▼
        [ Run Prisma Schema Validation ]
        `pnpm exec prisma migrate status`
                   │
                   ▼
      [ Run Data Integrity Validation ]
   - Foreign-key consistency
   - Zero orphaned member/booking records
                   │
                   ▼
    [ Run Business Continuity Validation ]
   - Capacity locks verified
   - Active memberships verified
   - No duplicate payment charges
                   │
                   ▼
      [ Update DNS / Application Ingress ]
```

---

## 3. Operational CLI Restore Execution

Execute automated restore to DR target:
```bash
pnpx tsx scripts/disaster-recovery/restore-database.ts <path_to_backup_file> [--target-env DR_SANDBOX]
```

Validate recovered state:
```bash
pnpx tsx scripts/disaster-recovery/validate-recovery.ts
```
