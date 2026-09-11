# Marketplace Foundation — Testing & Quality Assurance

## 1. Test Suite Topology
Testing covers unit, integration, and E2E scenarios across all marketplace components:
* **Discovery & Search**: Tests category filters, query keywords, pagination, public vs private visibility filtering.
* **Publishing Lifecycle**: Tests draft creation, submission for review, admin approval/rejection, version releasing.
* **Pre-Flight Validation**: Tests scope compatibility, duplicate installation prevention, missing dependency errors, and conflict detection.
* **Health PII Quarantine**: Verifies that apps requesting medical biometrics are blocked without explicit consent.
* **Tenant Isolation**: Ensures organizations cannot view or mutate other tenants' installations.
* **Verified Reviews**: Tests that uninstalled organizations cannot submit reviews, duplicate reviews are rejected, and average ratings update in real-time.
* **Health Probes**: Tests installation health recording and failing state alerts.

## 2. Running the E2E Test Suite
```bash
# Run marketplace E2E suite
pnpm --filter @fitcore/api test test/marketplace.e2e-spec.ts

# Run regressions
pnpm --filter @fitcore/api test test/developer-platform.e2e-spec.ts
pnpm --filter @fitcore/api test test/integrations.e2e-spec.ts
pnpm --filter @fitcore/api test test/resource-capacity-intelligence.e2e-spec.ts
pnpm --filter @fitcore/api test test/accounting-integration.e2e-spec.ts
```
