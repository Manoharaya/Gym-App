# FitCore Scalability Strategy — Day 57

## Horizontal vs. Vertical Scaling

### 1. API Gateway & HTTP Tier (Horizontal)
- The NestJS API is stateless; sessions are maintained via JWT tokens and verified against Redis / database token tables.
- Multiple API container replicas (e.g. 2–8 containers behind AWS ALB / NGINX) run without shared in-memory state.
- Distributed scheduling and cron executions use distributed locks (PostgreSQL `advisory_lock` or Redis `SETNX`) to ensure exactly-once business execution across replicas.

### 2. Database Tier (Vertical + Read Replicas)
- PostgreSQL primary instance handles all transactional writes (`bookings`, `payments`, `memberships`, `check-ins`).
- Read-replicas handle heavy BI, financial historical audits, and multi-outlet analytics reporting.
- High-churn tables leverage composite B-tree indexes; data retention jobs (Day 53) purge stale logs older than 90 days.

### 3. Worker & Queue Tier (Horizontal Concurrency)
- BullMQ worker pods scale based on queue depth:
  - High priority: `notifications`, `billing-finalization`
  - Normal priority: `ai-batch-jobs`, `integrations-sync`
  - Low priority: `audit-flushing`, `analytics-projections`
- Concurrency throttles prevent worker tasks from exhausting third-party API rate limits (Stripe, Twilio, OpenAI, Xero).

### 4. Noisy-Neighbour & Multi-Tenant Defense
- Rate limits are calculated per tenant (`organisationId`), preventing a single large gym network from consuming shared API or worker capacity.
- Cache keys enforce strict tenant namespacing (`org:{orgId}:...`).
