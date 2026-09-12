# Disaster Recovery Testing & Drills Guide

## 1. Drill Cadence & Testing Schedule

FitCore enforces regular recovery testing across multiple drill profiles:

| Drill Type | Frequency | Environment | Target Components | Success Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **Automated Checksum & Decryption Probe** | Daily (Automated) | Isolated Sandbox | Encrypted Dumps | 100% checksum match, KMS key valid |
| **Database Restore & Schema Drill** | Weekly | DR Sandbox | PostgreSQL Master | Observed RTO `< 60s` (drill), zero schema drift |
| **Data Integrity & Business Invariant Audit** | Bi-Weekly | DR Sandbox | Foreign Keys & Business Rules | Zero orphan records, zero overbooking |
| **Simulated Payment Reconciliation Drill** | Monthly | DR Sandbox | Payment Gateway Mock | 100% duplicate charges suppressed |
| **Full Platform Catastrophic Outage Drill** | Quarterly | Staging DR Account | End-to-End Infrastructure | Observed RTO `< 60 min`, all smoke tests pass |

---

## 2. Automated Test Suite

Run the automated DR test suite on demand:
```bash
pnpm --filter @fitcore/api test:e2e -- test/disaster-recovery.e2e-spec.ts
```
All 13 test suites validate:
- Encrypted backup creation
- Corruption detection
- Non-destructive integrity auditing
- Business invariant compliance
- Idempotent payment reconciliation
- Privacy tombstone protection (Day 53)
- Degraded mode fallback behavior
- Formal DR incident lifecycles
