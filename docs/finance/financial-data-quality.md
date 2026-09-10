# Financial Data Quality & Integrity Engine

## Overview

The FitCore Financial Intelligence Foundation incorporates an automated data quality engine (`FinancialDataQualityService`) that continuously audits payment and invoice transactions for structural integrity, zero floating-point leakage, and business rule anomalies.

---

## Rating Thresholds

The data quality engine calculates an integer rating score from `0` to `100`:
- **Score = 100**: Rating = `EXCELLENT`
- **Score $\ge$ 90**: Rating = `GOOD`
- **Score $\ge$ 75**: Rating = `ACCEPTABLE`
- **Score < 75**: Rating = `DEGRADED`

Score deduction formula:
$$\text{Score} = \max\left(0, 100 - (N_{\text{anomalies}} \times 10) - (N_{\text{unattributed}} \times 2)\right)$$

---

## Anomaly Detection Rules

The engine runs 4 core automated checks across every financial dataset:

1. **Negative Minor Amounts**:
   - `PaymentTransaction.amountMinor <= 0`
   - Detects erroneous or corrupted negative payment amounts.

2. **Negative Invoice Amounts**:
   - `Invoice.subtotalMinor < 0` or `Invoice.totalMinor < 0`
   - Flags non-standard or malformed invoice figures.

3. **Refund Exceeding Payment Transaction**:
   - $\sum \text{Refunds} > \text{PaymentTransaction}.\text{amountMinor}$
   - Over-refund protection: flags transactions where total refunded amount surpasses the original gross transaction value.

4. **Negative Outstanding Due**:
   - `Invoice.amountDueMinor < 0`
   - Invoices cannot have negative remaining debt.

---

## Actionable Recommendations

When issues are detected, the data quality report returns localized remediation steps:
- `"Check billing webhooks for duplicate refund callbacks"`
- `"Assign origin outlet to active memberships lacking originOutletId"`
- `"Run FinancialReconciliationService.reconcileScope() to backfill transaction projections"`
