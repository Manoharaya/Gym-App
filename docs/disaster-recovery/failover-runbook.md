# Regional Failover Runbook

## 1. Architectural Status: Multi-Region Failover
> [!WARNING]
> **STATUS**: `NOT IMPLEMENTED` (Automated Active-Active Cross-Region Failover).  
> In compliance with Day 58 rules, FitCore does not claim automated multi-region active-active failover because current primary infrastructure resides in a single AWS region (Sydney: `ap-southeast-2`) with cold off-site storage replication to Melbourne (`ap-southeast-4`).

---

## 2. Manual Cross-Region Failover Procedure

In the event of a total AWS Sydney region failure, manual promotion to the cold secondary region follows:

```text
[ AWS Primary Region (ap-southeast-2) DOWN ]
                       │
                       ▼
    [ 1. Authenticate to Secondary AWS Account ]
                       │
                       ▼
 [ 2. Deploy Terraform / CDK Infrastructure in ap-southeast-4 ]
                       │
                       ▼
 [ 3. Restore PostgreSQL from Replicated S3 Encrypted Backups ]
                       │
                       ▼
 [ 4. Execute Data Integrity & Privacy Reconciliation ]
                       │
                       ▼
 [ 5. Update Global Route 53 DNS Record to Secondary Ingress ]
                       │
                       ▼
 [ 6. Run Smoke Tests & Monitor Outlets ]
```

---

## 3. Rollback Procedure
If the secondary environment fails initial validation gates prior to DNS cutover:
1. Halt DNS cutover immediately.
2. Maintain primary region read-only if partially accessible.
3. Diagnose restore failure using `DataIntegrityValidatorService` logs.
4. Correct schema/migration drift and re-run restore drill.
