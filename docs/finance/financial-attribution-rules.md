# Financial Attribution Rules

## Overview

Accurate financial attribution is essential for multi-outlet fitness organisations. FitCore enforces strict, deterministic attribution rules to eliminate guesswork, speculative allocation, and cross-outlet contamination.

---

## Source-of-Truth Attribution Chain

1. **Transaction Linkage**:
   - Each `PaymentTransaction` is evaluated against its associated `Invoice` and `MemberMembership`.
   - Primary attribution link:
     $$\text{PaymentTransaction} \longrightarrow \text{MemberMembership}.\text{originOutletId} \longrightarrow \text{Outlet}$$

2. **Strict Non-Guessing Policy (`UNATTRIBUTED`)**:
   - If a transaction cannot be traced to a specific `originOutletId` (e.g. platform fees, unlinked member transactions, or legacy records without an origin outlet), the system **NEVER** guesses, estimates, or arbitrarily assigns it to an outlet.
   - Such transactions are explicitly classified as:
     - `outletId`: `"UNATTRIBUTED"`
     - `outletName`: `"Unattributed / Cross-Outlet"`
   - Organisation owners and financial analysts can view `UNATTRIBUTED` volume directly in the outlet performance breakdown.

3. **Multi-Location Member Usage**:
   - Members may check in, attend classes, or book personal training at multiple outlets across the organization.
   - However, **financial revenue attribution remains anchored to the member's home/origin outlet** (`originOutletId`), matching standard commercial gym accounting where the home branch holds the recurring membership cash flow.

4. **Multi-Currency Safety**:
   - Financial transactions at an outlet retain the native currency specified in the transaction/invoice.
   - Outlets operating in different countries/currencies are aggregated strictly within their currency silo.
