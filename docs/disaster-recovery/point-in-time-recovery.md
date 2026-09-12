# Point-in-Time Recovery (PITR) Guide

## 1. Concept & Scope
Point-in-Time Recovery allows restoring the FitCore PostgreSQL database to any specific second within the configured WAL retention window (e.g., 7 to 14 days).

This is critical for scenarios involving:
1. Accidental table drop or truncate by an operator.
2. Ransomware or application logic bug that corrupted transactions at a known timestamp $T_{\text{corruption}}$.

---

## 2. Selection of Recovery Target

```text
Full Snapshot (00:00 UTC) ──────── WAL Archive Stream ────────► (04:15 UTC Malicious Bug)
          │                                                              │
          └──────── Replay WALs up to Target: 2026-09-12 04:14:59Z ──────┘
```

Recovery targets can be selected via:
- **Exact Timestamp**: `recovery_target_time = '2026-09-12 04:14:59 UTC'`
- **Named Restore Point**: `recovery_target_name = 'pre_deployment_v2_1'`
- **Target LSN**: Specific Log Sequence Number from postgres log.

---

## 3. Operational PITR Steps

1. Launch new target RDS/PostgreSQL instance from base snapshot prior to target time.
2. Apply `postgresql.conf` parameters:
   ```ini
   restore_command = 'aws s3 cp s3://fitcore-wal-archives/%f %p'
   recovery_target_time = '2026-09-12 04:14:59 UTC'
   recovery_target_action = 'promote'
   ```
3. Start database in recovery mode. PostgreSQL replays WAL segments sequentially until reaching target timestamp.
4. Promote recovered database.
5. Point read-only smoke-test suite against promoted database.
6. Verify data integrity and calculate Observed RPO.
