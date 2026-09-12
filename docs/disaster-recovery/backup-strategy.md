# Database Backup Strategy & Retention Policy

## 1. Backup Topology & Architecture

FitCore uses a multi-layered backup architecture combining continuous Write-Ahead Log (WAL) archiving with encrypted physical snapshots:

```
[ Primary PostgreSQL Instance ]
           │
           ├── Continuous WAL Archive ────► [ S3 WAL Bucket (kms:sse-s3) ]
           │                                      │
           │                                      ▼ (Continuous Replication)
           ├── Daily Full pg_dump ────────► [ S3 Primary Cold Storage ]
           │   (AES-256-GCM + Checksum)           │
           │                                      ▼ (S3 Cross-Region Replication)
           └── Hourly Volume Snapshots    [ S3 Secondary DR Bucket (Object Lock) ]
```

---

## 2. Retention Schedules & Immutability

| Backup Type | Frequency | Primary Retention | DR Cold Retention | Immutability Lock | Target RPO |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Continuous WAL** | Streaming | 7 Days | 14 Days | AWS Object Lock | `< 5 minutes` |
| **Full Encrypted Dump** | Every 24 hours | 30 Days | 90 Days | 30-Day Legal Lock | `< 24 hours` |
| **Storage Snapshots** | Every 6 hours | 14 Days | 30 Days | Compliance Lock | `< 6 hours` |
| **Financial Ledger Snapshots** | Monthly (End of Period)| 7 Years | 7 Years | Permanent WORM | `< 1 Month` |

---

## 3. Cryptographic Protection

1. **Envelope Encryption**:
   - Dumps are encrypted using AES-256-GCM.
   - Encryption keys are managed through AWS KMS (`kms-key-fitcore-primary`).
   - Private key material is strictly separated from application source code and deployment containers.
2. **Integrity Checksums**:
   - Immediately upon stream completion, a SHA-256 hash is computed and stored alongside the backup metadata record in `backup_records`.
3. **Least Privilege Access**:
   - Backups are stored in an isolated AWS account.
   - Application service accounts possess `PutObject` permissions only; `DeleteObject` is explicitly denied by IAM boundary policies.
