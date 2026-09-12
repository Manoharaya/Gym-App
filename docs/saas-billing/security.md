# Security & Tenant Isolation

Defense-in-depth security architecture for SaaS billing.

## Enforcements
1. **Multi-Tenant Guard (`TenantGuard`)**: Ensures users can only query subscriptions and invoices belonging to their authenticated organisation boundary.
2. **Role Boundaries (`RolesGuard`)**: Only `ORGANISATION_OWNER`, `FINANCE`, and `SUPERADMIN` roles can view billing overviews or download invoices. Regular gym members receive `403 Forbidden`.
3. **Immutability of Invoices**: Finalized invoices have no mutation endpoints, preventing tampering.
4. **Zero Raw Payment Credentials**: Cards and bank accounts are never processed or retained within FitCore servers.
