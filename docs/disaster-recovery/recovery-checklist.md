# Disaster Recovery Checklist

### 1. Before Recovery
- [ ] DR Incident declared with assigned Incident Commander
- [ ] Incident severity classified (`SEV0_CRITICAL`, `SEV1_HIGH`, `SEV2_MODERATE`)
- [ ] Compromised compute pods isolated
- [ ] Target recovery environment provisioned and verified
- [ ] Candidate backup verified (SHA-256 checksum match, decryptable)
- [ ] Target RPO (15m) and Target RTO (60m) logged

### 2. Infrastructure & Data Restoration
- [ ] KMS decryption keys online and verified
- [ ] PostgreSQL restored from verified backup
- [ ] Point-in-time WAL replay completed (if recovering to specific timestamp)
- [ ] Redis persistent state restored (BullMQ queues hydrated)
- [ ] Prisma migrations status verified (`prisma migrate status`)
- [ ] Stateless API and Worker container images deployed from known-good release tag

### 3. Verification & Reconciliation Gates
- [ ] Data integrity audit completed: 0 foreign-key errors, 0 orphan records
- [ ] Business continuity validation passed: class capacities locked, membership scopes verified
- [ ] In-flight payments reconciled: 0 duplicate charges, unknown states verified with gateway
- [ ] Day 53 Privacy tombstones re-applied: 0 erased member profiles resurrected
- [ ] Security validation: revoked sessions stay revoked, TOTP secrets intact

### 4. Traffic Resumption
- [ ] Core health probe responds: `GET /health/ready` returns 200 OK
- [ ] Public DNS / Ingress cutover initiated
- [ ] Live turnstile reader check-ins verified
- [ ] Observed RTO and Observed RPO recorded in DR Incident audit log
- [ ] Incident transitioned to `RESOLVED` and post-mortem scheduled
