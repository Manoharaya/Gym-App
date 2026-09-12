# Backup Verification & Corruption Detection

## 1. Automated Verification Lifecycle

A backup job that exits with status `0` is not sufficient evidence of a recoverable state. FitCore enforces continuous automated verification:

```text
[ Backup Created ]
        │
        ▼
[ Automated Verifier Service ]
        │
        ├── 1. Existence Check (Verify object exists on storage)
        ├── 2. SHA-256 Checksum Validation (Recalculate & match stored hash)
        ├── 3. Header & KMS Decryptability Probe (Verify key has not been revoked)
        └── 4. Schema Envelope Validation (Verify valid SQL/PostgreSQL structure)
        │
        ├── Pass ──► Register BackupVerificationRecord (status: PASSED)
        │
        └── Fail ──► Alert Platform Admin (P1 Security/DR Incident)
```

---

## 2. Integrity Failure Modes & Alerts

| Failure Condition | Diagnostic Details | System Response |
| :--- | :--- | :--- |
| **Checksum Mismatch** | `SIMULATED_INTEGRITY_FAILURE: SHA-256 mismatch` | Marks backup `FAILED`, raises P1 Alert, isolates corrupted file |
| **KMS Key Inaccessible** | `KMS_DECRYPTION_ERROR: AccessDeniedException` | Raises P0 Alert, prompts key rotation/audit review |
| **Stale Backup (> 24h)**| `BACKUP_AGE_EXCEEDED: No completed backup in 24h` | Triggers automated snapshot, alerts on-call engineer |
| **Zero-Byte / Truncated Dump** | `INVALID_PAYLOAD: File size below minimum threshold` | Deletes broken pointer, re-attempts backup immediately |

---

## 3. Operational Command Verification

Run verification manually on any backup artifact via CLI:
```bash
pnpx tsx scripts/disaster-recovery/verify-backup.ts <backup_file_path> [--expected-hash <sha256>]
```
