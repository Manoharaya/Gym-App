# Invoices & Period Finalization

Lifecycle, finalization, and immutability of SaaS commercial invoices.

## Finalization Workflow
1. At the conclusion of `SaasBillingPeriod`, `finalizePeriodAndGenerateInvoice()` executes.
2. Unfinalized `SaasUsageAggregate` records for the period are snapshotted and marked `isFinalized = true`.
3. An immutable `SaasInvoice` is created along with detailed `SaasInvoiceLine` records.
4. Available account credits are deducted.
5. Payment is attempted through `SaasBillingProvider`.
6. Upon payment success, status becomes `PAID` and `SaasBillingPeriod` advances to the next cycle.

## Immutability Guarantee
Finalized invoices are never deleted or rewritten. Any post-billing corrections require explicit adjustment lines or credit balance transactions.
