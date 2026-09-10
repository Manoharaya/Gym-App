# Canonical Financial Metric Definitions

## Overview

The FitCore AI Finance Assistant references canonical definitions for all key financial metrics (`CANONICAL_FINANCIAL_METRICS`). The assistant explains formulas, data sources, and recognized limitations whenever users ask "What is X?" or "How is Y calculated?".

---

## Metric Reference Table

### 1. Gross Revenue
- **Definition**: Total monetary amount of all successful transactions processed before subtracting refunds.
- **Formula**: `Gross Revenue = Sum(Succeeded Payments)`
- **Source**: `PaymentTransaction (SUCCEEDED)`
- **Caveats**: Includes both membership recurring charges and one-off front-desk sales. Excludes pending or failed charges.

### 2. Net Revenue
- **Definition**: Gross revenue minus all processed customer refunds.
- **Formula**: `Net Revenue = Gross Revenue - Succeeded Refunds`
- **Source**: `PaymentTransaction` and `PaymentRefund (SUCCEEDED)`
- **Caveats**: Cash-basis recognition at the moment the refund is settled.

### 3. Collection Rate
- **Definition**: Percentage of scheduled recurring billing charges successfully collected during the billing cycle.
- **Formula**: `Collection Rate = (Recurring Collected / Recurring Billed) * 100`
- **Source**: `BillingCycle (Day 42 Recurring Billing Engine)`
- **Caveats**: Excludes one-off manual payments; focuses solely on automated membership recurring schedules.

### 4. Dunning Recovery Rate
- **Definition**: Proportion of previously failed recurring payments recovered through automated retry schedules and customer notifications.
- **Formula**: `Recovery Rate = (Recovered Invoices / Total Failed Cycles) * 100`
- **Source**: `DunningCase & PaymentAttempt`
- **Caveats**: Does not account for manual front-desk cash settlements unless linked to the dunning case.

### 5. Outstanding Invoices
- **Definition**: Unpaid balance across all active invoices currently in OPEN or PARTIALLY_PAID status.
- **Formula**: `Outstanding = Sum(Amount Due)`
- **Source**: `Invoice (OPEN, PARTIALLY_PAID, OVERDUE)`
- **Caveats**: Excludes VOID or DRAFT invoices.
