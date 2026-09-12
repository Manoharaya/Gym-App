# Pricing Engine

Deterministic integer arithmetic for commercial SaaS billing.

## Calculation Formula
At period conclusion or invoice generation:
```
Base Subscription Fee (SaasPlanVersion)
+
Metered Usage & Overages (Sum of all active meters)
+
Add-on Packages
-
Promotional Discounts
-
Applied Credit Balances (SaasCreditBalance)
+
Configured Sales Taxes
=
Total Invoice Amount (in minor cents)
```

## Minor Unit Discipline
All amounts are represented in integer minor units (e.g., cents for AUD/USD). Floating-point arithmetic (`0.1 + 0.2 === 0.30000000000000004`) is strictly forbidden across all pricing services.
