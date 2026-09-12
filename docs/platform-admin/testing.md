# Platform Superadmin Verification & Testing Strategy

## Test Suite Coverage
The platform administration control plane is validated across multiple testing dimensions in `services/api/test/platform-admin.e2e-spec.ts`:

1. **Explicit Permission Enforcement**: Verifies that a Superadmin without specific platform permissions (e.g. missing `platform.feature_flags.manage`) is strictly denied mutation rights.
2. **Tenant Lifecycle State Machine**: Tests activation, pre-suspension impact preview, suspension, reactivation, and archiving.
3. **Usage Projection**: Tests live metric aggregation and snapshot projection generation.
4. **AI Gateway Governance**: Validates that token counts, costs, and feature latencies are calculated without secret leakage.
5. **Support Ticketing & Internal Note Boundary**: Ensures `INTERNAL_ONLY` notes are strictly filtered out from customer responses.
6. **Feature Flags & Deterministic Rollout**: Validates that deterministic hashing produces stable 0-100% rollout assignments.
7. **Scoped Maintenance Mode**: Verifies maintenance mode activation and preservation of emergency paths.
8. **Platform Health Probes & Incidents**: Tests comprehensive health reporting and incident lifecycle tracking.
9. **Support Access & Step-Up Challenge**: Tests temporary support grant creation, step-up challenge consumption, and expiration.
10. **Data Quality Diagnostics**: Verifies detection of lifecycle anomalies and orphaned records.
