# Privacy Testing Strategy

## Test Coverage Overview

FitCore validates privacy features across four distinct testing levels:

### 1. Unit Tests
- Policy evaluation (`canProcessData`, `canUseForAI`, `canDeleteData`).
- State machine transition assertions.
- Cryptographic pseudonymization and anonymization helpers.

### 2. Integration Tests
- End-to-end data export lifecycle (request -> encrypt -> signed download -> verify content).
- End-to-end deletion orchestration (draft plan -> check holds -> execute multi-domain deletion).
- Retention batch processor (cut-off discovery -> hold check -> purge expired records).

### 3. Security & Multi-Tenant Tests
- Cross-tenant isolation (Org A cannot view Org B privacy requests).
- IDOR defense (Member A cannot cancel Member B's request).
- Step-Up verification (sensitive requests require valid step-up token).
- Secret redaction (assert zero passwords, tokens, or provider keys in exports).

### 4. Concurrency Tests
- Simultaneous export requests handle locking safely.
- Simultaneous deletion requests execute idempotently without double-deleting.
