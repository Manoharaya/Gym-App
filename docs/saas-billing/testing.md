# Testing & Quality Assurance

Verification methodologies for SaaS billing.

## Automated Test Coverage
The suite in `services/api/test/saas-billing.e2e-spec.ts` covers:
1. **Plan Lifecycle**: Creation, versioning, publishing, retirement, immutability.
2. **Subscription Flow**: Trial creation, activation, status transitions.
3. **Domain Isolation**: Asserting zero mutation of `MemberMembership` or member `Invoice`.
4. **Quota Limits**: Allowing valid creation, soft limit warnings at 80%, overage allowed vs blocked, fail-closed for non-subscribed orgs.
5. **Idempotency**: Asserting replayed event payloads with identical keys return duplicate without double counting.
6. **Period Finalization**: Reconciling base plan + overages - credits = total in minor units.
7. **Proration & Downgrade Prevention**: Proving mathematical proration and blocking resource-conflicting downgrades.
8. **Dunning**: Retrying overdue invoices without locking members out of doors.
9. **Superadmin & Reconciliation**: Reconciling internal records vs provider mocks.
10. **Multi-Tenant Security**: IDOR and RBAC defense.
