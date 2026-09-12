# Object Storage Recovery Guide

## 1. Storage Scope & Classification
FitCore utilizes AWS S3 for binary assets:
- **Private Member Documents**: PAR-Q medical forms, signed liability waivers, membership contracts.
- **Gym Media**: Exercise demo videos, trainer certification scans, organisation branding assets.
- **Export Jobs**: Privacy data export bundles, financial ledger CSV reports.

---

## 2. Replication & Immutability Strategy

```
[ Primary S3 Bucket (Sydney) ]
        │
        ├── S3 Versioning (Enabled: Permanent version history)
        ├── S3 Object Lock (30-Day Legal Hold on contracts & waivers)
        │
        ▼ (Continuous Cross-Region Replication)
[ Secondary Cold DR Bucket (Melbourne) ]
        │
        └── Read-only IAM access, separate AWS account
```

---

## 3. Recovery Procedure

1. **Bucket Accidental Deletion / Ransomware**:
   - Revert to prior non-deleted object versions via AWS S3 batch operations.
2. **Region Outage**:
   - Switch S3 bucket alias / CloudFront origin to `s3://fitcore-cold-dr-assets-melbourne`.
   - Validate pre-signed URL generation with KMS key in the secondary region.
