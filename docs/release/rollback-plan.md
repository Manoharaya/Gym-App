# FitCore v1.0 — Production Rollback Plan

## 1. Rollback Trigger Criteria
A production rollback or emergency mitigation must be initiated if any of the following conditions occur post-deployment:
1. **Liveness / Readiness Failure**: Ingress fails health checks for > 2 consecutive minutes.
2. **Elevated Error Rate**: HTTP 5xx responses exceed 1% of total traffic over a 5-minute rolling window.
3. **Database Migration Deadlock or Table Lock**: Migration blocks core operational traffic.
4. **Tenant Isolation Anomaly**: Any log event indicating potential cross-tenant leakage.
5. **Core Workflow Halt**: User login, turnstile check-in, or payment webhook dispatch completely blocked.

---

## 2. Emergency Rollback Protocol

```
┌────────────────────────────────────────────────────────┐
│ 1. INCIDENT DECLARATION                                │
│ - On-call engineer flags P0 Deployment Blocker         │
│ - Freeze deployment pipeline                           │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 2. APPLICATION ROLLBACK                                │
│ - Point Kubernetes/ECS traffic back to previous image: │
│   fitcore-api:1.0.0-rc.0 (or previous stable commit)   │
│ - Instant traffic cutover (< 30 seconds)               │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 3. DATABASE COMPATIBILITY CHECK                        │
│ - Did migration make non-backward-compatible schema?   │
│   - ADD COLUMN (nullable / default): Safe to leave.    │
│   - RENAME / DROP: Forward-fix or restore from backup. │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 4. CACHE PURGE & SESSION RE-EVALUATION                 │
│ - Purge affected Redis route caches                    │
│ - Invalidate poisoned session tokens if necessary      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 5. VERIFY SYSTEM STABILIZATION                         │
│ - Run automated smoke test suite                       │
│ - Verify 0 error rate on metrics dashboard             │
└────────────────────────────────────────────────────────┘
```

---

## 3. Forward-Fix vs. Database Restore Decision Matrix
- **Additive Migrations (New Tables, Nullable Columns)**: Leave database schema forward; rollback application container image only.
- **Destructive Migrations (Dropped Tables, Altered Types)**: If data corruption occurred, restore affected tables from the pre-deployment KMS-encrypted backup using `RestoreTestService` procedures.
- **Communication**: Notify platform administrators and tenant gym owners via status page within 15 minutes of rollback initiation.
