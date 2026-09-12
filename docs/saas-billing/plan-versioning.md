# Plan Versioning Architecture

Detailed specification for versioning SaaS commercial tiers.

## Historical Preservation
Historical billing records and invoices rely on the immutable plan version active during that billing period.
- Subscriptions store both `planId` and `planVersionId`.
- Invoices store historical line item descriptions and unit prices captured at the time of finalization.
- Re-running pricing algorithms for an old period reconstructs the exact state using `SaasPlanVersion`.

## Migration Policies
If a gym wishes to adopt updated pricing or higher allowances of a newer plan version, an explicit upgrade workflow (`POST /api/v1/saas-billing/subscription/upgrade`) is invoked.
